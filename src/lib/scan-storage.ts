import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "@/lib/cloudinary";

export function chapterUploadDir(chapterId: string): string {
  return `/tmp/chapters/${chapterId}`;
}

export function mangaCoverPath(mangaId: string, ext: string): string {
  const safe = ext.replace(/^\./, "").toLowerCase();
  return `/tmp/manga-covers/${mangaId}.${safe}`;
}

export function publicChapterPageUrl(chapterId: string, filename: string): string {
  return `/uploads/chapters/${chapterId}/${filename}`;
}

export function publicMangaCoverUrl(mangaId: string, ext: string): string {
  const safe = ext.replace(/^\./, "").toLowerCase();
  return `/uploads/manga-covers/${mangaId}.${safe}`;
}

export async function writeChapterPages(
  chapterId: string,
  files: { buffer: Buffer; filename: string }[]
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const { buffer, filename } = files[i]!;
    const key = `chapters/${chapterId}/${filename}`;
    const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
    const contentType =
      ext === "png" ? "image/png" :
      ext === "webp" ? "image/webp" :
      "image/jpeg";
    const url = await uploadToR2(buffer, key, contentType);
    urls.push(url);
  }
  return urls;
}

export async function removeChapterUploadDir(chapterId: string): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    const pages = await prisma.page.findMany({
      where: { chapterId },
      select: { imageUrl: true },
    });

    const r2PublicUrl = process.env.R2_PUBLIC_URL ?? "";
    for (const page of pages) {
      if (r2PublicUrl && page.imageUrl.startsWith(r2PublicUrl)) {
        const key = page.imageUrl.slice(r2PublicUrl.length + 1);
        await deleteFromR2(key).catch(() => {});
      }
    }
  } catch {
    // silencioso — no bloquear el borrado aunque falle R2
  }
}

export async function writeMangaCover(
  mangaId: string,
  buffer: Buffer,
  ext: string
): Promise<string> {
  // Las portadas siguen en Cloudinary por ahora
  const url = await uploadImageToCloudinary(
    buffer,
    "mangazen/covers",
    `cover_${mangaId}`
  );
  return url;
}

export async function removeMangaCoverFile(
  mangaId: string,
  _ext: string
): Promise<void> {
  await deleteImageFromCloudinary(`mangazen/covers/cover_${mangaId}`);
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

export function isImageFilename(name: string): boolean {
  return IMAGE_EXT.test(name);
}