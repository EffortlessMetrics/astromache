import { defineCollection, z } from "astro:content";
import { noteLoader } from "./note-loader";
export const collections = {
  notes: defineCollection({
    loader: noteLoader(),
    schema: z.object({
      title: z.string().refine((value) => value.trim().length > 0, {
        message: "Note title must contain non-whitespace text",
      }),
      description: z.string().refine((value) => value.trim().length > 0, {
        message: "Note description must contain non-whitespace text",
      }),
      published: z.coerce.date(),
      tags: z.array(z.string()),
      category: z.string(),
    }),
  }),
};
