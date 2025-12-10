import { AsyncLocalStorage } from "node:async_hooks";
import {
  solrAddDocuments,
  solrDeleteByIds,
  solrDeleteByQuery,
  solrCommit,
  isSolrConfigured,
} from "./solrClient.js";
import { SEARCH_RESOURCE_CONFIG } from "./resources.js";

const disableContext = new AsyncLocalStorage();

const chunk = (items, size = 25) => {
  const batches = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

const unique = (items) => Array.from(new Set(items));

const trackedActions = new Set([
  "create",
  "update",
  "upsert",
  "delete",
  "deleteMany",
  "updateMany",
]);

export const withSearchIndexingDisabled = (callback) =>
  disableContext.run(true, callback);

const indexingDisabled = () => Boolean(disableContext.getStore());

const getConfig = (modelName) => SEARCH_RESOURCE_CONFIG[modelName];

const resolveRequestedModels = (values) => {
  if (!values) {
    return null;
  }
  const entries = Array.isArray(values) ? values : [values];
  const normalized = entries
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  if (!normalized.length) {
    return null;
  }
  const available = Object.keys(SEARCH_RESOURCE_CONFIG);
  const matches = [];
  const unknown = [];
  for (const value of normalized) {
    const lower = value.toLowerCase();
    const bare = lower.endsWith("s") ? lower.slice(0, -1) : lower;
    const candidates = available.filter((model) => {
      const config = getConfig(model);
      const type = (config?.resourceType ?? "").toLowerCase();
      const modelLower = model.toLowerCase();
      return (
        modelLower === lower ||
        modelLower === bare ||
        type === lower ||
        type === bare
      );
    });
    if (candidates.length) {
      for (const candidate of candidates) {
        if (!matches.includes(candidate)) {
          matches.push(candidate);
        }
      }
    } else {
      unknown.push(value);
    }
  }
  if (unknown.length) {
    console.warn(`[search] No matching search models for: ${unknown.join(", ")}`);
  }
  return matches;
};

const buildResourceTypeQuery = (resourceType) => {
  if (!resourceType) {
    return null;
  }
  const escaped = String(resourceType).replace(/"/g, '\\"');
  return `resourceType:"${escaped}"`;
};

const extractIdsFromWhere = (where) => {
  if (!where) {
    return [];
  }
  if (typeof where.id === "string") {
    return [where.id];
  }
  if (where.id?.equals) {
    return [where.id.equals];
  }
  if (Array.isArray(where.id?.in)) {
    return where.id.in;
  }
  if (Array.isArray(where.id?.in?.set)) {
    return where.id.in.set;
  }
  return [];
};

const toDocIds = (config, ids) =>
  ids.map((id) => `${config.resourceType}:${id}`);

const fetchIdsForWhere = async (prisma, config, where) => {
  if (!where) {
    return [];
  }
  const rows = await withSearchIndexingDisabled(() =>
    prisma[config.client].findMany({ where, select: { id: true } })
  );
  return rows.map((row) => row.id);
};

const syncDocuments = async (prisma, config, ids) => {
  const batchedIds = chunk(unique(ids).filter(Boolean), 25);
  for (const batch of batchedIds) {
    const records = await withSearchIndexingDisabled(() =>
      prisma[config.client].findMany({
        where: { id: { in: batch } },
        include: config.include,
      })
    );
    const missing = new Set(batch);
    const docs = [];
    const stale = [];
    for (const record of records) {
      missing.delete(record.id);
      const doc = config.build(record);
      if (doc) {
        docs.push(doc);
      } else {
        stale.push(`${config.resourceType}:${record.id}`);
      }
    }
    for (const orphanId of missing) {
      stale.push(`${config.resourceType}:${orphanId}`);
    }
    if (docs.length) {
      await solrAddDocuments(docs, { commit: true });
    }
    if (stale.length) {
      await solrDeleteByIds(stale, { commit: true });
    }
  }
};

const removeDocuments = async (config, ids) => {
  const docIds = toDocIds(config, unique(ids).filter(Boolean));
  if (!docIds.length) {
    return;
  }
  await solrDeleteByIds(docIds, { commit: true });
};

const idsFromResult = (result) => {
  if (!result) {
    return [];
  }
  if (Array.isArray(result)) {
    return result.map((entry) => entry?.id).filter(Boolean);
  }
  return result.id ? [result.id] : [];
};

const determineIdsForAction = (params, result, config, preloadedIds) => {
  const ids = {
    refresh: [],
    delete: [],
  };
  switch (params.action) {
    case "create":
    case "update":
    case "upsert": {
      const resultIds = idsFromResult(result);
      if (resultIds.length) {
        ids.refresh.push(...resultIds);
        break;
      }
      ids.refresh.push(...extractIdsFromWhere(params.args?.where));
      break;
    }
    case "delete": {
      const resultIds = idsFromResult(result);
      if (resultIds.length) {
        ids.delete.push(...resultIds);
        break;
      }
      ids.delete.push(...extractIdsFromWhere(params.args?.where));
      break;
    }
    case "deleteMany": {
      ids.delete.push(...preloadedIds);
      break;
    }
    case "updateMany": {
      ids.refresh.push(...preloadedIds);
      break;
    }
    default:
      break;
  }
  return ids;
};

export const createSearchIndexMiddleware = (prisma) => {
  return async (params, next) => {
    if (indexingDisabled() || !isSolrConfigured()) {
      return next(params);
    }
    const config = getConfig(params.model);
    if (!config || !trackedActions.has(params.action)) {
      return next(params);
    }

    let preloadedIds = [];
    if (params.action === "updateMany" || params.action === "deleteMany") {
      preloadedIds = await fetchIdsForWhere(prisma, config, params.args?.where);
    }

    const result = await next(params);

    try {
      const ids = determineIdsForAction(params, result, config, preloadedIds);
      if (ids.refresh.length) {
        await syncDocuments(prisma, config, ids.refresh);
      }
      if (ids.delete.length) {
        await removeDocuments(config, ids.delete);
      }
    } catch (error) {
      console.error(
        `[search-index] Failed to sync ${params.model}.${params.action}:`,
        error
      );
    }

    return result;
  };
};

const iterateAllRecords = async (prisma, config, handler) => {
  const take = 250;
  let cursor = null;
  for (;;) {
    const query = {
      take,
      orderBy: { id: "asc" },
      include: config.include,
    };
    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }
    if (config.bulkWhere) {
      query.where = config.bulkWhere;
    }
    const batch = await withSearchIndexingDisabled(() =>
      prisma[config.client].findMany(query)
    );
    if (!batch.length) {
      break;
    }
    await handler(batch);
    cursor = batch[batch.length - 1].id;
  }
};

export const rebuildSearchIndex = async (prisma, options = {}) => {
  if (!isSolrConfigured()) {
    throw new Error("SOLR is not configured; cannot rebuild search index");
  }
  const requestedModels = resolveRequestedModels(options.models);
  const hasRequestedModels =
    Array.isArray(options.models) && options.models.length > 0
      ? true
      : Boolean(options.models);
  if (hasRequestedModels && (!requestedModels || !requestedModels.length)) {
    const original = Array.isArray(options.models)
      ? options.models.join(", ")
      : String(options.models);
    throw new Error(
      `[search] No searchable models matched: ${original || "unknown"}`
    );
  }

  const modelsToProcess =
    requestedModels && requestedModels.length
      ? requestedModels
      : Object.keys(SEARCH_RESOURCE_CONFIG);
  if (!modelsToProcess.length) {
    return {};
  }

  if (requestedModels && requestedModels.length) {
    console.log(
      `[search] Rebuilding search index for models: ${modelsToProcess.join(
        ", "
      )}`
    );
  }

  if (hasRequestedModels) {
    const resourceTypesToDelete = Array.from(
      new Set(
        modelsToProcess
          .map((model) => getConfig(model)?.resourceType)
          .filter(Boolean)
      )
    );
    for (const resourceType of resourceTypesToDelete) {
      const query = buildResourceTypeQuery(resourceType);
      if (query) {
        await solrDeleteByQuery(query);
      }
    }
  } else {
    await solrDeleteByQuery("*:*", { commit: true });
  }

  const totals = {};
  for (const model of modelsToProcess) {
    const config = getConfig(model);
    if (!config) {
      continue;
    }
    let inserted = 0;
    await iterateAllRecords(prisma, config, async (records) => {
      const docs = records
        .map((record) => config.build(record))
        .filter(Boolean);
      if (docs.length) {
        const batches = chunk(docs, 50);
        for (const batch of batches) {
          await solrAddDocuments(batch);
        }
        inserted += docs.length;
      }
    });
    totals[model] = inserted;
  }
  await solrCommit();
  return totals;
};
