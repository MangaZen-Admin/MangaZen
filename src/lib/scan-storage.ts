import { uploadImageToCloudinary, deleteImageFromCloudinary } from "@/lib/cloudinary";

// Mantener estas funciones para compatibilidad con código existente
// que usa rutas locales en desarrollo

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
    const publicId = `chapters/${chapterId}/${filename.replace(/\.[^.]+$/, "")}`;
    const url = await uploadImageToCloudinary(buffer, "mangazen/chapters", publicId);
    urls.push(url);
  }
  return urls;
}

export async function removeChapterUploadDir(chapterId: string): Promise<void> {
  // Cloudinary no tiene borrado de carpeta directo en el SDK v2 gratuito
  // Las imágenes se borran individualmente cuando se eliminan páginas
  // Por ahora es un no-op seguro
}

export async function writeMangaCover(
  mangaId: string,
  buffer: Buffer,
  ext: string
): Promise<string> {
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
