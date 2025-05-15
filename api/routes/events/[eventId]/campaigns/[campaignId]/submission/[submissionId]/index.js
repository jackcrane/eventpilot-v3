import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { serializeError } from "#serializeError";

// Schema for validating updates
const bodySchema = z.object({
  values: z.record(z.string(), z.string()),
});

/**
 * GET → fetch a single submission with flattened values
 */
export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { campaignId, submissionId } = req.params;
    try {
      // Fetch all fields (including deleted ones) with type + options
      const fields = await prisma.formField.findMany({
        where: { campaignId },
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          type: true,
          options: { select: { id: true, label: true, deleted: true } },
          deleted: true,
          order: true,
          required: true,
        },
      });

      // Fetch the specific submission
      const resp = await prisma.formResponse.findUnique({
        where: { id: submissionId },
        include: {
          fieldResponses: {
            select: { fieldId: true, value: true, field: true },
          },
          pii: true,
        },
      });
      if (!resp || resp.campaignId !== campaignId) {
        return res.status(404).json({ message: "Submission not found" });
      }

      const formattedResponse = formatFormResponse(resp, fields);

      const emailField = fields.find((f) => f.label === "Your Email");
      const email = formattedResponse[emailField.id];
      const nameField = fields.find((f) => f.label === "Your Name");
      const name = formattedResponse[nameField.id];
      formattedResponse["flat"] = {
        email,
        name,
      };

      const fieldsMeta = fields.map((f) => ({
        ...f,
        currentlyInForm: !f.deleted,
      }));

      return res.json({
        response: formattedResponse,
        fields: fieldsMeta,
        pii: resp.pii,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
];

/**
 * PUT → update an existing submission by overwriting its fieldResponses
 */
export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { submissionId } = req.params;
    const parse = bodySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: serializeError(parse) });
    }
    const { values } = parse.data;

    try {
      // Overwrite all existing fieldResponses for this submission
      const updated = await prisma.formResponse.update({
        where: { id: submissionId },
        data: {
          fieldResponses: {
            deleteMany: {},
            create: Object.entries(values).map(([fieldId, value]) => ({
              field: { connect: { id: fieldId } },
              value,
            })),
          },
          updatedAt: new Date(),
        },
      });
      return res.json({ id: updated.id });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
];

/**
 * DELETE → remove a submission and its child FieldResponses
 */
export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { submissionId, campaignId } = req.params;
    try {
      // Ensure it belongs to this campaign
      const resp = await prisma.formResponse.findUnique({
        where: { id: submissionId },
      });
      if (!resp || resp.campaignId !== campaignId) {
        return res.status(404).json({ message: "Submission not found" });
      }
      await prisma.formResponse.delete({ where: { id: submissionId } });
      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
];

export const formatFormResponse = (resp, fields) => {
  const obj = {};
  for (const f of fields) {
    obj[f.id] = null;
  }
  for (const fr of resp.fieldResponses) {
    const field = fields.find((f) => f.id === fr.fieldId);
    if (!field) continue;
    if (field.type === "dropdown") {
      const opt = field.options.find((o) => o.id === fr.value);
      obj[field.id] = opt ? { id: opt.id, label: opt.label } : null;
    } else {
      obj[field.id] = fr.value;
    }
  }
  obj["createdAt"] = resp.createdAt;
  obj["updatedAt"] = resp.updatedAt;
  obj["id"] = resp.id;
  return obj;
};
