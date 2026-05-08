import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mangazen-ar.vercel.app";
const LOCALES = ["es-ar", "es-es", "en-us", "en-gb", "pt-br", "ja-jp", "ko-kr", "zh-cn", "ru-ru"];

function url(path: string, lastmod?: Date): string {
  const mod = lastmod ? `\n    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : "";
  return `  <url>\n    <loc>${APP_URL}${path}</loc>${mod}\n  </url>`;
}

export async function GET(): Promise<NextResponse> {
  const mangas = await prisma.manga.findMany({
    where: { reviewStatus: "APPROVED" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const staticPaths = LOCALES.flatMap((locale) => [
    `/${locale}`,
    `/${locale}/library`,
    `/${locale}/news`,
    `/${locale}/community`,
  ]);

  const mangaPaths = LOCALES.flatMap((locale) =>
    mangas.map((manga) => ({ path: `/${locale}/manga/${manga.slug}`, updatedAt: manga.updatedAt }))
  );

  const staticUrls = staticPaths.map((path) => url(path));
  const mangaUrls = mangaPaths.map(({ path, updatedAt }) => url(path, updatedAt));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...mangaUrls].join("\n")}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
