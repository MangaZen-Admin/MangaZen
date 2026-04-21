/**
 * Maps Prisma Tag.name (seed / DB) to `catalog.tags.<slug>` message keys.
 */
export const CATALOG_TAG_SLUG_BY_DB_NAME: Record<string, string> = {
  Acción: "accion",
  Aventura: "aventura",
  Comedia: "comedia",
  Drama: "drama",
  Fantasía: "fantasia",
  Horror: "horror",
  Misterio: "misterio",
  Romance: "romance",
  "Sci-fi": "sciFi",
  "Slice of Life": "sliceOfLife",
  Sobrenatural: "sobrenatural",
  Deportes: "deportes",
  Psicológico: "psicologico",
  Histórico: "historico",
  Ecchi: "ecchi",
  "Viaje en el tiempo": "viajeTiempo",
  Isekai: "isekai",
  Magia: "magia",
  Escuela: "escuela",
  Supervivencia: "supervivencia",
};
