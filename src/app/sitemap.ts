import { prisma } from "@/lib/db";
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://mangazen.com";

const STATIC_ROUTES = [
  "",
  "/library",
  "/news",
  "/community",
];

const LOCALES = ["es-ar", "es-es", "en-us", "en-gb", "pt-br", "ja-jp", "ko-kr", "zh-cn"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    STATIC_ROUTES.map((route) => ({
      url: `${BASE_URL}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? "daily" : "weekly",
      priority: route === "" ? 1 : 0.8,
    }))
  );

  const mangas = await prisma.manga.findMany({
    where: { reviewStatus: "APPROVED" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });

  const mangaEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    mangas.map((manga) => ({
      url: `${BASE_URL}/${locale}/manga/${manga.slug}`,
      lastModified: manga.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))
  );

  const users = await prisma.user.findMany({
    where: {
      isProfilePublic: true,
      username: { not: null },
    },
    select: { username: true, updatedAt: true },
    take: 500,
  });

  const profileEntries: MetadataRoute.Sitemap = users
    .filter((u): u is typeof u & { username: string } => u.username !== null)
    .flatMap((user) =>
      LOCALES.map((locale) => ({
        url: `${BASE_URL}/${locale}/user/${user.username}`,
        lastModified: user.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      }))
    );

  return [...staticEntries, ...mangaEntries, ...profileEntries];
}
