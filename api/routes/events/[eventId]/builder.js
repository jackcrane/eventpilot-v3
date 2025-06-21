import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { LogType } from "@prisma/client";
import { getChangedKeys } from "#getChangedKeys";

const fieldSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  label: z.string(),
  placeholder: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  required: z.boolean().optional(),
  defaultValue: z.boolean().optional(),
  prompt: z.string().optional().nullable(),
  order: z.number(),
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string(),
        order: z.number(),
      })
    )
    .optional(),
});

const bodySchema = z.object({
  fields: z.array(fieldSchema),
});

// GET → list fields
export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { eventId } = req.params;
    const fields = await prisma.formField.findMany({
      where: {
        AND: [
          { OR: [{ eventId }, { event: { slug: eventId } }] },
          { deleted: false },
        ],
      },
      orderBy: { order: "asc" },
      include: {
        options: { where: { deleted: false }, orderBy: { order: "asc" } },
      },
    });
    res.json({ fields });
  },
];

export const deepCompareObjects = (a, b) => {
  const changedKeys = [];

  const helper = (a, b, path = "") => {
    if (a === b) return true;

    if (a && b && typeof a === "object" && typeof b === "object") {
      const keysA = Object.keys(a);
      for (const key of keysA) {
        const fullPath = path ? `${path}.${key}` : key;
        if (!helper(a[key], b[key], fullPath)) {
          changedKeys.push(fullPath);
        }
      }
      return changedKeys.length === 0;
    }

    return false;
  };

  const isEqual = helper(a, b);
  return [isEqual && changedKeys.length === 0, changedKeys];
};

const prepareCUD = (incoming, existing) => {
  const new_ = [];
  const existingWithDiffs = [];
  const existingWithoutDiffs = [];

  const existingMap = new Map();
  for (const e of existing) {
    existingMap.set(e.id, e);
  }

  const seenIds = new Set();

  for (const i of incoming) {
    if (!i.id) {
      new_.push(i);
      continue;
    }

    seenIds.add(i.id);
    const existingItem = existingMap.get(i.id);
    if (!existingItem) {
      new_.push(i);
      continue;
    }

    if (!deepCompareObjects(i, existingItem)[0]) {
      existingWithDiffs.push(i);
    } else {
      existingWithoutDiffs.push(i);
    }
  }

  const deleted = existing.filter((e) => !seenIds.has(e.id));

  return [new_, existingWithDiffs, existingWithoutDiffs, deleted];
};

// POST → replace/update fields
export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: serializeError(parsed) });
    }
    const { fields } = parsed.data;

    // 0,2: snapshot before-change
    const before = await prisma.formField.findMany({
      where: { eventId, deleted: false },
      orderBy: { order: "asc" },
      include: {
        options: { where: { deleted: false }, orderBy: { order: "asc" } },
      },
    });

    const [newFields, updatedFields, unchangedFields, deletedFields] =
      prepareCUD(fields, before);

    // 3: Create new fields
    if (newFields.length > 0) {
      await prisma.formField.createMany({
        data: newFields.map(({ options, ...rest }) => ({ ...rest, eventId })),
      });
    }

    // 4: Soft-delete removed fields
    if (deletedFields.length > 0) {
      await prisma.formField.updateMany({
        where: { id: { in: deletedFields.map((f) => f.id) } },
        data: { deleted: true },
      });
    }

    // 5–11: Handle updated fields + their options
    for (const incoming of updatedFields) {
      const original = before.find((f) => f.id === incoming.id);
      if (!original) continue;

      // a) top-level diffs
      const fieldDiff = {};
      for (const key of [
        "label",
        "placeholder",
        "description",
        "required",
        "defaultValue",
        "prompt",
        "order",
      ]) {
        if (incoming[key] !== original[key]) {
          fieldDiff[key] = incoming[key];
        }
      }
      if (Object.keys(fieldDiff).length) {
        await prisma.formField.update({
          where: { id: incoming.id },
          data: fieldDiff,
        });
      }

      // b) option‐level CUD
      // only if this field actually has options in the DB
      if (original.options && original.options.length > 0) {
        // incoming.options might be undefined for text/email fields
        const incomingOpts = incoming.options || [];
        const [newOpts, updOpts, , delOpts] = prepareCUD(
          incomingOpts,
          original.options
        );

        // create new options
        if (newOpts.length > 0) {
          await prisma.formFieldOption.createMany({
            data: newOpts.map((o) => ({ ...o, fieldId: incoming.id })),
          });
        }

        // soft-delete removed options
        if (delOpts.length > 0) {
          await prisma.formFieldOption.updateMany({
            where: { id: { in: delOpts.map((o) => o.id) } },
            data: { deleted: true },
          });
        }

        // update changed options
        for (const optIn of updOpts) {
          const optOrig = original.options.find((o) => o.id === optIn.id);
          if (!optOrig) continue;

          const optDiff = {};
          for (const key of ["label", "order"]) {
            if (optIn[key] !== optOrig[key]) {
              optDiff[key] = optIn[key];
            }
          }
          if (Object.keys(optDiff).length) {
            await prisma.formFieldOption.update({
              where: { id: optIn.id },
              data: optDiff,
            });
          }
        }
      }
    }

    const updatedRecordedFields = await prisma.formField.findMany({
      where: { eventId, deleted: false },
      orderBy: { order: "asc" },
      include: {
        options: { where: { deleted: false }, orderBy: { order: "asc" } },
      },
    });

    return res.json({
      fields: updatedRecordedFields,
      newFields,
      updatedFields,
      unchangedFields,
      deletedFields,
    });
  },
];
