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
      name: true,
    },
  },
  provisioner: {
    select: {
      stripeLocation: {
        select: {
          stripeLocationId: true,
        },
      },
    },
  },
};

export const formatAccount = (record) => {
  const { event, provisioner, ...rest } = record;

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
      provisioner?.stripeLocation?.stripeLocationId ?? null,
    eventName: event?.name ?? null,
  };
};
