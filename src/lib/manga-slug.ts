import { prisma } from "@/lib/db";

function slugifyBase(title: string): string {
  const s = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s.length > 0 ? s : "manga";
}

/** Slug único para tabla Manga. */
export async function uniqueMangaSlugFromTitle(title: string): Promise<string> {
  const base = slugifyBase(title);
  let candidate = base;
  let n = 0;
  while (true) {
    const clash = await prisma.manga.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}
