/**
 * prisma/seed-tags.ts
 * Agrega tags faltantes a la DB sin tocar otros datos.
 * Ejecutar con: npx tsx prisma/seed-tags.ts
 */

import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL = process.env.DATABASE_URL?.startsWith("postgresql")
  ? process.env.DATABASE_URL
  : "postgresql://neondb_owner:npg_96JwUklHCTVI@ep-odd-pine-ac1fi286.sa-east-1.aws.neon.tech/neondb?sslmode=require";

const prisma = new PrismaClient();

const ALL_TAGS = [
  // GÉNERO
  { name: "Acción", category: "GENRE" },
  { name: "Aventura", category: "GENRE" },
  { name: "Boys' Love", category: "GENRE" },
  { name: "Comedia", category: "GENRE" },
  { name: "Crimen", category: "GENRE" },
  { name: "Drama", category: "GENRE" },
  { name: "Fantasía", category: "GENRE" },
  { name: "Girls' Love", category: "GENRE" },
  { name: "Histórico", category: "GENRE" },
  { name: "Horror", category: "GENRE" },
  { name: "Isekai", category: "GENRE" },
  { name: "Magical Girls", category: "GENRE" },
  { name: "Mecha", category: "GENRE" },
  { name: "Medicina", category: "GENRE" },
  { name: "Misterio", category: "GENRE" },
  { name: "Filosófico", category: "GENRE" },
  { name: "Psicológico", category: "GENRE" },
  { name: "Romance", category: "GENRE" },
  { name: "Sci-fi", category: "GENRE" },
  { name: "Slice of Life", category: "GENRE" },
  { name: "Sobrenatural", category: "GENRE" },
  { name: "Deportes", category: "GENRE" },
  { name: "Superhéroe", category: "GENRE" },
  { name: "Thriller", category: "GENRE" },
  { name: "Tragedia", category: "GENRE" },
  { name: "Wuxia", category: "GENRE" },
  // FORMATO
  { name: "4-Koma", category: "FORMAT" },
  { name: "Adaptación", category: "FORMAT" },
  { name: "Antología", category: "FORMAT" },
  { name: "Premio", category: "FORMAT" },
  { name: "Fan Coloreado", category: "FORMAT" },
  { name: "Full Color", category: "FORMAT" },
  { name: "Long Strip", category: "FORMAT" },
  { name: "Coloreado Oficial", category: "FORMAT" },
  { name: "One-shot", category: "FORMAT" },
  { name: "Autopublicado", category: "FORMAT" },
  { name: "Webcomic", category: "FORMAT" },
  // TEMÁTICA
  { name: "Aliens", category: "THEME" },
  { name: "Animales", category: "THEME" },
  { name: "Cocina", category: "THEME" },
  { name: "Crossdressing", category: "THEME" },
  { name: "Delincuentes", category: "THEME" },
  { name: "Demonios", category: "THEME" },
  { name: "Genderswap", category: "THEME" },
  { name: "Fantasmas", category: "THEME" },
  { name: "Gyaru", category: "THEME" },
  { name: "Harem", category: "THEME" },
  { name: "Loli", category: "THEME" },
  { name: "Mafia", category: "THEME" },
  { name: "Magia", category: "THEME" },
  { name: "Mahjong", category: "THEME" },
  { name: "Artes Marciales", category: "THEME" },
  { name: "Militar", category: "THEME" },
  { name: "Chicas Monstruo", category: "THEME" },
  { name: "Monstruos", category: "THEME" },
  { name: "Música", category: "THEME" },
  { name: "Ninja", category: "THEME" },
  { name: "Oficinistas", category: "THEME" },
  { name: "Policía", category: "THEME" },
  { name: "Post-Apocalíptico", category: "THEME" },
  { name: "Reencarnación", category: "THEME" },
  { name: "Harem Inverso", category: "THEME" },
  { name: "Samurai", category: "THEME" },
  { name: "Escuela", category: "THEME" },
  { name: "Shota", category: "THEME" },
  { name: "Supervivencia", category: "THEME" },
  { name: "Viaje en el tiempo", category: "THEME" },
  { name: "Vampiros", category: "THEME" },
  { name: "Videojuegos", category: "THEME" },
  { name: "Villana", category: "THEME" },
  { name: "Realidad Virtual", category: "THEME" },
  { name: "Zombis", category: "THEME" },
  // CONTENIDO
  { name: "Gore", category: "CONTENT" },
];

async function main() {
  console.log("🌱 Sincronizando tags...");
  let created = 0;
  let updated = 0;

  for (const tag of ALL_TAGS) {
    const result = await prisma.tag.upsert({
      where: { name: tag.name },
      create: { name: tag.name, category: tag.category },
      update: { category: tag.category },
    });
    if (result.id) {
      const existing = await prisma.tag.findUnique({ where: { name: tag.name } });
      if (existing?.category !== tag.category) updated++;
      else created++;
    }
  }

  console.log(`✅ Tags sincronizados: ${ALL_TAGS.length} procesados`);
  console.log("─────────────────────────────────────");
  console.log("🎉 Listo");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
