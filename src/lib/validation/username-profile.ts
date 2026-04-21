import { z } from "zod";

/** Coincide con la validación del API: 3–20 caracteres, letras, números, guiones y guión bajo. */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;

export const patchProfileUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .refine((s) => USERNAME_PATTERN.test(s), { message: "USERNAME_INVALID" })
    .transform((s) => s.toLowerCase()),
});

export type PatchProfileUsernameInput = z.infer<typeof patchProfileUsernameSchema>;

function isValidHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export const patchProfileSchema = z
  .object({
    username: z
      .string()
      .trim()
      .optional()
      .transform((s) => (s == null ? undefined : s.toLowerCase()))
      .refine((s) => s == null || USERNAME_PATTERN.test(s), { message: "USERNAME_INVALID" }),
    externalDonationLink: z
      .string()
      .trim()
      .optional()
      .transform((s) => {
        const v = (s ?? "").trim();
        return v.length === 0 ? null : v;
      })
      .refine((s) => s == null || isValidHttpUrl(s), { message: "DONATION_URL_INVALID" }),
  })
  .refine((d) => d.username != null || d.externalDonationLink !== undefined, {
    message: "EMPTY_PATCH",
  });

export type PatchProfileInput = z.infer<typeof patchProfileSchema>;
