const sanitize = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : undefined;
};

const flatten = (values = []) => {
  return values.flatMap((value) => {
    if (value === undefined || value === null) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [value];
  });
};

export function createSearchDocument(resourceType, record, config) {
  if (!record?.id) {
    throw new Error(`[search] Unable to build document for ${resourceType}; missing id`);
  }
  if (!record?.eventId) {
    throw new Error(
      `[search] Unable to build document for ${resourceType}#${record.id}; missing eventId`
    );
  }

  const title = sanitize(config?.title) ?? resourceType;
  const subtitle = sanitize(config?.subtitle);
  const description = sanitize(config?.description);

  const searchTokens = flatten([
    title,
    subtitle,
    description,
    record.id,
    ...(config?.searchFields ?? []),
  ])
    .map((token) => sanitize(token))
    .filter(Boolean);

  return {
    id: `${resourceType}:${record.id}`,
    resourceType,
    resourceId: record.id,
    eventId: record.eventId,
    title,
    subtitle: subtitle ?? null,
    description: description ?? null,
    searchText: searchTokens.join(" "),
    resourceKind: config?.resourceKind ?? resourceType,
    updatedAt: new Date().toISOString(),
    ...(config?.extra ?? {}),
  };
}
