import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fileExtensionForImageKind,
  isAllowedImageContentType,
  validateImageUpload,
} from "@/lib/image-binary";
import { uniqueMangaSlugFromTitle } from "@/lib/manga-slug";
import { requireScanAccess } from "@/lib/scan-access";
import { removeMangaCoverFile, writeMangaCover } from "@/lib/scan-storage";
import { sanitizeScanPlainText } from "@/lib/sanitize-text";
import { getUserPlan, maxScanImageBytes } from "@/lib/user-plan";
import { scanMangaFormSchema } from "@/lib/validation/scan-forms";
import { watermarkImage } from "@/lib/watermark";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const gate = await requireScanAccess(request.headers);
  if (!gate.ok) return gate.response;

  const plan = getUserPlan(gate.user);
  const maxImage = maxScanImageBytes(plan);
  const planUser = { id: gate.user.id, isPro: gate.user.isPro };

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  let tagIdsParsed: unknown = [];
  try {
    tagIdsParsed = JSON.parse(String(form.get("tagIds") ?? "[]")) as unknown;
  } catch {
    return NextResponse.json({ error: "INVALID_TAGS" }, { status: 400 });
  }
  const tagIdsRaw = Array.isArray(tagIdsParsed)
    ? tagIdsParsed.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];

  const demographicField = String(form.get("demographic") ?? "").trim();
  const releaseYear = Number(form.get("releaseYear"));
  const publisher = String(form.get("publisher") ?? "");
  const country = String(form.get("country") ?? "");

  const parsed = scanMangaFormSchema.safeParse({
    title: String(form.get("title") ?? ""),
    alternativeTitle: String(form.get("alternativeTitle") ?? ""),
    description: String(form.get("description") ?? ""),
    author: String(form.get("author") ?? ""),
    artist: String(form.get("artist") ?? ""),
    status: String(form.get("status") ?? "ONGOING").trim(),
    type: String(form.get("type") ?? "MANGA").trim(),
    demographic: demographicField,
    contentRating: String(form.get("contentRating") ?? "EVERYONE").trim(),
    tagIds: tagIdsRaw,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const d = parsed.data;
  const title = sanitizeScanPlainText(d.title, 500);
  if (title.length < 2) {
    return NextResponse.json({ error: "TITLE_REQUIRED" }, { status: 400 });
  }

  const alternativeTitle = d.alternativeTitle
    ? sanitizeScanPlainText(d.alternativeTitle, 500) || null
    : null;
  const description = d.description ? sanitizeScanPlainText(d.description, 20000) : "";
  const author = d.author ? sanitizeScanPlainText(d.author, 300) : "";
  const artist = d.artist ? sanitizeScanPlainText(d.artist, 300) || null : null;
  const demographic = d.demographic && d.demographic.length > 0 ? d.demographic : null;

  const cover = form.get("cover");
  if (!(cover instanceof Blob) || cover.size === 0) {
    return NextResponse.json({ error: "COVER_REQUIRED" }, { status: 400 });
  }
  const coverFile = cover as File;
  if (coverFile.size > maxImage) {
    return NextResponse.json({ error: "IMAGE_TOO_LARGE" }, { status: 400 });
  }
  if (!isAllowedImageContentType(coverFile.type)) {
    return NextResponse.json({ error: "INVALID_COVER" }, { status: 400 });
  }

  const tagIds = d.tagIds;
  if (tagIds.length > 0) {
    const count = await prisma.tag.count({ where: { id: { in: tagIds } } });
    if (count !== tagIds.length) {
      return NextResponse.json({ error: "INVALID_TAG_IDS" }, { status: 400 });
    }
  }

  const buf = Buffer.from(await coverFile.arrayBuffer());
  const v = validateImageUpload(buf, coverFile.type);
  if (!v.ok) {
    return NextResponse.json({ error: "INVALID_COVER" }, { status: 400 });
  }
  const ext = fileExtensionForImageKind(v.kind);
  const coverBuf = await watermarkImage(buf, planUser);

  const slug = await uniqueMangaSlugFromTitle(title);
  const mangaId = randomUUID();

  let coverUrl: string;
  try {
    coverUrl = await writeMangaCover(mangaId, coverBuf, ext);
  } catch (err) {
    console.error("[scan/manga] cover upload error:", err);
    return NextResponse.json({ error: "COVER_UPLOAD_FAILED" }, { status: 500 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const manga = await tx.manga.create({
        data: {
          id: mangaId,
          slug,
          title,
          alternativeTitle,
          author,
          releaseYear,
          publisher,
          country,
          artist,
          description,
          coverImage: coverUrl,
          status: d.status,
          type: d.type,
          demographic,
          contentRating: d.contentRating,
          uploaderId: gate.user.id,
          reviewStatus: "PENDING_REVIEW",
        },
      });

      // Guardar títulos alternativos
      const altTitlesEntries: { locale: string; title: string }[] = [];
      let i = 0;
      while (form.get(`altTitles[${i}][locale]`)) {
        const locale = String(form.get(`altTitles[${i}][locale]`) ?? "");
        const title = String(form.get(`altTitles[${i}][title]`) ?? "").trim();
        if (locale && title) {
          altTitlesEntries.push({ locale, title });
        }
        i++;
      }

      if (altTitlesEntries.length > 0) {
        await tx.mangaAlternativeTitle.createMany({
          data: altTitlesEntries.map((at) => ({
            mangaId: manga.id,
            locale: at.locale,
            title: at.title,
          })),
          skipDuplicates: true,
        });
      }

      if (tagIds.length > 0) {
        await tx.mangaTag.createMany({
          data: tagIds.map((tagId) => ({ mangaId, tagId })),
        });
      }
    });
  } catch (e) {
    await removeMangaCoverFile(mangaId, ext);
    console.error(e);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mangaId, slug });
}
