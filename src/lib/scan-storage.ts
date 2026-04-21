import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export function chapterUploadDir(chapterId: string): string {
  return path.join(UPLOAD_ROOT, "chapters", chapterId);
}

export function mangaCoverPath(mangaId: string, ext: string): string {
  const safe = ext.replace(/^\./, "").toLowerCase();
  return path.join(UPLOAD_ROOT, "manga-covers", `${mangaId}.${safe}`);
}

/** URL pública (desde /) para una página de capítulo. */
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
  const dir = chapterUploadDir(chapterId);
  await mkdir(dir, { recursive: true });
  const urls: string[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const { buffer, filename } = files[i];
    const dest = path.join(dir, filename);
    await writeFile(dest, buffer);
    urls.push(publicChapterPageUrl(chapterId, filename));
  }
  return urls;
}

export async function removeChapterUploadDir(chapterId: string): Promise<void> {
  const dir = chapterUploadDir(chapterId);
  await rm(dir, { recursive: true, force: true });
}

export async function writeMangaCover(mangaId: string, buffer: Buffer, ext: string): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, "manga-covers");
  await mkdir(dir, { recursive: true });
  const filePath = mangaCoverPath(mangaId, ext);
  await writeFile(filePath, buffer);
  return publicMangaCoverUrl(mangaId, ext);
}

export async function removeMangaCoverFile(mangaId: string, ext: string): Promise<void> {
  const filePath = mangaCoverPath(mangaId, ext);
  await rm(filePath, { force: true });
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

export function isImageFilename(name: string): boolean {
  return IMAGE_EXT.test(name);
}
