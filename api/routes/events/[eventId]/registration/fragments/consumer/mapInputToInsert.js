const typesThatMapToConnect = ["DROPDOWN"];

export const mapInputToInsert = (responses, fieldTypes, registrationId) => {
  const inserts = [];

  for (const [fieldId, value] of Object.entries(responses)) {
    const fieldType = fieldTypes.find((f) => f.id === fieldId)?.type;
    if (typesThatMapToConnect.includes(fieldType)) {
      inserts.push({
        registrationId,
        fieldId,
        optionId: value,
      });
    } else {
      inserts.push({
        registrationId,
        fieldId,
        value: value.toString(),
      });
    }
  }

  return inserts;
};
