import { useMemo } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { DAY_OF_PERMISSION_TABS } from "../../constants/dayOfPermissions";
import { useDayOfSessionContext } from "../../contexts/DayOfSessionContext";
import { DayOfColors } from "../../constants/theme";

export const SettingsScreen = () => {
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
    router.replace("/login");
  };

  const handleConfirmLogout = () => {
    Alert.alert("Log out?", "You will return to the PIN screen.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: handleLogout },
    ]);
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        alwaysBounceVertical
        overScrollMode="always"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Manage this station, view account details, and update access if
            needed.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Station</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Station name</Text>
            <Text style={styles.rowValue}>
              {account?.name || "No name set"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Account ID</Text>
            <Text style={styles.rowValue}>{account?.id ?? "—"}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Event</Text>
            <Text style={styles.rowValue}>{account?.eventId ?? "—"}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Permissions</Text>
          {permissionDetails.length ? (
            <View style={styles.chipGroup}>
              {permissionDetails.map((permission) => (
                <Text key={permission.value} style={styles.chip}>
                  {permission.label}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No permissions assigned</Text>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleConfirmLogout}
          >
            <Text style={styles.logoutButtonText}>Log out</Text>
          </TouchableOpacity>
        </View>

        {/* bottom padding to match spacing feel under scrollable content */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  // Mirrors the Volunteer screen spacing & background (safe area is inherited from rosterListStyles.safeArea)
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 20,
    flexGrow: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: DayOfColors.light.bodyBg,
  },

  header: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  subtitle: {
    fontSize: 15,
    color: DayOfColors.light.secondary,
  },

  panel: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: DayOfColors.common.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DayOfColors.light.border,
    gap: 16,
  },
  panelLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: DayOfColors.light.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  row: {
    gap: 4,
  },
  rowLabel: {
    fontSize: 13,
    color: DayOfColors.light.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  rowValue: {
    fontSize: 17,
    fontWeight: "500",
    color: DayOfColors.light.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DayOfColors.light.border,
  },

  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: DayOfColors.light.primaryLt,
    color: DayOfColors.light.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 15,
    color: DayOfColors.light.secondary,
  },

  actions: {
    // aligns with panel edges since container has horizontal padding
  },
  logoutButton: {
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: DayOfColors.light.primary,
  },
  logoutButtonText: {
    color: DayOfColors.common.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
