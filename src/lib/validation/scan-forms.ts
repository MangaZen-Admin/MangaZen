import { z } from "zod";
import { routing } from "@/i18n/routing";
import {
  SCAN_CONTENT_RATINGS,
  SCAN_DEMOGRAPHICS,
  SCAN_MANGA_STATUS,
  SCAN_MANGA_TYPES,
} from "@/lib/scan-manga-constants";

const localeEnum = z.enum(routing.locales as unknown as [string, ...string[]]);

export const scanChapterFormSchema = z.object({
  mangaId: z.string().trim().min(1),
  number: z.coerce.number().positive().finite(),
  title: z.union([z.string().trim().max(500), z.literal("")]).optional(),
  locale: localeEnum,
  language: z.union([z.string().trim().max(8), z.literal("")]).optional(),
  source: z.enum(["files", "zip"]),
});

export const scanMangaStatusZ = z.enum(SCAN_MANGA_STATUS);
export const scanMangaTypeZ = z.enum(SCAN_MANGA_TYPES);
export const scanContentRatingZ = z.enum(SCAN_CONTENT_RATINGS);
export const scanDemographicZ = z.enum(SCAN_DEMOGRAPHICS);

export const scanMangaFormSchema = z.object({
  title: z.string().trim().min(2).max(500),
  alternativeTitle: z.union([z.string().trim().max(500), z.literal("")]).optional(),
  description: z.union([z.string().trim().max(20000), z.literal("")]).optional(),
  author: z.union([z.string().trim().max(300), z.literal("")]).optional(),
  artist: z.union([z.string().trim().max(300), z.literal("")]).optional(),
  status: scanMangaStatusZ,
  type: scanMangaTypeZ,
  demographic: z.union([scanDemographicZ, z.literal("")]).optional(),
  contentRating: scanContentRatingZ,
  tagIds: z.array(z.string().min(1)).max(80),
});
