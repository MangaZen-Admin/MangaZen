"use client";

import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

type ProPlanId = "bronze" | "silver" | "gold" | "platinum";

const PLAN_STYLES: Record<ProPlanId, string> = {
  bronze: "text-amber-700",
  silver: "text-slate-400",
  gold: "text-yellow-400",
  platinum: "text-violet-400",
};

type Props = {
  plan: ProPlanId;
  className?: string;
  size?: "sm" | "md";
};

export function ProCrown({ plan, className, size = "sm" }: Props) {
  return (
    <Crown
      aria-label={`Pro ${plan}`}
      className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", PLAN_STYLES[plan], className)}
    />
  );
}
