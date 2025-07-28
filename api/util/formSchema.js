import { z } from "zod";

const baseField = {
  id: z.union([z.string(), z.number()]),
  fieldType: z.string().optional().nullable(),
  order: z.number(),
};

const textField = z.object({
  ...baseField,
  type: z.literal("text"),
  label: z.string().default(""),
  placeholder: z.string().default(""),
  description: z.string().default(""),
  required: z.boolean().default(false),
});

const emailField = z.object({
  ...baseField,
  type: z.literal("email"),
  label: z.string().default(""),
  placeholder: z.string().default(""),
  description: z.string().default(""),
  required: z.boolean().default(false),
});

const textareaField = z.object({
  ...baseField,
  type: z.literal("textarea"),
  label: z.string().default(""),
  placeholder: z.string().default(""),
  description: z.string().default(""),
  required: z.boolean().default(false),
  rows: z.number().default(2),
});

const richtextField = z.object({
  ...baseField,
  type: z.literal("richtext"),
  markdown: z.string().default(""),
});

const checkboxField = z.object({
  ...baseField,
  type: z.literal("checkbox"),
  label: z.string().default(""),
  required: z.boolean().default(false),
});

const dropdownField = z.object({
  ...baseField,
  type: z.literal("dropdown"),
  label: z.string().default(""),
  prompt: z.string().default(""),
  required: z.boolean().default(false),
  options: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      label: z.string(),
      order: z.number(),
    })
  ),
});

const registrationTierField = z.object({
  ...baseField,
  type: z.literal("registrationtier"),
});

const upsellsField = z.object({
  ...baseField,
  type: z.literal("upsells")
})

const fieldSchema = z.discriminatedUnion("type", [
  textField,
  emailField,
  textareaField,
  richtextField,
  checkboxField,
  dropdownField,
  registrationTierField,
  upsellsField
]);

export const formSchema = z.object({
  pages: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      name: z.string(),
      fields: z.array(fieldSchema),
      order: z.number(),
    })
  ),
});
