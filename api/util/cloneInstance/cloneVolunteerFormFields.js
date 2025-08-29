export const cloneVolunteerFormFields = async ({
  tx,
  eventId,
  fromInstanceId,
  toInstanceId,
  summary,
}) => {
  const fields = await tx.formField.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
    include: { options: true },
  });

  for (const f of fields) {
    const newF = await tx.formField.create({
      data: {
        type: f.type,
        label: f.label,
        placeholder: f.placeholder,
        description: f.description,
        required: f.required,
        defaultValue: f.defaultValue,
        prompt: f.prompt,
        order: f.order,
        eventpilotFieldType: f.eventpilotFieldType,
        autocompleteType: f.autocompleteType,
        eventId,
        instanceId: toInstanceId,
      },
    });
    summary.formFields++;

    for (const o of f.options) {
      await tx.formFieldOption.create({
        data: {
          fieldId: newF.id,
          label: o.label,
          order: o.order,
        },
      });
      summary.formFieldOptions++;
    }
  }
};

