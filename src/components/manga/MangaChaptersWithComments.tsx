"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocalizedChapterList } from "@/components/manga/LocalizedChapterList";
import { ChapterComments } from "@/components/manga/ChapterComments";
import { cn } from "@/lib/utils";

type ChapterItem = {
  id: string;
  number: number;
  title: string | null;
  createdAt: string;
  locale: string;
  pagesCount: number;
  pageUrls?: string[];
  eaActive?: boolean;
  earlyAccessUntil?: string | null;
  userHasAccess?: boolean;
};

type MangaChaptersWithCommentsProps = {
  userLocale: string;
  mangaSlug: string;
  chapters: ChapterItem[];
  isAuthenticated: boolean;
  currentUserId: string | null;
};

export function MangaChaptersWithComments({
  userLocale,
  mangaSlug,
  chapters,
  isAuthenticated,
  currentUserId,
}: MangaChaptersWithCommentsProps) {
  const t = useTranslations("chapterComments");
  const tManga = useTranslations("mangaComments");
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [chapterCommentsOpen, setChapterCommentsOpen] = useState(true);
  const [mangaCommentsOpen, setMangaCommentsOpen] = useState(true);

  return (
    <>
      <LocalizedChapterList
        userLocale={userLocale}
        chapters={chapters}
        openChapterId={openChapterId}
        onOpenChapterChange={(id) => {
          setOpenChapterId(id);
          if (id) setChapterCommentsOpen(true);
        }}
      />

      {/* Comentarios del capítulo */}
      {openChapterId && (
        <div className="mt-6 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setChapterCommentsOpen((p) => !p)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                chapterCommentsOpen ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>
          {chapterCommentsOpen && (
            <div className="mt-4">
              <ChapterComments
                mangaSlug={mangaSlug}
                chapterId={openChapterId}
                isAuthenticated={isAuthenticated}
                currentUserId={currentUserId}
                isMangaLevel={false}
                showSectionTitle={false}
              />
            </div>
          )}
        </div>
      )}

      {/* Comentarios del manga */}
      <div className="mt-6 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setMangaCommentsOpen((p) => !p)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <h2 className="text-base font-semibold text-foreground">{tManga("title")}</h2>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              mangaCommentsOpen ? "rotate-0" : "-rotate-90"
            )}
          />
        </button>
        {mangaCommentsOpen && (
          <div className="mt-4">
            <ChapterComments
              mangaSlug={mangaSlug}
              chapterId={null}
              isAuthenticated={isAuthenticated}
              currentUserId={currentUserId}
              isMangaLevel={true}
              showSectionTitle={false}
            />
          </div>
        )}
      </div>
    </>
  );
}
