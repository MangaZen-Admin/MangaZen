import type { LucideIcon } from "lucide-react";
import {
  BookCheck,
  BookOpen,
  Crown,
  Gem,
  Globe2,
  Heart,
  Languages,
  Library,
  ListTodo,
  MessageCircle,
  MessagesSquare,
  Moon,
  PenLine,
  Reply,
  Shield,
  Sparkles,
  ThumbsUp,
  Upload,
  Layers,
} from "lucide-react";

export const BADGE_LUCIDE_MAP: Record<string, LucideIcon> = {
  Shield,
  BookOpen,
  Library,
  Globe2,
  MessageCircle,
  MessagesSquare,
  Reply,
  Heart,
  ThumbsUp,
  Languages,
  Sparkles,
  Gem,
  Upload,
  Layers,
  Moon,
  ListTodo,
  BookCheck,
  PenLine,
  Crown,
};

export function getBadgeLucideIcon(iconKey: string | null | undefined): LucideIcon | null {
  if (!iconKey || typeof iconKey !== "string") return null;
  return BADGE_LUCIDE_MAP[iconKey] ?? null;
}

export const BADGE_ICON_KEYS = Object.keys(BADGE_LUCIDE_MAP).sort() as string[];
