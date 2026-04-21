/**
 * prisma/seed.ts
 *
 * Datos de ejemplo realistas para desarrollo.
 * Ejecutar con: npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import { SEED_BADGES } from "../src/lib/badges/catalog";

// Prisma 7 lee la URL desde process.env.DATABASE_URL
// La seteamos manualmente antes de instanciar el cliente
process.env.DATABASE_URL = "file:./dev.db";

const prisma = new PrismaClient();
const KEY_LENGTH = 64;
const ADMIN_PASSWORD = "Manga41620843.";
const TEST_PASSWORD = "Manga123";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slug(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

// Genera URLs de placeholder para páginas de capítulos.
// En producción serían URLs reales de Cloudflare R2 / UploadThing.
function fakePage(chapterNum: number, pageNum: number) {
  return {
    imageUrl: `https://placehold.co/800x1200/1a1a2e/ffffff?text=Cap+${chapterNum}+p.${pageNum}`,
    thumbUrl: `https://placehold.co/160x240/1a1a2e/ffffff?text=${pageNum}`,
    width: 800,
    height: 1200,
  };
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
}

// ─── Seed principal ────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Iniciando seed...");

  // Limpiar en orden correcto (respetar foreign keys)
  await prisma.adSlot.deleteMany();
  await prisma.userFavorite.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.chapterUpload.deleteMany();
  await prisma.page.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.mangaTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.manga.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.badge.deleteMany();

  // ── 1. Usuarios ──────────────────────────────────────────────────────────────

  const admin = await prisma.user.create({
    data: {
      name: "Admin MangaZen",
      email: "admin@mangazen.com",
      role: "ADMIN",
      passwordHash: hashPassword(ADMIN_PASSWORD),
      image: "https://api.dicebear.com/8.x/initials/svg?seed=Admin",
    },
  });

  const scanlator = await prisma.user.create({
    data: {
      name: "GrupoScan ES",
      email: "scan@gruposcan.com",
      role: "SCAN",
      passwordHash: hashPassword(TEST_PASSWORD),
      image: "https://api.dicebear.com/8.x/initials/svg?seed=GrupoScan",
    },
  });

  const user1 = await prisma.user.create({
    data: {
      name: "María García",
      email: "maria@example.com",
      role: "USER",
      passwordHash: hashPassword(TEST_PASSWORD),
      image: "https://api.dicebear.com/8.x/initials/svg?seed=Maria",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: "Carlos López",
      email: "carlos@example.com",
      role: "USER",
      passwordHash: hashPassword(TEST_PASSWORD),
      image: "https://api.dicebear.com/8.x/initials/svg?seed=Carlos",
    },
  });

  console.log("✅ Usuarios creados");

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
  console.log("✅ Insignias del catálogo (upsert)");

  // ── 2. Tags ───────────────────────────────────────────────────────────────────

  const tagData = [
    // Géneros
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
    // Temáticas
    { name: "Viaje en el tiempo", category: "THEME" },
    { name: "Isekai", category: "THEME" },
    { name: "Magia", category: "THEME" },
    { name: "Escuela", category: "THEME" },
    { name: "Supervivencia", category: "THEME" },
  ];

  const tags = await Promise.all(
    tagData.map((t) => prisma.tag.create({ data: t }))
  );

  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t]));

  console.log("✅ Tags creados");

  // ── 3. Mangas ─────────────────────────────────────────────────────────────────

  const mangaList = [
    {
      title: "Berserk",
      type: "MANGA",
      demographic: "SEINEN",
      contentRating: "MATURE_SUGGESTIVE",
      status: "ONGOING",
      scoreAvg: 9.8,
      scoreCount: 42300,
      description:
        "En un mundo medieval oscuro y brutal, Guts, un mercenario solitario conocido como el Espadachín Negro, porta una espada colosal y busca venganza contra Griffith, su antiguo líder que lo traicionó en un ritual demoníaco. Una obra maestra del dark fantasy.",
      coverImage: `https://picsum.photos/seed/${slug("Berserk")}/600/900`,
      bannerImage: `https://picsum.photos/seed/${slug("Berserk-banner")}/1600/500`,
      tags: ["Acción", "Aventura", "Fantasía", "Horror", "Psicológico"],
      chapters: [
        { number: 374, title: "El abismo eterno" },
        { number: 373, title: "La marca maldita" },
        { number: 372, title: "Campos de batalla" },
      ],
    },
    {
      title: "Frieren: Beyond Journey's End",
      type: "MANGA",
      demographic: "SHOUNEN",
      contentRating: "EVERYONE",
      status: "ONGOING",
      scoreAvg: 9.4,
      scoreCount: 28100,
      description:
        "Frieren, una maga elfa que participó en la derrota del Rey Demonio junto a sus compañeros, viaja sola por el mundo décadas después. Reflexiona sobre el tiempo, la mortalidad y los vínculos humanos desde su perspectiva casi inmortal.",
      coverImage: `https://picsum.photos/seed/${slug("Frieren")}/600/900`,
      bannerImage: `https://picsum.photos/seed/${slug("Frieren-banner")}/1600/500`,
      tags: ["Aventura", "Fantasía", "Slice of Life", "Drama"],
      chapters: [
        { number: 128, title: "El precio de la magia" },
        { number: 127, title: "Recuerdos de otro tiempo" },
        { number: 126, title: "La prueba del norte" },
      ],
    },
    {
      title: "Chainsaw Man",
      type: "MANGA",
      demographic: "SHOUNEN",
      contentRating: "MATURE_SUGGESTIVE",
      status: "ONGOING",
      scoreAvg: 9.1,
      scoreCount: 35800,
      description:
        "Denji, un joven cazador de demonios desesperado, fusiona su cuerpo con Pochita, un demonio-motosierra. Ahora trabaja para la división pública de cazadores de demonios con el único sueño de tener una vida normal.",
      coverImage: `https://picsum.photos/seed/${slug("Chainsaw Man")}/600/900`,
      bannerImage: `https://picsum.photos/seed/${slug("Chainsaw Man-banner")}/1600/500`,
      tags: ["Acción", "Horror", "Sobrenatural", "Comedia"],
      chapters: [
        { number: 186, title: "La guerra continúa" },
        { number: 185, title: "Fragmentos" },
        { number: 184, title: "El precio" },
      ],
    },
    {
      title: "Solo Leveling",
      type: "MANHWA",
      demographic: "SHOUNEN",
      contentRating: "TEEN",
      status: "COMPLETED",
      scoreAvg: 8.9,
      scoreCount: 51200,
      description:
        "En un mundo donde los cazadores combaten criaturas en mazmorras, Sung Jin-Woo es el cazador más débil de todos. Tras sobrevivir una mazmorra mortal, recibe un sistema de juego único que solo él puede ver, comenzando su ascenso.",
      coverImage: `https://picsum.photos/seed/${slug("Solo Leveling")}/600/900`,
      bannerImage: `https://picsum.photos/seed/${slug("Solo Leveling-banner")}/1600/500`,
      tags: ["Acción", "Aventura", "Fantasía", "Sobrenatural"],
      chapters: [
        { number: 201, title: "El final del rey de las sombras" },
        { number: 200, title: "El precio de la fuerza" },
        { number: 199, title: "Último frente" },
      ],
    },
    {
      title: "Vagabond",
      type: "MANGA",
      demographic: "SEINEN",
      contentRating: "MATURE_SUGGESTIVE",
      status: "HIATUS",
      scoreAvg: 9.6,
      scoreCount: 19400,
      description:
        "Basado en la vida de Miyamoto Musashi, el legendario espadachín japonés. Sigue su camino desde un joven violento y arrogante hasta un guerrero que busca el verdadero significado de ser invencible bajo el cielo.",
      coverImage: `https://picsum.photos/seed/${slug("Vagabond")}/600/900`,
      bannerImage: `https://picsum.photos/seed/${slug("Vagabond-banner")}/1600/500`,
      tags: ["Acción", "Drama", "Histórico", "Psicológico"],
      chapters: [
        { number: 327, title: "El río y la espada" },
        { number: 326, title: "Silencio en el bosque" },
        { number: 325, title: "El maestro y el aprendiz" },
      ],
    },
    {
      title: "Dandadan",
      type: "MANGA",
      demographic: "SHOUNEN",
      contentRating: "TEEN",
      status: "ONGOING",
      scoreAvg: 8.7,
      scoreCount: 22600,
      description:
        "Momo cree en fantasmas pero no en extraterrestres. Ken cree en extraterrestres pero no en fantasmas. Cuando ambos se retan mutuamente a probar sus creencias, desencadenan fuerzas sobrenaturales que cambian sus vidas para siempre.",
      coverImage: `https://picsum.photos/seed/${slug("Dandadan")}/600/900`,
      bannerImage: `https://picsum.photos/seed/${slug("Dandadan-banner")}/1600/500`,
      tags: ["Acción", "Comedia", "Romance", "Sobrenatural", "Sci-fi"],
      chapters: [
        { number: 175, title: "La esencia de lo imposible" },
        { number: 174, title: "Raíces" },
        { number: 173, title: "Memoria" },
      ],
    },
  ];

  const localeProfiles = shuffle([
    ["es-ar"],
    ["es-ar", "en-us"],
    ["es-ar", "es-es", "en-us"],
    ["en-us", "en-gb"],
    ["es-es", "en-us"],
    ["pt-br", "es-ar"],
  ]);

  for (let mangaIndex = 0; mangaIndex < mangaList.length; mangaIndex += 1) {
    const m = mangaList[mangaIndex];
    const localeProfile = localeProfiles[mangaIndex % localeProfiles.length];
    const manga = await prisma.manga.create({
      data: {
        title: m.title,
        slug: slug(m.title),
        description: m.description,
        coverImage: m.coverImage,
        bannerImage: m.bannerImage,
        type: m.type,
        demographic: m.demographic,
        contentRating: m.contentRating,
        status: m.status,
        scoreAvg: m.scoreAvg,
        scoreCount: m.scoreCount,
        uploaderId: admin.id,
        tags: {
          create: m.tags
            .filter((t) => tagMap[t])
            .map((t) => ({ tagId: tagMap[t].id })),
        },
      },
    });

    // Crear capítulos con páginas de ejemplo
    for (let chapterIndex = 0; chapterIndex < m.chapters.length; chapterIndex += 1) {
      const ch = m.chapters[chapterIndex];
      const forcedLocale =
        chapterIndex < localeProfile.length ? localeProfile[chapterIndex] : pickRandom(localeProfile);
      const chapterLocale = forcedLocale.toLowerCase();
      const chapterLanguage = chapterLocale.slice(0, 2).toUpperCase();
      const chapter = await prisma.chapter.create({
        data: {
          number: ch.number,
          title: ch.title,
          mangaId: manga.id,
          status: "APPROVED",
          language: chapterLanguage,
          locale: chapterLocale,
        },
      });

      // 12 páginas por capítulo (suficiente para la galería de miniaturas)
      const pages = Array.from({ length: 12 }, (_, i) => {
        const p = fakePage(ch.number, i + 1);
        return {
          pageNumber: i + 1,
          imageUrl: p.imageUrl,
          thumbUrl: p.thumbUrl,
          width: p.width,
          height: p.height,
          chapterId: chapter.id,
        };
      });

      await prisma.page.createMany({ data: pages });

      // Registrar el upload del scanlator para los capítulos más recientes
      if (ch.number === m.chapters[0].number) {
        await prisma.chapterUpload.create({
          data: {
            chapterId: chapter.id,
            uploaderId: scanlator.id,
            status: "APPROVED",
            reviewedAt: new Date(),
          },
        });
      }
    }

    // Algunos comentarios de ejemplo en el manga
    await prisma.comment.createMany({
      data: [
        {
          body: "¡Uno de los mejores mangas que he leído! La narrativa es increíble.",
          userId: user1.id,
          targetType: "MANGA",
          mangaId: manga.id,
        },
        {
          body: "La calidad del arte mejora capítulo a capítulo. Una obra maestra.",
          userId: user2.id,
          targetType: "MANGA",
          mangaId: manga.id,
        },
      ],
    });

    // Votos positivos
    await prisma.vote.createMany({
      data: [
        {
          value: 1,
          userId: user1.id,
          targetType: "MANGA",
          mangaId: manga.id,
        },
        {
          value: 1,
          userId: user2.id,
          targetType: "MANGA",
          mangaId: manga.id,
        },
      ],
    });

    // Favoritos
    await prisma.userFavorite.create({
      data: {
        userId: user1.id,
        mangaId: manga.id,
        listType: "READING",
      },
    });
  }

  console.log("✅ Mangas, capítulos y páginas creados");

  // ── 4. Slots de publicidad ────────────────────────────────────────────────────

  await prisma.adSlot.createMany({
    data: [
      {
        name: "Banner entre hero y últimas novedades",
        placement: "HOME_HERO",
        isActive: true,
        script: "<!-- AdSense HOME_HERO placeholder -->",
      },
      {
        name: "Banner entre secciones homepage",
        placement: "HOME_MID",
        isActive: true,
        script: "<!-- AdSense HOME_MID placeholder -->",
      },
      {
        name: "Integrado en grilla de biblioteca",
        placement: "LIBRARY_GRID",
        isActive: false,
        script: null,
      },
      {
        name: "Sidebar del hub del manga",
        placement: "MANGA_HUB",
        isActive: true,
        script: "<!-- AdSense MANGA_HUB placeholder -->",
      },
      {
        name: "Al final del capítulo (post-lectura)",
        placement: "READER_END",
        isActive: true,
        script: "<!-- AdSense READER_END placeholder -->",
      },
    ],
  });

  console.log("✅ Slots de publicidad creados");
  console.log("");
  console.log("─────────────────────────────────────");
  console.log("🎉 Seed completado exitosamente");
  console.log("");
  console.log("Usuarios de prueba:");
  console.log("  admin@mangazen.com    → rol ADMIN");
  console.log(`  contraseña admin       → ${ADMIN_PASSWORD}`);
  console.log("  scan@gruposcan.com    → rol SCAN");
  console.log("  maria@example.com     → rol USER");
  console.log("  carlos@example.com    → rol USER");
  console.log(`  contraseña test        → ${TEST_PASSWORD}`);
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
