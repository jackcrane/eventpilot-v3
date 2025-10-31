import { useCallback, useMemo } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

import { DAY_OF_PERMISSION_TABS } from "../../constants/dayOfPermissions";
import { useDayOfSessionContext } from "../../contexts/DayOfSessionContext";
import { DayOfColors } from "../../constants/theme";
import { useTapToPay } from "../../hooks/useTapToPay";

export const SettingsScreen = () => {
  const { account, permissions, logout } = useDayOfSessionContext();
  const {
    initializeTerminal,
    initializing,
    initialized,
    discovering,
    connecting,
    connectedReader,
    connectionStatus,
    lastError,
    tapToPaySupported,
    defaultLocationId,
  } = useTapToPay();

  const tapToPayStatus = useMemo(() => {
    if (!tapToPaySupported) {
      return "Tap to Pay is not supported on this device.";
    }
    if (initializing) {
      return "Initializing Stripe Terminal…";
    }
    if (discovering || connecting) {
      return "Activating Tap to Pay…";
    }
    if (connectedReader) {
      const label =
        connectedReader.label ||
        connectedReader.serialNumber ||
        "Tap to Pay reader";
      return `Reader ready: ${label}`;
    }
    if (initialized) {
      return "Stripe Terminal is initialized on this device.";
    }
    return "Tap to Pay is not initialized yet.";
  }, [
    connecting,
    connectedReader,
    discovering,
    initialized,
    initializing,
    tapToPaySupported,
  ]);

  const handleInitializeTapToPay = useCallback(async () => {
    const result = await initializeTerminal();
    if (result?.success) {
      Alert.alert(
        "Tap to Pay initialized",
        "Stripe Terminal is ready to activate from the Point of Sale tab."
      );
      return;
    }
    const message = result?.error?.message ||
      "Unable to initialize Tap to Pay. Try again.";
    Alert.alert("Initialization failed", message);
  }, [initializeTerminal]);

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
          <Text style={styles.panelLabel}>Tap to Pay</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Status</Text>
            <Text style={styles.rowValue}>{tapToPayStatus}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Stripe location</Text>
            <Text style={styles.rowValue}>
              {defaultLocationId || "Not assigned"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Connection state</Text>
            <Text style={styles.rowValue}>
              {connectionStatus || "Not connected"}
            </Text>
          </View>

          {connectedReader ? (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Reader</Text>
                <Text style={styles.rowValue}>
                  {connectedReader.label ||
                    connectedReader.serialNumber ||
                    "Tap to Pay reader"}
                </Text>
              </View>
            </>
          ) : null}

          {lastError ? (
            <Text style={styles.errorText}>
              {lastError?.message || lastError}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={handleInitializeTapToPay}
            disabled={initializing || !tapToPaySupported}
            style={[
              styles.initializeButton,
              (initializing || !tapToPaySupported) &&
                styles.initializeButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.initializeButtonText,
                (initializing || !tapToPaySupported) &&
                  styles.initializeButtonTextDisabled,
              ]}
            >
              {initializing ? "Initializing…" : "Initialize Tap to Pay"}
            </Text>
          </TouchableOpacity>

          {!tapToPaySupported ? (
            <Text style={styles.helperText}>
              Tap to Pay requires a compatible iPhone running iOS 16.4 or
              later.
            </Text>
          ) : null}

          {tapToPaySupported && !defaultLocationId ? (
            <Text style={styles.helperText}>
              Assign a Stripe Terminal location to finish setup.
            </Text>
          ) : null}
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
  errorText: {
    fontSize: 15,
    color: DayOfColors.light.danger,
  },
  initializeButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: DayOfColors.light.primary,
  },
  initializeButtonDisabled: {
    backgroundColor: DayOfColors.light.border,
  },
  initializeButtonText: {
    color: DayOfColors.common.white,
    fontSize: 15,
    fontWeight: "600",
  },
  initializeButtonTextDisabled: {
    color: DayOfColors.light.tertiary,
  },
  helperText: {
    marginTop: 8,
    fontSize: 14,
    color: DayOfColors.light.secondary,
  },
});
