/**
 * prisma/seed-clean.ts
 *
 * Seed mínimo para arranque limpio en producción.
 * Solo crea: usuario admin + insignias del catálogo + tags.
 * Ejecutar con: npx tsx prisma/seed-clean.ts
 */

import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import { SEED_BADGES } from "../src/lib/badges/catalog";

process.env.DATABASE_URL = process.env.DATABASE_URL?.startsWith("postgresql")
  ? process.env.DATABASE_URL
  : "postgresql://neondb_owner:npg_96JwUklHCTVI@ep-odd-pine-ac1fi286.sa-east-1.aws.neon.tech/neondb?sslmode=require";

const prisma = new PrismaClient();
const KEY_LENGTH = 64;
const ADMIN_PASSWORD = "Manga41620843.";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
}

async function main() {
  console.log("🌱 Iniciando seed limpio...");

  // Limpiar todas las tablas en orden correcto
  await prisma.emailVerification.deleteMany();
  await prisma.rateLimit.deleteMany();
  await prisma.zenTransaction.deleteMany();
  await prisma.chapterUnlock.deleteMany();
  await prisma.mangaProgress.deleteMany();
  await prisma.userFavorite.deleteMany();
  await prisma.feedbackVote.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.mangaRequest.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.mangaReport.deleteMany();
  await prisma.chapterUpload.deleteMany();
  await prisma.page.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.mangaTag.deleteMany();
  await prisma.manga.deleteMany();
  await prisma.donationLink.deleteMany();
  await prisma.userInventory.deleteMany();
  await prisma.creatorRoleRequest.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.globalBanner.deleteMany();
  await prisma.adScript.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.tag.deleteMany();

  console.log("✅ Tablas limpiadas");

  // Admin
  await prisma.user.create({
    data: {
      name: "Admin MangaZen",
      email: "admin@mangazen.com",
      role: "ADMIN",
      passwordHash: hashPassword(ADMIN_PASSWORD),
      image: "https://api.dicebear.com/8.x/initials/svg?seed=Admin",
      isTrusted: true,
    },
  });

  console.log("✅ Usuario admin creado");

  // Insignias
  for (const b of SEED_BADGES) {
    await prisma.badge.upsert({
      where: { name: b.name },
      create: {
        name: b.name,
        description: b.description,
        iconUrl: null,
        iconKey: b.iconKey,
        isHighlighted: b.isHighlighted,
      },
      update: {
        description: b.description,
        iconKey: b.iconKey,
        isHighlighted: b.isHighlighted,
      },
    });
  }

  console.log("✅ Insignias creadas");

  // Tags
  const tagData = [
    { name: "Acción", category: "GENRE" },
    { name: "Aventura", category: "GENRE" },
    { name: "Comedia", category: "GENRE" },
    { name: "Drama", category: "GENRE" },
    { name: "Fantasía", category: "GENRE" },
    { name: "Horror", category: "GENRE" },
    { name: "Misterio", category: "GENRE" },
    { name: "Romance", category: "GENRE" },
    { name: "Sci-fi", category: "GENRE" },
    { name: "Slice of Life", category: "GENRE" },
    { name: "Sobrenatural", category: "GENRE" },
    { name: "Deportes", category: "GENRE" },
    { name: "Psicológico", category: "GENRE" },
    { name: "Histórico", category: "GENRE" },
    { name: "Ecchi", category: "GENRE" },
    { name: "Viaje en el tiempo", category: "THEME" },
    { name: "Isekai", category: "THEME" },
    { name: "Magia", category: "THEME" },
    { name: "Escuela", category: "THEME" },
    { name: "Supervivencia", category: "THEME" },
  ];

  await prisma.tag.createMany({ data: tagData });

  console.log("✅ Tags creados");
  console.log("");
  console.log("─────────────────────────────────────");
  console.log("🎉 Seed limpio completado");
  console.log("");
  console.log("  admin@mangazen.com → rol ADMIN");
  console.log(`  contraseña         → ${ADMIN_PASSWORD}`);
  console.log("─────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
