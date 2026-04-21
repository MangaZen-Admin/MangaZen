import { routing } from "@/i18n/routing";

/** Best-effort locale from Referer path segment (falls back to default). */
export function localeFromRequestReferer(request: Request): string {
  const ref = request.headers.get("referer");
  if (ref) {
    try {
      const u = new URL(ref);
      const seg = u.pathname.split("/").filter(Boolean)[0];
      if (seg && (routing.locales as readonly string[]).includes(seg)) {
        return seg;
      }
    } catch {
      /* ignore */
    }
  }
  return routing.defaultLocale;
}
