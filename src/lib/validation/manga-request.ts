import { z } from "zod";

export const createMangaRequestBodySchema = z.object({
  title: z.string().trim().min(1).max(100),
  author: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type CreateMangaRequestBody = z.infer<typeof createMangaRequestBodySchema>;

export function normalizeMangaRequestBody(data: CreateMangaRequestBody) {
  return {
    title: data.title.trim(),
    author: data.author && data.author.trim().length > 0 ? data.author.trim() : undefined,
    notes: data.notes && data.notes.trim().length > 0 ? data.notes.trim() : undefined,
  };
}
