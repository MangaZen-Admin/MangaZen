import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";

export const runtime = "nodejs";

function isAppLocale(s: string): boolean {
  return (routing.locales as ReadonlyArray<string>).includes(s);
}

function localeFromRequest(request: Request): string {
  const x = request.headers.get("x-locale");
  if (x && isAppLocale(x)) return x;
  const ref = request.headers.get("referer");
  if (ref) {
    try {
      const first = new URL(ref).pathname.split("/").filter(Boolean)[0];
      if (first && isAppLocale(first)) return first;
    } catch {
      // ignore
    }
  }
  return "es-ar";
}

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const now = new Date();
  const banner = await prisma.globalBanner.findFirst({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { translations: true },
    orderBy: { createdAt: "desc" },
  });

  if (!banner) {
    return NextResponse.json({ banner: null });
  }

  const translation =
    banner.translations.find((t) => t.locale === locale) ??
    banner.translations.find((t) => t.locale === "es-ar") ??
    banner.translations[0];

  return NextResponse.json({
    banner: {
      id: banner.id,
      message: translation?.message ?? "",
      type: banner.type,
      isDismissible: banner.isDismissible,
    },
  });
}
