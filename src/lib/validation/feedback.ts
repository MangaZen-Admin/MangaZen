import { z } from "zod";

export const feedbackCategorySchema = z.enum(["BUG", "SUGGESTION", "PRAISE"]);

export const createFeedbackBodySchema = z.object({
  title: z.string().trim().min(1, "required").max(100),
  body: z.string().trim().min(1, "required").max(1000),
  category: feedbackCategorySchema,
});

export const feedbackVoteBodySchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});

export const adminFeedbackPatchSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});
