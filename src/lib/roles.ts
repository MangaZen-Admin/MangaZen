import type { UserRole } from "@prisma/client";

/** Quién ve el enlace "Panel Scan" en el menú (SCAN, equipos de moderación y creadores). */
export function canAccessScanPanel(role: UserRole): boolean {
  return role === "SCAN" || role === "ADMIN" || role === "CREATOR";
}

/** APIs del Panel Scan y acceso a la página: mismo criterio que el menú. */
export function canUseScanPanel(role: UserRole): boolean {
  return canAccessScanPanel(role);
}
