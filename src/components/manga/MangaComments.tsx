"use client";

import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import { ChapterComments } from "@/components/manga/ChapterComments";

type Props = {
  mangaSlug: string;
  isAuthenticated: boolean;
  currentUserId: string | null;
};

export function MangaComments({ mangaSlug, isAuthenticated, currentUserId }: Props) {
  const t = useTranslations("mangaComments");
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" aria-hidden />
        <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
      </div>
      <ChapterComments
        mangaSlug={mangaSlug}
        chapterId={null}
        isAuthenticated={isAuthenticated}
        currentUserId={currentUserId}
        isMangaLevel={true}
      />
    </section>
  );
}
