import { z } from "zod";

export const personSchema = z.object({
  name: z.string().min(2).max(50),
  fields: z
    .array(
      z.object({
        id: z.string(),
        value: z.string(),
      })
    )
    .default([]),
  emails: z
    .array(
      z.object({
        id: z.string().optional().nullable(),
        email: z.string().email(),
        label: z.string().default(""),
        notes: z.string().optional().nullable(),
      })
    )
    .default([]),
  phones: z
    .array(
      z.object({
        id: z.string().optional().nullable(),
        phone: z.string(),
        label: z.string().default(""),
        notes: z.string().optional().nullable(),
      })
    )
    .default([]),
});
