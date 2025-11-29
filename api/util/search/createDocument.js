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

const MIN_PARTIAL_LEN = 3;
const MAX_PARTIAL_LEN = 8;

const expandTokensWithPartials = (tokens) => {
  const enriched = new Set(tokens);
  for (const token of tokens) {
    if (!token) {
      continue;
    }
    const normalized = token.toLowerCase();
    if (normalized.length < MIN_PARTIAL_LEN) {
      continue;
    }
    const maxLen = Math.min(MAX_PARTIAL_LEN, normalized.length);
    for (let len = MIN_PARTIAL_LEN; len <= maxLen; len++) {
      for (let start = 0; start + len <= normalized.length; start++) {
        const slice = normalized.slice(start, start + len);
        enriched.add(slice);
      }
    }
  }
  return Array.from(enriched);
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

  const enrichedTokens = expandTokensWithPartials(searchTokens);

  let instanceId = null;
  if (config?.includeInstance !== false) {
    const instanceField = config?.instanceField ?? "instanceId";
    if (instanceField && record[instanceField]) {
      instanceId = record[instanceField];
    }
  }

  const deleted = Boolean(config?.deleted ?? record.deleted ?? false);

  return {
    id: `${resourceType}:${record.id}`,
    resourceType,
    resourceId: record.id,
    eventId: record.eventId,
    title,
    subtitle: subtitle ?? null,
    description: description ?? null,
    searchText: enrichedTokens.join(" "),
    resourceKind: config?.resourceKind ?? resourceType,
    updatedAt: new Date().toISOString(),
    deleted,
    instanceId: instanceId ?? null,
    ...(config?.extra ?? {}),
  };
}
