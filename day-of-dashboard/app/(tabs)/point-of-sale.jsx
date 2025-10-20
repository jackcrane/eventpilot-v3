import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { getDefaultRouteForPermissions } from "../../constants/dayOfPermissions";
import { DayOfColors } from "../../constants/theme";
import { useDayOfSessionContext } from "../../contexts/DayOfSessionContext";
import { useTapToPay } from "../../hooks/useTapToPay";

const Button = ({ label, onPress, disabled }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.button,
      disabled ? styles.buttonDisabled : styles.buttonEnabled,
      pressed && !disabled ? styles.buttonPressed : null,
    ]}
  >
    <Text
      style={[
        styles.buttonLabel,
        disabled ? styles.buttonLabelDisabled : styles.buttonLabelEnabled,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const formatCurrency = (amount, currency) => {
  const dollars = (amount / 100).toFixed(2);
  return `${currency?.toUpperCase() ?? "USD"} ${dollars}`;
};

const PointOfSaleScreen = () => {
  const [amountInput, setAmountInput] = useState("5.00");
  const [localMessage, setLocalMessage] = useState(null);

  const { account, permissions, hydrated } = useDayOfSessionContext();

  const {
    initializeTerminal,
    startTapToPay,
    takePayment,
    initialized,
    initializing,
    discovering,
    connecting,
    processingPayment,
    connectedReader,
    connectionStatus,
    paymentStatus,
    lastError,
    resetError,
    lastPaymentIntent,
    tapToPaySupported,
    merchantDisplayName,
  } = useTapToPay();

  const hasPermission = permissions.includes("POINT_OF_SALE");

  const amountInCents = useMemo(() => {
    const normalized = amountInput.replace(/[^0-9.]/g, "");
    const parsed = Number.parseFloat(normalized);
    if (Number.isNaN(parsed)) {
      return null;
    }
    return Math.round(parsed * 100);
  }, [amountInput]);

  const handleInitialize = async () => {
    const result = await initializeTerminal();
    if (result.success) {
      setLocalMessage("Stripe Terminal is initialized.");
    } else if (result.error?.message) {
      setLocalMessage(null);
    }
  };

  const handleStartTapToPay = async () => {
    const result = await startTapToPay();
    if (result.success) {
      setLocalMessage("Tap to Pay is ready on this device.");
    } else if (result.error?.message) {
      setLocalMessage(null);
    }
  };

  const handleCollectPayment = async () => {
    if (!amountInCents || amountInCents <= 0) {
      setLocalMessage("Enter a payment amount greater than zero.");
      return;
    }
    resetError();
    const result = await takePayment({
      amount: amountInCents,
      currency: "usd",
      description: `Tap to Pay test charge - ${merchantDisplayName}`,
    });
    if (result.success) {
      setLocalMessage("Payment completed successfully.");
    } else if (result.error?.message) {
      setLocalMessage(null);
    }
  };

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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.safeArea}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Tap to Pay (Stripe Terminal)</Text>
          <Text style={styles.subtitle}>
            Logged in as {account?.name || "Unnamed Station"}
          </Text>

          {!tapToPaySupported && (
            <View style={styles.bannerWarning}>
              <Text style={styles.bannerWarningTitle}>Device not supported</Text>
              <Text style={styles.bannerWarningBody}>
                Tap to Pay on iPhone requires iOS 16.4 or later.
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Initialize</Text>
            <Text style={styles.sectionDescription}>
              Requests a Stripe Terminal connection token and prepares the SDK.
            </Text>
            <Button
              label={
                initializing
                  ? "Initializing…"
                  : initialized
                  ? "Terminal Ready"
                  : "Initialize Stripe Terminal"
              }
              disabled={initializing || initialized}
              onPress={handleInitialize}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Start Tap to Pay</Text>
            <Text style={styles.sectionDescription}>
              Discovers the on-device reader and activates Tap to Pay.
            </Text>
            <Button
              label={
                connecting
                  ? "Connecting…"
                  : discovering
                  ? "Discovering…"
                  : connectedReader
                  ? "Tap to Pay Ready"
                  : "Enable Tap to Pay"
              }
              disabled={
                !initialized ||
                discovering ||
                connecting ||
                !tapToPaySupported
              }
              onPress={handleStartTapToPay}
            />
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Connection:</Text>
              <Text style={styles.statusValue}>{connectionStatus}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Reader:</Text>
              <Text style={styles.statusValue}>
                {connectedReader?.label ||
                  connectedReader?.serialNumber ||
                  "Not connected"}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Payment state:</Text>
              <Text style={styles.statusValue}>{paymentStatus}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Accept Payment</Text>
            <Text style={styles.sectionDescription}>
              Enter an amount and collect a tap-to-pay payment.
            </Text>
            <TextInput
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="decimal-pad"
              placeholder="Amount (e.g. 5.00)"
              style={styles.input}
            />
            <Button
              label={
                processingPayment ? "Processing…" : "Collect Payment via Tap"
              }
              disabled={
                !connectedReader || processingPayment || !amountInCents
              }
              onPress={handleCollectPayment}
            />
          </View>

          {(lastError || localMessage) && (
            <View
              style={[
                styles.banner,
                lastError ? styles.bannerError : styles.bannerInfo,
              ]}
            >
              <Text style={styles.bannerTitle}>
                {lastError ? "Action needed" : "Status"}
              </Text>
              <Text style={styles.bannerBody}>
                {lastError?.message || lastError || localMessage}
              </Text>
            </View>
          )}

          {lastPaymentIntent && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Last Payment</Text>
              <Text style={styles.sectionDetail}>
                ID: {lastPaymentIntent.id}
              </Text>
              <Text style={styles.sectionDetail}>
                Amount:{" "}
                {formatCurrency(
                  lastPaymentIntent.amount,
                  lastPaymentIntent.currency
                )}
              </Text>
              <Text style={styles.sectionDetail}>
                Status: {lastPaymentIntent.status}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PointOfSaleScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DayOfColors.light.bodyBg,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 16,
    color: DayOfColors.light.secondary,
  },
  section: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sectionDescription: {
    fontSize: 14,
    color: DayOfColors.light.secondary,
  },
  sectionDetail: {
    fontSize: 14,
    color: DayOfColors.light.secondary,
  },
  input: {
    borderWidth: 1,
    borderColor: DayOfColors.light.separator,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  buttonEnabled: {
    backgroundColor: DayOfColors.light.primary,
  },
  buttonDisabled: {
    backgroundColor: DayOfColors.light.separator,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonLabelEnabled: {
    color: "#fff",
  },
  buttonLabelDisabled: {
    color: DayOfColors.light.tertiary,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusLabel: {
    fontSize: 14,
    color: DayOfColors.light.secondary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  banner: {
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  bannerInfo: {
    backgroundColor: "#E6F4FF",
  },
  bannerError: {
    backgroundColor: "#FFE6E6",
  },
  bannerWarning: {
    backgroundColor: "#FFF4E5",
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  bannerWarningTitle: {
    fontWeight: "600",
    color: "#7A3E00",
  },
  bannerWarningBody: {
    color: "#7A3E00",
    fontSize: 14,
  },
  bannerTitle: {
    fontWeight: "600",
  },
  bannerBody: {
    fontSize: 14,
  },
});
