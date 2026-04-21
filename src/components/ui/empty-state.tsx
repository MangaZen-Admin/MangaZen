import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateAction =
  | { label: string; onClick: () => void }
  | { label: string; href: string };

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  /** Tighter layout for popovers / small containers */
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  const iconClass = compact ? "h-10 w-10" : "h-12 w-12";
  const padding = compact ? "py-6" : "py-10";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        padding,
        className
      )}
    >
      {Icon ? (
        <Icon
          className={cn("text-muted-foreground", iconClass)}
          aria-hidden
          strokeWidth={1.5}
        />
      ) : null}
      <h3
        className={cn(
          "font-semibold text-foreground",
          compact ? "mt-3 text-sm" : "mt-4 text-base"
        )}
      >
        {title}
      </h3>
      {description ? (
        <p
          className={cn(
            "max-w-sm text-muted-foreground",
            compact ? "mt-1.5 text-xs leading-relaxed" : "mt-2 text-sm leading-relaxed"
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? (
        "href" in action ? (
          <Button asChild variant="outline" size={compact ? "sm" : "default"} className="mt-6">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size={compact ? "sm" : "default"}
            className="mt-6"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}
