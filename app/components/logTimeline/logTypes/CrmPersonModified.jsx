// CrmPersonModified.jsx
import React from "react";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";
import { Typography } from "tabler-react-2";

// -------------------- deep diff --------------------
const IGNORED_KEYS = new Set(["createdAt", "updatedAt"]);

const isPlainObject = (v) =>
  Object.prototype.toString.call(v) === "[object Object]";
const hasIdKeyedObjects = (arr) =>
  Array.isArray(arr) &&
  arr.length > 0 &&
  arr.every((x) => isPlainObject(x) && ("id" in x || "ID" in x));
const pickId = (o) => o?.id ?? o?.ID ?? undefined;

export const diffDeep = (a, b, path = "") => {
  const changes = new Map();
  const record = (p, from, to) => {
    const lastKey = p
      .split(".")
      .pop()
      ?.replace(/\[.*\]$/, "");
    if (IGNORED_KEYS.has(lastKey)) return;
    if (from === to) return;
    changes.set(p, [from, to]);
  };

  if (Array.isArray(a) && Array.isArray(b)) {
    if (hasIdKeyedObjects(a) || hasIdKeyedObjects(b)) {
      const aMap = new Map(a.map((o) => [pickId(o), o]));
      const bMap = new Map(b.map((o) => [pickId(o), o]));
      const ids = new Set([...aMap.keys(), ...bMap.keys()]);
      for (const id of ids) {
        const av = aMap.get(id);
        const bv = bMap.get(id);
        const childPath = `${path}[id=${id}]`;
        if (av === undefined) record(childPath, undefined, bv); // created item
        else if (bv === undefined)
          record(childPath, av, undefined); // deleted item
        else
          for (const [k, v] of diffDeep(av, bv, childPath).entries())
            changes.set(k, v);
      }
    } else {
      const maxLen = Math.max(a.length, b.length);
      for (let i = 0; i < maxLen; i++) {
        const av = a[i];
        const bv = b[i];
        const childPath = `${path}[${i}]`;
        if (av === undefined) record(childPath, undefined, bv);
        else if (bv === undefined) record(childPath, av, undefined);
        else if (
          (isPlainObject(av) && isPlainObject(bv)) ||
          (Array.isArray(av) && Array.isArray(bv))
        ) {
          for (const [k, v] of diffDeep(av, bv, childPath).entries())
            changes.set(k, v);
        } else if (av !== bv) record(childPath, av, bv);
      }
    }
    return changes;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      const av = a[key];
      const bv = b[key];
      const childPath = path ? `${path}.${key}` : key;
      if (av === undefined) record(childPath, undefined, bv);
      else if (bv === undefined) record(childPath, av, undefined);
      else if (
        (isPlainObject(av) && isPlainObject(bv)) ||
        (Array.isArray(av) && Array.isArray(bv))
      ) {
        for (const [k, v] of diffDeep(av, bv, childPath).entries())
          changes.set(k, v);
      } else if (av !== bv) record(childPath, av, bv);
    }
    return changes;
  }

  if (a !== b) record(path || "(root)", a, b);
  return changes;
};

// -------------------- path helpers & formatting --------------------
const splitPath = (path) => (path ? path.match(/[^.]+/g) || [] : []);

