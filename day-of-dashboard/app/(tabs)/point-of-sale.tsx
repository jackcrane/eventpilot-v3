import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDefaultRouteForPermissions } from '@/constants/dayOfPermissions';
import { useDayOfSessionContext } from '@/contexts/DayOfSessionContext';

const PointOfSaleScreen = () => {
  const { account, permissions, hydrated } = useDayOfSessionContext();

  const hasPermission = permissions.includes('POINT_OF_SALE');

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
        <Text style={styles.title}>Point of Sale</Text>
        <Text style={styles.subtitle}>
          Configure POS for {account?.name ? account.name : 'this station'}.
        </Text>
        <Text style={styles.placeholder}>
          Integrate product selection and payment handling here.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default PointOfSaleScreen;

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
