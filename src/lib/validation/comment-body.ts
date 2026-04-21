import { z } from "zod";
import { COMMENT_MAX_LENGTH } from "@/lib/chapter-comments";
import { routing } from "@/i18n/routing";

const localeEnum = z.enum(routing.locales as unknown as [string, ...string[]]);

export const postChapterCommentSchema = z.object({
  chapterId: z.string().trim().min(1).optional(),
  content: z
    .string()
    .max(COMMENT_MAX_LENGTH)
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: "EMPTY" }),
  parentId: z.union([z.string().trim().min(1), z.null()]).optional(),
  locale: localeEnum,
});

export const patchCommentBodySchema = z.object({
  content: z
    .string()
    .max(COMMENT_MAX_LENGTH)
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, { message: "EMPTY" }),
});
