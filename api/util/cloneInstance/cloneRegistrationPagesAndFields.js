export const cloneRegistrationPagesAndFields = async ({
  tx,
  eventId,
  fromInstanceId,
  toInstanceId,
  summary,
}) => {
  const pageMap = new Map();

  const pages = await tx.registrationPage.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
    include: {
      fields: {
        where: { deleted: false },
        include: { options: true },
      },
    },
  });

  for (const page of pages) {
    const newPage = await tx.registrationPage.create({
      data: {
        eventId,
        instanceId: toInstanceId,
        name: page.name,
        order: page.order,
      },
    });
    pageMap.set(page.id, newPage.id);
    summary.regPages++;

    for (const f of page.fields) {
      const newField = await tx.registrationField.create({
        data: {
          eventId,
          instanceId: toInstanceId,
          pageId: newPage.id,
          label: f.label,
          type: f.type,
          fieldType: f.fieldType,
          required: f.required,
          placeholder: f.placeholder,
          description: f.description,
          prompt: f.prompt,
          rows: f.rows,
          markdown: f.markdown,
          order: f.order,
        },
      });
      summary.regFields++;

      for (const o of f.options) {
        await tx.registrationFieldOption.create({
          data: {
            fieldId: newField.id,
            label: o.label,
            value: o.value,
            order: o.order,
          },
        });
        summary.regFieldOptions++;
      }
    }
  }

  return { pageMap };
};

