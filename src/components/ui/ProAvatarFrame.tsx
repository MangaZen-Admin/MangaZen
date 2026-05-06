"use client";

import { cn } from "@/lib/utils";

type ProPlan = "bronze" | "silver" | "gold" | "platinum" | null;

const PLAN_STYLES: Record<
  NonNullable<ProPlan>,
  { ring: string; glow: string }
> = {
  bronze: {
    ring: "ring-2 ring-amber-600",
    glow: "",
  },
  silver: {
    ring: "ring-2 ring-slate-400",
    glow: "",
  },
  gold: {
    ring: "ring-2 ring-yellow-400",
    glow: "shadow-[0_0_8px_2px_rgba(250,204,21,0.5)]",
  },
  platinum: {
    ring: "ring-2 ring-violet-400",
    glow: "shadow-[0_0_10px_3px_rgba(167,139,250,0.6)]",
  },
};

type Props = {
  proPlan?: ProPlan;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  children: React.ReactNode;
};

const SIZE_CLASSES = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
};

export function ProAvatarFrame({
  proPlan,
  size = "md",
  className,
  children,
}: Props) {
  const styles = proPlan ? PLAN_STYLES[proPlan] : null;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full",
        SIZE_CLASSES[size],
        styles?.ring,
        styles?.glow,
        className
      )}
    >
      {children}
    </div>
  );
}
