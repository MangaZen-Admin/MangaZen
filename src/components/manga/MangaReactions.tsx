"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Flame, Heart, ThumbsDown } from "lucide-react";
import { notifyBadgesEarned } from "@/components/badges/notify-badges-earned";
import Link from "next/link";
import { cn } from "@/lib/utils";

type MangaReactionsProps = {
  mangaSlug: string;
  initialFavoriteCount: number;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialFavorited: boolean;
  initialVoteChoice: VoteChoice;
  isAuthenticated: boolean;
};

type VoteChoice = "like" | "dislike" | null;

export function MangaReactions({
  mangaSlug,
  initialFavoriteCount,
  initialLikeCount,
  initialDislikeCount,
  initialFavorited,
  initialVoteChoice,
  isAuthenticated,
}: MangaReactionsProps) {
  const tBadges = useTranslations("badges");
  const [favorited, setFavorited] = useState(initialFavorited);
  const [voteChoice, setVoteChoice] = useState<VoteChoice>(initialVoteChoice);
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [isPending, setIsPending] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const counts = useMemo(
    () => ({ favoriteCount, likeCount, dislikeCount }),
    [favoriteCount, likeCount, dislikeCount]
  );

  async function sendReaction(action: "toggle_favorite" | "set_like" | "set_dislike") {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    if (isPending) return;

    setIsPending(true);
    try {
      const response = await fetch(`/api/manga/${mangaSlug}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.status === 401) {
        setShowAuthPrompt(true);
        return;
      }

      if (!response.ok) return;

      const payload = (await response.json()) as {
        favoriteCount: number;
        likeCount: number;
        dislikeCount: number;
        isFavorited: boolean;
        voteChoice: VoteChoice;
        badgesEarned?: { name: string; description: string }[];
      };

      notifyBadgesEarned(payload.badgesEarned ?? [], tBadges);

      setFavoriteCount(payload.favoriteCount);
      setLikeCount(payload.likeCount);
      setDislikeCount(payload.dislikeCount);
      setFavorited(payload.isFavorited);
      setVoteChoice(payload.voteChoice);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void sendReaction("toggle_favorite")}
        disabled={isPending}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition disabled:opacity-60",
          favorited
            ? "border-pink-500/50 bg-pink-500/15 text-pink-900 dark:border-pink-400/40 dark:bg-pink-500/20 dark:text-pink-200"
            : "border-border bg-muted/40 text-foreground hover:bg-muted"
        )}
      >
        <Heart className="h-4 w-4" />
        Favorito ({counts.favoriteCount})
      </button>

      <button
        type="button"
        onClick={() => void sendReaction("set_like")}
        disabled={isPending}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition disabled:opacity-60",
          voteChoice === "like"
            ? "border-emerald-600/45 bg-emerald-500/15 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200"
            : "border-border bg-muted/40 text-foreground hover:bg-muted"
        )}
      >
        <Flame className="h-4 w-4" />
        Me gusta ({counts.likeCount})
      </button>

      <button
        type="button"
        onClick={() => void sendReaction("set_dislike")}
        disabled={isPending}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition disabled:opacity-60",
          voteChoice === "dislike"
            ? "border-amber-500/45 bg-amber-500/15 text-amber-950 dark:border-amber-300/40 dark:bg-amber-500/20 dark:text-amber-100"
            : "border-border bg-muted/40 text-foreground hover:bg-muted"
        )}
      >
        <ThumbsDown className="h-4 w-4" />
        No me gusta ({counts.dislikeCount})
      </button>

      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg dark:shadow-2xl">
            <h3 className="text-base font-semibold">Necesitás una cuenta</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Para votar o guardar mangas en favoritos, iniciá sesión o creá una cuenta.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/login?next=${encodeURIComponent(`/manga/${mangaSlug}`)}`}
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                Iniciar sesión
              </Link>
              <Link
                href={`/register?next=${encodeURIComponent(`/manga/${mangaSlug}`)}`}
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground"
              >
                Crear cuenta
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setShowAuthPrompt(false)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
