import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDefaultRouteForPermissions } from '../../constants/dayOfPermissions';
import { useDayOfSessionContext } from '../../contexts/DayOfSessionContext';

const VolunteerScreen = () => {
  const { account, permissions, hydrated } = useDayOfSessionContext();

  const hasPermission = permissions.includes('VOLUNTEER_CHECK_IN');

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return <Redirect href={getDefaultRouteForPermissions(permissions)} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Volunteer Check-In</Text>
        <Text style={styles.subtitle}>
          {account?.name ? `${account.name}` : 'This station'} will check in volunteers here.
        </Text>
        <Text style={styles.placeholder}>
          Build volunteer workflows here. This placeholder confirms routing is working.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default VolunteerScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6fb',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: '#5c5f62',
  },
  placeholder: {
    fontSize: 14,
    color: '#7d8186',
  },
});
