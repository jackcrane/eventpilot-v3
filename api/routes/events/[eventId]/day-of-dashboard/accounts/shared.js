export const accountSelect = {
  id: true,
  eventId: true,
  provisionerId: true,
  instanceId: true,
  name: true,
  permissions: true,
  tokenVersion: true,
  lastIssuedAt: true,
  deleted: true,
  createdAt: true,
  updatedAt: true,
};

export const formatAccount = (record) => ({
  ...record,
  instanceId: record.instanceId ?? null,
  name: record.name ?? null,
  permissions: Array.isArray(record.permissions)
    ? record.permissions
    : record.permissions
    ? [record.permissions].filter(Boolean)
    : [],
  deleted: Boolean(record.deleted),
  lastIssuedAt: record.lastIssuedAt ?? null,
});
