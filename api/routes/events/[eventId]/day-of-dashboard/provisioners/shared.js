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
  instance: {
    select: {
      id: true,
      name: true,
      startTime: true,
      endTime: true,
      startTimeTz: true,
      endTimeTz: true,
    },
  },
  stripeLocation: {
    select: {
      id: true,
      nickname: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      stripeLocationId: true,
    },
  },
  _count: {
    select: {
      accounts: {
        where: {
          deleted: false,
        },
      },
    },
  },
};

export const formatProvisioner = (record) => {
  const { _count, stripeLocation, instance, ...rest } = record;
  return {
    ...rest,
    instanceId: rest.instanceId,
    instance: instance
      ? {
          id: instance.id,
          name: instance.name,
          startTime: instance.startTime?.toISOString() ?? null,
          endTime: instance.endTime?.toISOString() ?? null,
          startTimeTz: instance.startTimeTz ?? null,
          endTimeTz: instance.endTimeTz ?? null,
        }
      : null,
    name: rest.name ?? null,
    pin: rest.pin ?? null,
    deleted: Boolean(rest.deleted),
    accountCount: _count?.accounts ?? 0,
    stripeLocation: stripeLocation
      ? {
          ...stripeLocation,
          nickname: stripeLocation.nickname ?? null,
          addressLine2: stripeLocation.addressLine2 ?? null,
        }
      : null,
  };
};
