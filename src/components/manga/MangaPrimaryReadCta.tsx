import Link from "next/link";
import { BookOpen } from "lucide-react";

type MangaPrimaryReadCtaProps = {
  href: string | null;
  label: string;
  emptyLabel: string;
};

export function MangaPrimaryReadCta({ href, label, emptyLabel }: MangaPrimaryReadCtaProps) {
  if (!href) {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <BookOpen className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        {emptyLabel}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/60 bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-none transition hover:bg-primary/90 dark:shadow-[0_0_18px_rgba(157,78,221,0.35)]"
    >
      <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}
