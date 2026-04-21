import { getUserPlan, type UserPlanInput } from "@/lib/user-plan";

/**
 * Marca de agua en el pipeline de subida (capítulos y portadas).
 *
 * Futuro: integrar sharp (u otra librería) idealmente en un worker/cola para no bloquear
 * el event loop de Node con imágenes grandes. Los usuarios con plan PREMIUM no deben
 * recibir marca de agua (ya se omite abajo vía `getUserPlan`).
 *
 * Hoy: no-op que devuelve el mismo buffer.
 */
export async function watermarkImage(buffer: Buffer, user: UserPlanInput): Promise<Buffer> {
  if (getUserPlan(user) === "PREMIUM") {
    return buffer;
  }
  void user;
  return buffer;
}
