import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { serializeError } from "#serializeError";
import { formSchema } from "../../../../util/formSchema";
import { zerialize } from "zodex";

// detect new items (stringified integers)
const isNew = (id) => /^\d+$/.test(id);

// sync options for one field
const syncOptions = async (tx, fieldId, optionsData = []) => {
  const existing = await tx.registrationFieldOption.findMany({
    where: { fieldId },
  });
  const incomingIds = optionsData.filter((o) => !isNew(o.id)).map((o) => o.id);

  // soft-delete removed
  await Promise.all(
    existing
      .filter((o) => !incomingIds.includes(o.id))
      .map((o) =>
        tx.registrationFieldOption.update({
          where: { id: o.id },
          data: { deleted: true },
        })
      )
  );

  for (const opt of optionsData) {
    const { id, label, order } = opt;
    const value = opt.value ?? label;
    if (isNew(id)) {
      await tx.registrationFieldOption.create({
        data: { fieldId, label, value, order },
      });
    } else {
      await tx.registrationFieldOption.update({
        where: { id },
        data: { label, value, order, deleted: false },
      });
    }
  }
};

// sync fields for one page
const syncFields = async (tx, eventId, pageId, fieldsData = []) => {
  const existing = await tx.registrationField.findMany({ where: { pageId } });
  const incomingIds = fieldsData.filter((f) => !isNew(f.id)).map((f) => f.id);

  // soft-delete removed
  await Promise.all(
    existing
      .filter((f) => !incomingIds.includes(f.id))
      .map((f) =>
        tx.registrationField.update({
          where: { id: f.id },
          data: { deleted: true },
        })
      )
  );

  for (const field of fieldsData) {
    const data = {
      type: field.type.toUpperCase(),
      label: field.label ?? null,
      placeholder: field.placeholder ?? null,
      description: field.description ?? null,
      prompt: field.prompt ?? null,
      rows: field.rows ?? null,
      markdown: field.markdown ?? null,
      required: field.required,
      order: field.order ?? -1,
      deleted: false,
      fieldType: field.fieldType ?? null,
      event: { connect: { id: eventId } },
      page: { connect: { id: pageId } },
    };

    if (isNew(field.id)) {
      const created = await tx.registrationField.create({ data });
      await syncOptions(tx, created.id, field.options);
    } else {
      await tx.registrationField.update({ where: { id: field.id }, data });
      await syncOptions(tx, field.id, field.options);
    }
  }
};

// sync pages for the event
const syncPages = async (tx, eventId, pagesData = []) => {
  const existing = await tx.registrationPage.findMany({ where: { eventId } });
  const incomingIds = pagesData.filter((p) => !isNew(p.id)).map((p) => p.id);

  // soft-delete removed
  await Promise.all(
    existing
      .filter((p) => !incomingIds.includes(p.id))
      .map((p) =>
        tx.registrationPage.update({
          where: {
            id: p.id,
          },
          data: { deleted: true },
        })
      )
  );

  for (const page of pagesData) {
    if (isNew(page.id)) {
      const created = await tx.registrationPage.create({
        data: {
          event: {
            connect: { id: eventId },
          },
          name: page.name,
          order: page.order,
          deleted: false,
        },
      });
      await syncFields(tx, eventId, created.id, page.fields);
    } else {
      await tx.registrationPage.update({
        where: {
          id: page.id,
        },
        data: { name: page.name, deleted: false, order: page.order },
      });
      await syncFields(tx, eventId, page.id, page.fields);
    }
  }
};

export const get = [
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const pages = await prisma.registrationPage.findMany({
        where: { eventId, deleted: false },
        orderBy: { order: "asc" },
        include: {
          fields: {
            where: { deleted: false },
            orderBy: { order: "asc" },
            include: {
              options: {
                where: { deleted: false },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      });

      return res.json({ fields: pages });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error });
    }
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const result = formSchema.safeParse(req.body);
      if (!result.success) {
        console.log(result.error);
        return res.status(400).json({ message: serializeError(result) });
      }

      const pages = result.data.pages;
      const { eventId } = req.params;

      await prisma.$transaction(
        async (tx) => {
          await syncPages(tx, eventId, pages);
        },
        {
          timeout: 120_000,
        }
      );

      return res.json({ message: "Form upserted successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(formSchema));
  },
];
