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
  event: {
    select: {
      stripeTerminalDefaultLocationId: true,
    },
  },
};

export const formatAccount = (record) => {
  const { event, ...rest } = record;

  return {
    ...rest,
    instanceId: rest.instanceId ?? null,
    name: rest.name ?? null,
    permissions: Array.isArray(rest.permissions)
      ? rest.permissions
      : rest.permissions
      ? [rest.permissions].filter(Boolean)
      : [],
    deleted: Boolean(rest.deleted),
    lastIssuedAt: rest.lastIssuedAt ?? null,
    defaultTerminalLocationId:
      event?.stripeTerminalDefaultLocationId ?? null,
  };
};
