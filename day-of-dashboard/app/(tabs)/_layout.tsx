import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useDayOfSessionContext } from '@/contexts/DayOfSessionContext';
import { DAY_OF_PERMISSION_TABS } from '@/constants/dayOfPermissions';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { hydrated, token, permissions } = useDayOfSessionContext();

  const activeTabs = useMemo(
    () =>
      DAY_OF_PERMISSION_TABS.filter((tab) =>
        permissions.some((permission) => permission === tab.permission)
      ),
    [permissions]
  );

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
        </View>
      </SafeAreaView>
    );
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
        }}>
        <Tabs.Screen name="index" options={{ href: null }} />
        {activeTabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ color }) => (
                <IconSymbol size={28} name={tab.icon} color={color} />
              ),
            }}
          />
        ))}
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="gearshape.fill" color={color} />
            ),
          }}
        />
      </Tabs>
      <AccountNamePrompt />
    </SafeAreaView>
  );
}

const AccountNamePrompt = () => {
  const { requireName, setAccountName, updatingName, account } =
    useDayOfSessionContext();
  const colorScheme = useColorScheme();
  const [name, setName] = useState(account?.name ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (requireName) {
      setName('');
      setError(null);
    } else if (account?.name) {
      setName(account.name);
    }
  }, [account?.name, requireName]);

  if (!requireName) return null;

  const handleSave = async () => {
    if (!name.trim().length) {
      setError('Please enter a name for this station.');
      return;
    }
    try {
      setError(null);
      await setAccountName(name);
    } catch (savingError) {
      if (savingError instanceof Error && savingError.message) {
        setError(savingError.message);
      } else {
        setError('Unable to save. Please try again.');
      }
    }
  };

  return (
    <Modal animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            colorScheme === 'dark' ? styles.modalCardDark : undefined,
          ]}>
          <Text
            style={[
              styles.modalTitle,
              colorScheme === 'dark' ? styles.modalTitleDark : undefined,
            ]}>
            Name this station
          </Text>
          <Text
            style={[
              styles.modalSubtitle,
              colorScheme === 'dark' ? styles.modalSubtitleDark : undefined,
            ]}>
            This name helps your team identify where this dashboard is in use.
          </Text>
          <TextInput
            autoFocus
            placeholder="e.g. Volunteer Check-In 1"
            value={name}
            onChangeText={setName}
            placeholderTextColor={
              colorScheme === 'dark' ? '#9ca3af' : '#9aa0a6'
            }
            style={[
              styles.modalInput,
              colorScheme === 'dark' ? styles.modalInputDark : undefined,
            ]}
          />
          {error ? <Text style={styles.modalError}>{error}</Text> : null}
          <TouchableOpacity
            style={styles.modalButton}
            onPress={handleSave}
            disabled={updatingName}>
            {updatingName ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.modalButtonText}>Save name</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6fb',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  modalCardDark: {
    backgroundColor: '#1f1f1f',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  modalTitleDark: {
    color: '#f3f4f6',
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#5c5f62',
  },
  modalSubtitleDark: {
    color: '#a1a4aa',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#c5c9d0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalInputDark: {
    borderColor: '#3a3c40',
    backgroundColor: '#2a2b2f',
    color: '#f3f4f6',
  },
  modalError: {
    color: '#d93025',
  },
  modalButton: {
    backgroundColor: '#0077ff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
