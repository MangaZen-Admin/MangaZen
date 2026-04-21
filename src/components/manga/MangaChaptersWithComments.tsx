"use client";

import { useState } from "react";
import { LocalizedChapterList } from "@/components/manga/LocalizedChapterList";
import { ChapterComments } from "@/components/manga/ChapterComments";

type ChapterItem = {
  id: string;
  number: number;
  title: string | null;
  createdAt: string;
  locale: string;
  pagesCount: number;
  eaActive?: boolean;
  earlyAccessUntil?: string | null;
  userHasAccess?: boolean;
};

type MangaChaptersWithCommentsProps = {
  userLocale: string;
  mangaSlug: string;
  chapters: ChapterItem[];
  isAuthenticated: boolean;
  /** Para mostrar acciones de edición solo en comentarios propios. */
  currentUserId: string | null;
};

export function MangaChaptersWithComments({
  userLocale,
  mangaSlug,
  chapters,
  isAuthenticated,
  currentUserId,
}: MangaChaptersWithCommentsProps) {
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);

  return (
    <>
      <LocalizedChapterList
        userLocale={userLocale}
        chapters={chapters}
        openChapterId={openChapterId}
        onOpenChapterChange={setOpenChapterId}
      />
      {openChapterId ? (
        <div className="mt-8 border-t border-border pt-6">
          <ChapterComments
            mangaSlug={mangaSlug}
            chapterId={openChapterId}
            isAuthenticated={isAuthenticated}
            currentUserId={currentUserId}
          />
        </div>
      ) : null}
    </>
  );
}
