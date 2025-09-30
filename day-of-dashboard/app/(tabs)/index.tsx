import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useDayOfSessionContext } from '@/contexts/DayOfSessionContext';
import { getDefaultRouteForPermissions } from '@/constants/dayOfPermissions';

const IndexScreen = () => {
  const { hydrated, token, permissions } = useDayOfSessionContext();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  const route = getDefaultRouteForPermissions(permissions);

  return <Redirect href={route} />;
};

export default IndexScreen;
