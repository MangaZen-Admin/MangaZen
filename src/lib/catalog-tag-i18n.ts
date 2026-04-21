import { CATALOG_TAG_SLUG_BY_DB_NAME } from "./catalog-tag-keys";

/** Translate a catalog genre/theme tag stored in DB (Spanish names in seed). */
export function translateCatalogTagName(
  dbName: string,
  tCatalog: (key: string) => string
): string {
  const slug = CATALOG_TAG_SLUG_BY_DB_NAME[dbName];
  if (!slug) return dbName;
  return tCatalog(`tags.${slug}`);
}
