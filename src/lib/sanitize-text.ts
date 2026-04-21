import sanitizeHtml from "sanitize-html";

const STRIP_ALL: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  allowedSchemes: [],
  allowVulnerableTags: false,
};

/**
 * Cuerpo de comentario: sin HTML; elimina etiquetas y normaliza entidades vía sanitize-html.
 */
export function sanitizeCommentBody(raw: string): string {
  return sanitizeHtml(raw.trim(), STRIP_ALL).trim();
}

/**
 * Campos de texto plano del Panel Scan (título, descripción, etc.).
 */
export function sanitizeScanPlainText(raw: string, maxLength: number): string {
  const stripped = sanitizeHtml(raw.trim(), STRIP_ALL).trim();
  return stripped.slice(0, maxLength);
}
