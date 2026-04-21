import Link from "next/link";
import Image from "next/image";
import { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { Zap } from "lucide-react";
import { prisma } from "@/lib/db";
import { translateCatalogTagName } from "@/lib/catalog-tag-i18n";

type BoostedMangaCard = {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  tags: { tag: { name: string } }[];
};

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

async function getBoostedMangas(now: Date): Promise<BoostedMangaCard[]> {
  try {
    const rows = await prisma.manga.findMany({
      where: {
        reviewStatus: "APPROVED",
        boostExpiresAt: { gt: now },
      },
      take: 30,
      select: {
        id: true,
        slug: true,
        title: true,
        coverImage: true,
        tags: {
          take: 3,
          select: {
            tag: { select: { name: true } },
          },
        },
      },
    });
    return rows;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return [];
    }
    throw error;
  }
}

export async function BoostCarousel() {
  const [tBoost, tCat] = await Promise.all([getTranslations("boost"), getTranslations("catalog")]);
  const translateTag = (name: string) => translateCatalogTagName(name, (k) => tCat(k));

  const now = new Date();
  const boosted = await getBoostedMangas(now);
  if (boosted.length === 0) return null;

  const shuffled = shuffleInPlace([...boosted]).slice(0, 12);

  return (
    <section className="my-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-medium text-foreground">{tBoost("homeTitle")}</h2>
        <span className="text-xs text-muted-foreground">{tBoost("homeSubtitle")}</span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-3 shadow-sm dark:border-border dark:shadow-none">
        <div className="-m-1 flex snap-x snap-mandatory gap-3 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {shuffled.map((manga) => (
            <Link
              key={manga.id}
              href={`/manga/${manga.slug}`}
              className="group relative w-[220px] shrink-0 snap-start overflow-hidden rounded-xl border border-primary/20 bg-background/40 transition-colors hover:bg-muted/40 dark:border-primary/15"
            >
              <div className="relative aspect-[3/4] w-full bg-muted">
                {manga.coverImage ? (
                  <Image
                    src={manga.coverImage}
                    alt={tCat("coverAlt", { title: manga.title })}
                    fill
                    sizes="220px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : null}
                <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-900 backdrop-blur-sm dark:text-amber-100">
                  <Zap className="h-3 w-3 text-amber-600 dark:text-amber-300" aria-hidden />
                  {tBoost("badgePromoted")}
                </div>
              </div>

              <div className="space-y-1.5 p-3">
                <p className="line-clamp-1 text-sm font-semibold text-foreground">{manga.title}</p>
                <div className="flex flex-wrap gap-1">
                  {manga.tags.slice(0, 3).map((rel) => (
                    <span
                      key={`${manga.id}-${rel.tag.name}`}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {translateTag(rel.tag.name)}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

