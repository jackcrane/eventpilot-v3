import { useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DAY_OF_PERMISSION_TABS } from '../../constants/dayOfPermissions';
import { useDayOfSessionContext } from '../../contexts/DayOfSessionContext';
import { DayOfColors } from '../../constants/theme';

const SettingsScreen = () => {
  const { account, permissions, logout } = useDayOfSessionContext();

  const permissionDetails = useMemo(() => {
    return permissions.map((value) => {
      const metadata = DAY_OF_PERMISSION_TABS.find(
        (tab) => tab.permission === value
      );
      return {
        value,
        label: metadata?.title ?? value,
      };
    });
  }, [permissions]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleConfirmLogout = () => {
    Alert.alert('Log out?', 'You will return to the PIN screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: handleLogout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Station name</Text>
          <Text style={styles.sectionValue}>
            {account?.name || 'No name set'}
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account ID</Text>
          <Text style={styles.sectionValue}>{account?.id}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Event</Text>
          <Text style={styles.sectionValue}>{account?.eventId}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Permissions</Text>
          {permissionDetails.length ? (
            permissionDetails.map((permission) => (
              <Text style={styles.badge} key={permission.value}>
                {permission.label}
              </Text>
            ))
          ) : (
            <Text style={styles.sectionValue}>No permissions assigned</Text>
          )}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleConfirmLogout}>
          <Text style={styles.logoutButtonText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DayOfColors.light.bodyBg,
  },
  container: {
    padding: 24,
    gap: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: DayOfColors.common.white,
    shadowColor: DayOfColors.common.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
    color: DayOfColors.light.secondary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: '500',
    color: DayOfColors.light.text,
  },
  badge: {
    marginTop: 4,
    backgroundColor: DayOfColors.light.primaryLt,
    color: DayOfColors.light.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: DayOfColors.light.primary,
  },
  logoutButtonText: {
    color: DayOfColors.common.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
