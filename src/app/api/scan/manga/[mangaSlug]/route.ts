import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fileExtensionForImageKind,
  isAllowedImageContentType,
  validateImageUpload,
} from "@/lib/image-binary";
import { requireScanAccess } from "@/lib/scan-access";
import { removeMangaCoverFile, writeMangaCover } from "@/lib/scan-storage";
import { sanitizeScanPlainText } from "@/lib/sanitize-text";
import { getUserPlan, maxScanImageBytes } from "@/lib/user-plan";
import { watermarkImage } from "@/lib/watermark";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function PATCH(request: Request, { params }: { params: Promise<{ mangaSlug: string }> }) {
  const gate = await requireScanAccess(request.headers);
  if (!gate.ok) return gate.response;

  const { mangaSlug } = await params;

  const manga = await prisma.manga.findUnique({
    where: { slug: mangaSlug },
    select: {
      id: true,
      uploaderId: true,
      title: true,
      description: true,
      author: true,
      artist: true,
      publisher: true,
      country: true,
      releaseYear: true,
      coverImage: true,
    },
  });
  if (!manga || (gate.user.role !== "ADMIN" && manga.uploaderId !== gate.user.id)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const requester = await prisma.user.findUnique({
    where: { id: gate.user.id },
    select: { isTrusted: true },
  });
  const needsReview = gate.user.role !== "ADMIN" && !requester?.isTrusted;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const title = form.get("title") as string | null;
  const description = form.get("description") as string | null;
  const author = form.get("author") as string | null;
  const artist = form.get("artist") as string | null;
  const publisher = form.get("publisher") as string | null;
  const country = form.get("country") as string | null;
  const releaseYearRaw = form.get("releaseYear");
  const releaseYear = releaseYearRaw ? Number(releaseYearRaw) : undefined;
  const coverFile = form.get("cover");

  const previousData = {
    title: manga.title ?? null,
    description: manga.description ?? null,
    author: manga.author ?? null,
    artist: manga.artist ?? null,
    publisher: manga.publisher ?? null,
    country: manga.country ?? null,
    releaseYear: manga.releaseYear ?? null,
    coverImage: manga.coverImage ?? null,
  };

  let coverImage: string | undefined;
  if (coverFile instanceof File && coverFile.size > 0) {
    const plan = getUserPlan(gate.user);
    const maxBytes = maxScanImageBytes(plan);
    if (coverFile.size > maxBytes) {
      return NextResponse.json({ error: "IMAGE_TOO_LARGE" }, { status: 400 });
    }
    if (!isAllowedImageContentType(coverFile.type)) {
      return NextResponse.json({ error: "INVALID_IMAGE_TYPE" }, { status: 400 });
    }
    const buffer = Buffer.from(await coverFile.arrayBuffer());
    const validation = validateImageUpload(buffer, coverFile.type);
    if (!validation.ok) {
      return NextResponse.json({ error: "INVALID_COVER" }, { status: 400 });
    }
    const ext = fileExtensionForImageKind(validation.kind);
    const watermarked = await watermarkImage(buffer, { id: gate.user.id, isPro: gate.user.isPro });
    if (manga.coverImage) {
      await removeMangaCoverFile(manga.id, ext).catch(() => {});
    }
    try {
      coverImage = await writeMangaCover(manga.id, watermarked, ext);
    } catch (err) {
      console.error("[scan/manga PATCH] cover upload error:", err);
      return NextResponse.json({ error: "COVER_UPLOAD_FAILED" }, { status: 500 });
    }
  }

  const updated = await prisma.manga.update({
    where: { id: manga.id },
    data: {
      ...(title ? { title: sanitizeScanPlainText(String(title), 200) } : {}),
      ...(description ? { description: sanitizeScanPlainText(String(description), 5000) } : {}),
      ...(author ? { author: sanitizeScanPlainText(String(author), 200) } : {}),
      ...(artist !== null
        ? { artist: sanitizeScanPlainText(String(artist ?? ""), 200) || null }
        : {}),
      ...(publisher ? { publisher: sanitizeScanPlainText(String(publisher), 200) } : {}),
      ...(country ? { country: String(country).slice(0, 10) } : {}),
      ...(releaseYear && Number.isFinite(releaseYear) ? { releaseYear } : {}),
      ...(coverImage ? { coverImage } : {}),
    },
    select: { id: true, title: true, slug: true, coverImage: true },
  });

  // Guardar títulos alternativos si se enviaron
  const altTitlesEntries: { locale: string; title: string }[] = [];
  let i = 0;
  while (form.get(`altTitles[${i}][locale]`)) {
    const locale = String(form.get(`altTitles[${i}][locale]`) ?? "");
    const title = String(form.get(`altTitles[${i}][title]`) ?? "").trim();
    if (locale && title) altTitlesEntries.push({ locale, title });
    i++;
  }

  if (altTitlesEntries.length > 0 || form.get("altTitles[0][locale]") !== null) {
    await prisma.mangaAlternativeTitle.deleteMany({
      where: { mangaId: manga.id },
    });
    if (altTitlesEntries.length > 0) {
      await prisma.mangaAlternativeTitle.createMany({
        data: altTitlesEntries.map((at) => ({
          mangaId: manga.id,
          locale: at.locale,
          title: at.title,
        })),
        skipDuplicates: true,
      });
    }
  }

  if (needsReview) {
    await prisma.changeRequest.create({
      data: {
        type: "MANGA_EDIT",
        status: "PENDING",
        entityId: manga.id,
        previousData,
        newData: {
          title: title ? sanitizeScanPlainText(String(title), 200) : manga.title,
          description: description
            ? sanitizeScanPlainText(String(description), 5000)
            : manga.description,
          author: author ? sanitizeScanPlainText(String(author), 200) : manga.author,
          artist:
            artist !== null
              ? sanitizeScanPlainText(String(artist ?? ""), 200) || null
              : manga.artist,
          publisher: publisher ? sanitizeScanPlainText(String(publisher), 200) : manga.publisher,
          country: country ? String(country).slice(0, 10) : manga.country,
          releaseYear:
            releaseYear && Number.isFinite(releaseYear) ? releaseYear : manga.releaseYear,
          coverImage: coverImage ?? manga.coverImage,
        },
        requesterId: gate.user.id,
      },
    });
  }

  return NextResponse.json({ ok: true, manga: updated, pendingReview: needsReview });
}
