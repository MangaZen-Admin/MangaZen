import type { MangaReviewStatus, UserRole } from "@prisma/client";

/**
 * Catálogo público: solo obras aprobadas. El autor y los admins ven borradores / pendientes.
 */
export function canViewMangaInCatalog(opts: {
  reviewStatus: MangaReviewStatus;
  mangaUploaderId: string;
  viewerUserId: string | null;
  viewerRole: UserRole | null;
}): boolean {
  if (opts.reviewStatus === "APPROVED") return true;
  if (!opts.viewerUserId) return false;
  if (opts.viewerUserId === opts.mangaUploaderId) return true;
  if (opts.viewerRole === "ADMIN") return true;
  return false;
}
