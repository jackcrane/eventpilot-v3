export const provisionerSelect = {
  id: true,
  eventId: true,
  instanceId: true,
  name: true,
  pin: true,
  permissions: true,
  jwtExpiresInSeconds: true,
  tokenVersion: true,
  deleted: true,
  lastPinGeneratedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      accounts: true,
    },
  },
};

export const formatProvisioner = (record) => {
  const { _count, ...rest } = record;
  return {
    ...rest,
    instanceId: rest.instanceId ?? null,
    name: rest.name ?? null,
    pin: rest.pin ?? null,
    deleted: Boolean(rest.deleted),
    accountCount: _count?.accounts ?? 0,
  };
};
