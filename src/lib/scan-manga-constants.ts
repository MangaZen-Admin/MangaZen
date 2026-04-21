export const SCAN_MANGA_STATUS = ["ONGOING", "COMPLETED", "HIATUS", "CANCELLED"] as const;
export type ScanMangaStatus = (typeof SCAN_MANGA_STATUS)[number];

export const SCAN_MANGA_TYPES = [
  "MANGA",
  "MANHWA",
  "MANHUA",
  "NOVEL",
  "ONE_SHOT",
  "DOUJINSHI",
  "OEL",
] as const;
export type ScanMangaType = (typeof SCAN_MANGA_TYPES)[number];

export const SCAN_DEMOGRAPHICS = ["SEINEN", "SHOUNEN", "SHOUJO", "JOSEI", "KODOMO"] as const;

export const SCAN_CONTENT_RATINGS = ["EVERYONE", "TEEN", "MATURE_SUGGESTIVE"] as const;