const parseArrayToken = (token) => {
  const m = token.match(/^([^\[]+)\[id=(.+?)\]$/);
  if (!m) return { key: token, id: null };
  return { key: m[1], id: m[2] };
};

const getByPath = (root, path) => {
  if (!root || !path) return undefined;
  const parts = splitPath(path);
  let node = root;
  for (const part of parts) {
    const { key, id } = parseArrayToken(part);
    if (id != null) {
      const arr = node?.[key];
      if (!Array.isArray(arr)) return undefined;
      node = arr.find((o) => pickId(o) == id);
    } else {
      node = node?.[key];
    }
    if (node === undefined) return undefined;
  }
  return node;
};

const deriveDisplayForCollectionItem = (collectionKey, obj) => {
  if (!obj || typeof obj !== "object") return undefined;
  if (collectionKey === "emails")
    return obj.email ?? obj.address ?? obj.value ?? pickId(obj);
  if (collectionKey === "phones" || collectionKey === "phoneNumbers")
    return obj.phone ?? obj.number ?? pickId(obj);
  return obj.name ?? obj.title ?? obj.label ?? pickId(obj);
};

const prettyKey = (fullPath, before, after) => {
  const parts = splitPath(fullPath);
  if (parts.length === 0) return fullPath;

  const idxWithId = parts.findIndex((p) => /\[id=/.test(p));
  if (idxWithId !== -1) {
    const { key: collectionKey } = parseArrayToken(parts[idxWithId]);
    const parentPath = parts.slice(0, idxWithId + 1).join(".");
    const parentObj =
      getByPath(after, parentPath) ?? getByPath(before, parentPath);
    const display = deriveDisplayForCollectionItem(collectionKey, parentObj);
    const tail = parts.slice(idxWithId + 1).join(" ");
    return tail
      ? `${collectionKey} (${display ?? "…"}) ${tail}`
      : `${collectionKey} (${display ?? "…"})`;
  }

  return parts.join(" ");
};

const formatValue = (v) => {
  if (v === null || v === undefined) return <em>—</em>;
  if (typeof v === "string") return <code>{v}</code>;
  if (typeof v === "number" || typeof v === "boolean")
    return <code>{String(v)}</code>;
  try {
    const str = JSON.stringify(v);
    return (
      <code title={str}>
        {str.length > 120 ? `${str.slice(0, 117)}…` : str}
      </code>
    );
  } catch {
    return <code>[Unrenderable]</code>;
  }
};

// helpers for created/deleted semantics with empty string handling
const isEmptyLike = (v) => v === undefined || v === "";
const isCollectionItemCreateOrDelete = (path) => {
  const parts = splitPath(path);
  const idxWithId = parts.findIndex((p) => /\[id=/.test(p));
  return idxWithId !== -1 && idxWithId === parts.length - 1; // e.g., "emails[id=123]"
};

// -------------------- UI --------------------
const ChangesList = ({ before, after }) => {
  const diff = diffDeep(before || {}, after || {});
  let entries = [...diff.entries()].filter(([p]) => {
    const lastKey = p
      .split(".")
      .pop()
      ?.replace(/\[.*\]$/, "");
    return !IGNORED_KEYS.has(lastKey);
  });

  if (entries.length === 0) {
    return (
      <Typography.Text type="secondary">
        No field changes detected.
      </Typography.Text>
    );
  }

  entries.sort(([a], [b]) => a.localeCompare(b));

  return (
    <div style={{ marginTop: 6 }}>
      <Typography.Text className="mb-0">
        {entries.length} change{entries.length === 1 ? "" : "s"}:
      </Typography.Text>
      <ul style={{ margin: "6px 0 0 0px", lineHeight: 1.5 }}>
        {entries.map(([path, [fromVal, toVal]]) => {
          const label = prettyKey(path, before, after);

          // Collection item created/deleted (e.g., emails[id=…])
          if (isCollectionItemCreateOrDelete(path)) {
            if (toVal !== undefined && fromVal === undefined) {
              return (
                <li key={path} style={{ marginBottom: 2 }}>
                  <u>{label}</u>: Created
                </li>
              );
            }
            if (fromVal !== undefined && toVal === undefined) {
              return (
                <li key={path} style={{ marginBottom: 2 }}>
                  <u>{label}</u>: Deleted
                </li>
              );
            }
          }

          // Field-level created/deleted with empty string semantics
          if (isEmptyLike(fromVal) && !isEmptyLike(toVal)) {
            return (
              <li key={path} style={{ marginBottom: 2 }}>
                <u>{label}</u>: Created and set to {formatValue(toVal)}
              </li>
            );
          }
          if (!isEmptyLike(fromVal) && isEmptyLike(toVal)) {
            return (
              <li key={path} style={{ marginBottom: 2 }}>
                <u>{label}</u>: Deleted
              </li>
            );
          }

          // Standard change
          return (
            <li key={path} style={{ marginBottom: 2 }}>
              <u>{label}</u>: {formatValue(fromVal)} → {formatValue(toVal)}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const CrmPersonModified = {
  title: "CRM Person Modified",
  description: (log) => {
    const { before, after } = log?.data || {};
    return (
      <div>
        <Typography.Text className="mb-0">
          A CRM person was modified.
        </Typography.Text>
        <ChangesList before={before} after={after} />
      </div>
    );
  },
  time: (log) => moment(log.updatedAt).format(DATETIME_FORMAT),
  icon: "user",
  iconBgColor: "blue",
};
