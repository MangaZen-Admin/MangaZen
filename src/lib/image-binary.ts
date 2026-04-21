/**
 * Validación binaria de imágenes permitidas en subidas (JPEG, PNG, WEBP).
 * GIF y otros formatos se rechazan aunque el Content-Type sea correcto.
 */

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type AllowedImageKind = "jpeg" | "png" | "webp";

export function normalizeImageContentType(header: string | null | undefined): string | null {
  if (!header) return null;
  return header.split(";")[0].trim().toLowerCase();
}

export function isAllowedImageContentType(contentType: string | null | undefined): boolean {
  const m = normalizeImageContentType(contentType);
  return m != null && ALLOWED_CONTENT_TYPES.has(m);
}

export function detectImageKind(buffer: Buffer): AllowedImageKind | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

export function fileExtensionForImageKind(kind: AllowedImageKind): string {
  return kind === "jpeg" ? "jpg" : kind;
}

export type ValidatedImage = { buffer: Buffer; kind: AllowedImageKind };

/**
 * Comprueba Content-Type declarado + magic bytes coherentes (mismo familia de formato).
 */
export function validateImageUpload(
  buffer: Buffer,
  declaredContentType: string | null | undefined
): { ok: true; kind: AllowedImageKind } | { ok: false; reason: "TYPE" | "MAGIC" | "MISMATCH" } {
  if (!isAllowedImageContentType(declaredContentType)) {
    return { ok: false, reason: "TYPE" };
  }
  const kind = detectImageKind(buffer);
  if (!kind) {
    return { ok: false, reason: "MAGIC" };
  }
  const normalized = normalizeImageContentType(declaredContentType);
  const expectedMime =
    kind === "jpeg" ? "image/jpeg" : kind === "png" ? "image/png" : "image/webp";
  if (normalized !== expectedMime) {
    return { ok: false, reason: "MISMATCH" };
  }
  return { ok: true, kind };
}
