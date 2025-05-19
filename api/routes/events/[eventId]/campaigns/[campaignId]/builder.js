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
    const { campaignId } = req.params;
    const fields = await prisma.formField.findMany({
      where: {
        AND: [
          { OR: [{ campaignId }, { campaign: { slug: campaignId } }] },
          {
            OR: [
              {
                campaign: {
                  eventId: req.params.eventId,
                },
              },
              { campaign: { event: { slug: req.params.eventId } } },
            ],
          },
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

// POST → replace/update fields
export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { campaignId } = req.params;
    const result = bodySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }
    const { fields } = result.data;

    const before = await prisma.formField.findMany({
      where: { campaignId, deleted: false },
      orderBy: { order: "asc" },
      include: {
        options: { where: { deleted: false }, orderBy: { order: "asc" } },
      },
    });

    await prisma.$transaction(async (tx) => {
      // soft-delete fields that were removed
      const incomingIds = fields.map((f) => f.id).filter(Boolean);
      await tx.formField.updateMany({
        where: {
          campaignId,
          id: { notIn: incomingIds },
          deleted: false,
        },
        data: { deleted: true },
      });

      for (const f of fields) {
        let fieldId = f.id;
        if (fieldId) {
          // update existing
          await tx.formField.update({
            where: { id: fieldId },
            data: {
              type: f.type,
              label: f.label,
              placeholder: f.placeholder,
              description: f.description,
              required: f.required,
              defaultValue: f.defaultValue,
              prompt: f.prompt,
              order: f.order,
            },
          });
        } else {
          // create new
          const created = await tx.formField.create({
            data: {
              campaign: { connect: { id: campaignId } },
              type: f.type,
              label: f.label,
              placeholder: f.placeholder,
              description: f.description,
              required: f.required,
              defaultValue: f.defaultValue,
              prompt: f.prompt,
              order: f.order,
            },
          });
          fieldId = created.id;
        }

        // options
        const incomingOptIds = (f.options || [])
          .map((o) => o.id)
          .filter(Boolean);
        await tx.formFieldOption.updateMany({
          where: { fieldId, id: { notIn: incomingOptIds }, deleted: false },
          data: { deleted: true },
        });
        for (const o of f.options || []) {
          if (o.id) {
            await tx.formFieldOption.update({
              where: { id: o.id },
              data: { label: o.label, order: o.order },
            });
          } else {
            await tx.formFieldOption.create({
              data: {
                field: { connect: { id: fieldId } },
                label: o.label,
                order: o.order,
              },
            });
          }
        }
      }
    });

    // return updated
    const updated = await prisma.formField.findMany({
      where: { campaignId: req.params.campaignId, deleted: false },
      orderBy: { order: "asc" },
      include: {
        options: { where: { deleted: false }, orderBy: { order: "asc" } },
      },
    });

    const changedKeys = getChangedKeys(before, updated);
    await prisma.logs.create({
      data: {
        type: LogType.FORM_FIELD_MODIFIED,
        userId: req.user.id,
        ip: req.ip,
        eventId: req.params.eventId,
        campaignId: req.params.campaignId,
        data: changedKeys,
      },
    });

    res.json({ fields: updated });
  },
];
