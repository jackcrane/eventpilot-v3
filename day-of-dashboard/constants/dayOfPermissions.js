export const DAY_OF_PERMISSION_TABS = Object.freeze([
  {
    permission: 'VOLUNTEER_CHECK_IN',
    name: 'volunteer',
    title: 'Volunteer',
    icon: 'person.3.fill',
    route: '/(tabs)/volunteer',
  },
  {
    permission: 'PARTICIPANT_CHECK_IN',
    name: 'registration',
    title: 'Registration',
    icon: 'checkmark.seal.fill',
    route: '/(tabs)/registration',
  },
  {
    permission: 'POINT_OF_SALE',
    name: 'point-of-sale',
    title: 'Point of Sale',
    icon: 'creditcard.fill',
    route: '/(tabs)/point-of-sale',
  },
]);

export const getDefaultRouteForPermissions = (permissions) => {
  const match = DAY_OF_PERMISSION_TABS.find((tab) =>
    permissions.includes(tab.permission)
  );
  return match?.route ?? '/(tabs)/settings';
};
