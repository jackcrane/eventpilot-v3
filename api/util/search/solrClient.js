import fetch from "node-fetch";

const baseUrl = (
  process.env.SOLR_URL ?? "http://db.jackcrane.rocks:8983/solr"
).replace(/\/$/, "");
const coreName = process.env.SOLR_CORE ?? "eventpilot";
const solrConfigured = Boolean(baseUrl && coreName);

const jsonHeaders = {
  "Content-Type": "application/json",
};

const escapeValue = (value) => String(value).replace(/"/g, '\\"');

const corePath = (path = "") => `${baseUrl}/${coreName}/${path}`;

async function solrFetch(path, options = {}) {
  if (!solrConfigured) {
    throw new Error("SOLR is not configured");
  }
  const response = await fetch(corePath(path), {
    ...options,
    headers: {
      ...jsonHeaders,
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `[solr] ${response.status} ${response.statusText}: ${text}`
    );
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export const isSolrConfigured = () => solrConfigured;

export async function solrAddDocuments(documents, options = {}) {
  if (!documents?.length) {
    return;
  }
  const params = new URLSearchParams({
    wt: "json",
    commitWithin: String(options.commitWithin ?? 5000),
    overwrite: "true",
  });
  if (options.commit) {
    params.set("commit", "true");
  }
  await solrFetch(`update/json/docs?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify(documents),
  });
}

export async function solrDeleteByIds(ids, options = {}) {
  if (!ids?.length) {
    return;
  }
  const params = new URLSearchParams({
    wt: "json",
    commitWithin: String(options.commitWithin ?? 5000),
  });
  if (options.commit) {
    params.set("commit", "true");
  }
  await solrFetch(`update?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify({ delete: ids.map((id) => ({ id })) }),
  });
}

export async function solrDeleteByQuery(query, options = {}) {
  if (!query) {
    return;
  }
  const params = new URLSearchParams({
    wt: "json",
    commitWithin: String(options.commitWithin ?? 5000),
  });
  if (options.commit) {
    params.set("commit", "true");
  }
  await solrFetch(`update?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify({ delete: { query } }),
  });
}

export async function solrCommit() {
  console.log("Committing Solr changes");
  await solrFetch("update?commit=true&wt=json", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function solrSearch({ query, eventId, rows = 25 }) {
  if (!query) {
    return { docs: [], count: 0 };
  }
  const params = new URLSearchParams({
    wt: "json",
    q: query,
    rows: String(rows),
    defType: "edismax",
    qf: "title^4 subtitle^2 description^2 searchText^1",
    sort: "score desc,updatedAt desc",
  });
  if (eventId) {
    params.append("fq", `eventId:"${escapeValue(eventId)}"`);
  }
  const response = await solrFetch(`select?${params.toString()}`);
  const docs = response?.response?.docs ?? [];
  return {
    docs,
    count: response?.response?.numFound ?? docs.length,
  };
}
