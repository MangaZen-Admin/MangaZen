import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/db";
import type { AppLocale } from "@/lib/chapter-comments";
import { chapterLanguageFromLocale } from "@/lib/locale-language";
import {
  detectImageKind,
  fileExtensionForImageKind,
  isAllowedImageContentType,
  validateImageUpload,
} from "@/lib/image-binary";
import { requireScanAccess } from "@/lib/scan-access";
import { isImageFilename, removeChapterUploadDir, writeChapterPages } from "@/lib/scan-storage";
import { sanitizeScanPlainText } from "@/lib/sanitize-text";
import {
  DEFAULT_EARLY_ACCESS_PRICE,
  EARLY_ACCESS_DAYS_MAX,
  EARLY_ACCESS_DAYS_MIN,
  EARLY_ACCESS_PRICE_MAX,
  EARLY_ACCESS_PRICE_MIN,
} from "@/lib/constants/early-access";
import {
  getUserPlan,
  maxChapterPages,
  maxScanImageBytes,
  maxZipCompressedBytes,
  maxZipUncompressedBytes,
} from "@/lib/user-plan";
import { scanChapterFormSchema } from "@/lib/validation/scan-forms";
import { watermarkImage } from "@/lib/watermark";
import { isZipLocalFileHeader } from "@/lib/zip-binary";
import { awardBadgeIfEarned } from "@/lib/badges/award-badge";
import { SHARDS_TO_COINS_RATE } from "@/lib/zen-currency";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const gate = await requireScanAccess(request.headers);
  if (!gate.ok) return gate.response;

  const userRole = gate.user.role;
  const canUseCoins = userRole === "CREATOR" || userRole === "ADMIN";

  const plan = getUserPlan(gate.user);
  const maxPages = maxChapterPages(plan);
  const maxImage = maxScanImageBytes(plan);
  const maxZipRaw = maxZipUncompressedBytes(plan);
  const maxZipIn = maxZipCompressedBytes(plan);
  const planUser = { id: gate.user.id, isPro: gate.user.isPro };

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const mangaId = String(form.get("mangaId") ?? "").trim();
  const numberRaw = String(form.get("number") ?? "").trim();
  const titleRaw = String(form.get("title") ?? "").trim();
  const locale = String(form.get("locale") ?? "").trim();
  const languageRaw = String(form.get("language") ?? "").trim();
  const source = String(form.get("source") ?? "files").trim();

  const parsedForm = scanChapterFormSchema.safeParse({
    mangaId,
    number: numberRaw,
    title: titleRaw,
    locale,
    language: languageRaw,
    source,
  });
  if (!parsedForm.success) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const { mangaId: mid, number, title: titleField, locale: loc, language: langField, source: src } =
    parsedForm.data;

  const startsWithSinglePageRaw = String(form.get("startsWithSinglePage") ?? "1").toLowerCase();
  const startsWithSinglePage =
    !(startsWithSinglePageRaw === "0" || startsWithSinglePageRaw === "false" || startsWithSinglePageRaw === "off");

  const earlyAccessRaw = String(form.get("earlyAccess") ?? "").toLowerCase();
  const wantEarlyAccess =
    earlyAccessRaw === "1" || earlyAccessRaw === "true" || earlyAccessRaw === "on";
  const earlyAccessDaysRaw = Number(String(form.get("earlyAccessDays") ?? "").trim());
  const earlyAccessPriceRaw = String(form.get("earlyAccessPrice") ?? "").trim();

  let isEarlyAccess = false;
  let earlyAccessUntil: Date | null = null;
  let earlyAccessPrice: number | null = null;

  if (wantEarlyAccess) {
    const days = Math.round(earlyAccessDaysRaw);
    if (!Number.isFinite(days) || days < EARLY_ACCESS_DAYS_MIN || days > EARLY_ACCESS_DAYS_MAX) {
      return NextResponse.json({ error: "EARLY_ACCESS_DAYS" }, { status: 400 });
    }

    const earlyAccessCurrencyRaw = String(form.get("earlyAccessCurrency") ?? "shards").trim().toLowerCase();
    if (earlyAccessCurrencyRaw === "coins" && !canUseCoins) {
      return NextResponse.json({ error: "EARLY_ACCESS_CURRENCY_FORBIDDEN" }, { status: 403 });
    }
    const earlyAccessCurrency =
      earlyAccessCurrencyRaw === "coins" && canUseCoins ? "coins" : "shards";

    const priceParsed =
      earlyAccessPriceRaw === "" ? DEFAULT_EARLY_ACCESS_PRICE : Number(earlyAccessPriceRaw);
    if (!Number.isFinite(priceParsed)) {
      return NextResponse.json({ error: "EARLY_ACCESS_PRICE" }, { status: 400 });
    }
    const priceEntered = Math.round(priceParsed);
    if (priceEntered < EARLY_ACCESS_PRICE_MIN || priceEntered > EARLY_ACCESS_PRICE_MAX) {
      return NextResponse.json({ error: "EARLY_ACCESS_PRICE" }, { status: 400 });
    }

    let priceStored: number;
    if (earlyAccessCurrency === "coins") {
      priceStored = priceEntered;
    } else {
      const coinEquiv = Math.max(1, Math.round(priceEntered / SHARDS_TO_COINS_RATE));
      priceStored = Math.min(EARLY_ACCESS_PRICE_MAX, Math.max(EARLY_ACCESS_PRICE_MIN, coinEquiv));
    }

    isEarlyAccess = true;
    earlyAccessUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    earlyAccessPrice = priceStored;
  }

  const titleSan = titleField && titleField.length > 0 ? sanitizeScanPlainText(titleField, 500) : "";
  const title = titleSan.length > 0 ? titleSan : null;

  const language =
    langField && langField.length >= 2
      ? langField.slice(0, 8).toUpperCase()
      : chapterLanguageFromLocale(loc as AppLocale);

  const manga = await prisma.manga.findUnique({ where: { id: mid }, select: { id: true } });
  if (!manga) {
    return NextResponse.json({ error: "MANGA_NOT_FOUND" }, { status: 404 });
  }

  const duplicate = await prisma.chapter.findFirst({
    where: { mangaId: mid, number },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ error: "CHAPTER_EXISTS" }, { status: 409 });
  }

  const buffers: { buffer: Buffer; filename: string }[] = [];
  let pageSinglesInDouble: boolean[] = [];

  if (src === "zip") {
    const zipFile = form.get("zip");
    if (!(zipFile instanceof Blob)) {
      return NextResponse.json({ error: "ZIP_REQUIRED" }, { status: 400 });
    }
    if (zipFile.size > maxZipIn) {
      return NextResponse.json({ error: "ZIP_TOO_LARGE" }, { status: 400 });
    }
    const ab = await zipFile.arrayBuffer();
    const zipBuf = Buffer.from(ab);
    if (!isZipLocalFileHeader(zipBuf)) {
      return NextResponse.json({ error: "ZIP_INVALID" }, { status: 400 });
    }

    const zip = await JSZip.loadAsync(ab);
    const names = Object.keys(zip.files)
      .filter((n) => !zip.files[n].dir && isImageFilename(n))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    if (names.length === 0 || names.length > maxPages) {
      return NextResponse.json({ error: "ZIP_IMAGES" }, { status: 400 });
    }
    pageSinglesInDouble = names.map(() => false);

    let uncompressedTotal = 0;
    for (let i = 0; i < names.length; i += 1) {
      const name = names[i];
      const data = await zip.files[name].async("nodebuffer");
      uncompressedTotal += data.length;
      if (uncompressedTotal > maxZipRaw) {
        return NextResponse.json({ error: "ZIP_DECOMPRESSED_LIMIT" }, { status: 400 });
      }

      const kind = detectImageKind(data);
      if (!kind) {
        return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
      }
      const ext = `.${fileExtensionForImageKind(kind)}`;
      const filename = `${String(i + 1).padStart(3, "0")}${ext}`;
      const wm = await watermarkImage(data, planUser);
      buffers.push({ buffer: wm, filename });
    }
  } else {
    const files = form.getAll("pages") as unknown[];
    const list: File[] = files.filter(
      (f): f is File => typeof f !== "string" && f != null && typeof (f as File).arrayBuffer === "function"
    );

    if (list.length === 0 || list.length > maxPages) {
      return NextResponse.json({ error: "FILES_REQUIRED" }, { status: 400 });
    }
    pageSinglesInDouble = list.map((_, i) => {
      const isSingle = form.get(`pages[${i}][isSingleInDoublePage]`);
      return isSingle === "1";
    });

    for (let i = 0; i < list.length; i += 1) {
      const file = list[i];
      if (file.size > maxImage) {
        return NextResponse.json({ error: "IMAGE_TOO_LARGE" }, { status: 400 });
      }
      if (!isAllowedImageContentType(file.type)) {
        return NextResponse.json({ error: "INVALID_FILE_TYPE" }, { status: 400 });
      }
      const ab = await file.arrayBuffer();
      const buf = Buffer.from(ab);
      const v = validateImageUpload(buf, file.type);
      if (!v.ok) {
        return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
      }
      const kind = v.kind;
      const ext = `.${fileExtensionForImageKind(kind)}`;
      const filename = `${String(i + 1).padStart(3, "0")}${ext}`;
      const wm = await watermarkImage(buf, planUser);
      buffers.push({ buffer: wm, filename });
    }
  }

  const chapterId = randomUUID();

  let imageUrls: string[];
  try {
    imageUrls = await writeChapterPages(chapterId, buffers);
  } catch {
    await removeChapterUploadDir(chapterId);
    return NextResponse.json({ error: "WRITE_FAILED" }, { status: 500 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.chapter.create({
        data: {
          id: chapterId,
          mangaId: mid,
          number,
          title,
          locale: loc,
          language,
          status: "PENDING",
          isEarlyAccess,
          earlyAccessUntil,
          earlyAccessPrice,
          startsWithSinglePage,
        },
      });

      await tx.page.createMany({
        data: imageUrls.map((imageUrl, i) => ({
          chapterId,
          pageNumber: i + 1,
          imageUrl,
          isSingleInDoublePage: pageSinglesInDouble[i] === true,
        })),
      });

      await tx.chapterUpload.create({
        data: {
          chapterId,
          uploaderId: gate.user.id,
          status: "PENDING",
        },
      });
    });
  } catch (e) {
    await removeChapterUploadDir(chapterId);
    console.error(e);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  const badgesEarned = await awardBadgeIfEarned(planUser.id, "SCAN_UPLOAD_SUBMITTED");

  return NextResponse.json({ ok: true, chapterId, badgesEarned });
}
