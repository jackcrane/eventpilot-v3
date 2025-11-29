export const collapseCrmValues = (values = []) =>
  Object.fromEntries(
    values.map(({ crmFieldId, value }) => [crmFieldId, value])
  );
