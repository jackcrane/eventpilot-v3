import { useEffect, useMemo, useRef, useState } from "react";
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
    loading,
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

  const autoInitializeAttemptedRef = useRef(false);
  useEffect(() => {
    if (
      autoInitializeAttemptedRef.current ||
      !hydrated ||
      initializing ||
      initialized ||
      loading ||
      !tapToPaySupported
    ) {
      return;
    }

    autoInitializeAttemptedRef.current = true;
    handleInitialize();
  }, [
    handleInitialize,
    hydrated,
    initializing,
    initialized,
    loading,
    tapToPaySupported,
  ]);

  const autoStartAttemptedRef = useRef(false);
  useEffect(() => {
    if (
      autoStartAttemptedRef.current ||
      !hydrated ||
      !initialized ||
      discovering ||
      connecting ||
      processingPayment ||
      !tapToPaySupported ||
      connectedReader
    ) {
      return;
    }

    autoStartAttemptedRef.current = true;
    handleStartTapToPay();
  }, [
    connectedReader,
    connecting,
    discovering,
    handleStartTapToPay,
    hydrated,
    initialized,
    processingPayment,
    tapToPaySupported,
  ]);

  if (!hydrated) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.centerContent}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  if (!hasPermission) {
    return <Redirect href={getDefaultRouteForPermissions(permissions)} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        overScrollMode="always"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Tap to Pay (Stripe Terminal)</Text>
          <Text style={styles.subtitle}>
            Logged in as {account?.name || "Unnamed Station"}
          </Text>
        </View>

        {!tapToPaySupported && (
          <View style={styles.bannerWarning}>
            <Text style={styles.bannerWarningTitle}>Device not supported</Text>
            <Text style={styles.bannerWarningBody}>
              Tap to Pay on iPhone requires iOS 16.4 or later.
            </Text>
          </View>
        )}

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

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Setup</Text>

          <View style={styles.panelSection}>
            <Text style={styles.sectionTitle}>Initialize Stripe Terminal</Text>
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

          <View style={styles.divider} />

          <View style={styles.panelSection}>
            <Text style={styles.sectionTitle}>Enable Tap to Pay</Text>
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

            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Connection</Text>
                <Text style={styles.statusValue}>{connectionStatus}</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Reader</Text>
                <Text style={styles.statusValue}>
                  {connectedReader?.label ||
                    connectedReader?.serialNumber ||
                    "Not connected"}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Payment state</Text>
                <Text style={styles.statusValue}>{paymentStatus}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Collect payment</Text>

          <View style={styles.panelSection}>
            <Text style={styles.sectionTitle}>Amount</Text>
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
        </View>

        {lastPaymentIntent && (
          <View style={styles.panel}>
            <Text style={styles.panelLabel}>Recent payment</Text>
            <View style={styles.panelSection}>
              <Text style={styles.sectionDetail}>
                ID · {lastPaymentIntent.id}
              </Text>
              <Text style={styles.sectionDetail}>
                Amount ·{" "}
                {formatCurrency(
                  lastPaymentIntent.amount,
                  lastPaymentIntent.currency
                )}
              </Text>
              <Text style={styles.sectionDetail}>
                Status · {lastPaymentIntent.status}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: 16,
    gap: 20,
    flexGrow: 1,
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
  panelSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  sectionDescription: {
    fontSize: 15,
    color: DayOfColors.light.secondary,
    lineHeight: 20,
  },
  sectionDetail: {
    fontSize: 15,
    color: DayOfColors.light.secondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DayOfColors.light.border,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DayOfColors.light.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: DayOfColors.common.white,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonEnabled: {
    backgroundColor: DayOfColors.light.primary,
  },
  buttonDisabled: {
    backgroundColor: DayOfColors.light.border,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonLabelEnabled: {
    color: DayOfColors.common.white,
  },
  buttonLabelDisabled: {
    color: DayOfColors.light.tertiary,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statusItem: {
    flexBasis: "48%",
    gap: 4,
  },
  statusLabel: {
    fontSize: 13,
    color: DayOfColors.light.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "500",
    color: DayOfColors.light.text,
  },
  banner: {
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DayOfColors.light.border,
    backgroundColor: DayOfColors.common.white,
  },
  bannerInfo: {
    backgroundColor: DayOfColors.light.primaryLt,
  },
  bannerError: {
    backgroundColor: DayOfColors.light.dangerLt,
    borderColor: DayOfColors.light.danger,
  },
  bannerWarning: {
    backgroundColor: DayOfColors.light.warningLt,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DayOfColors.light.warning,
  },
  bannerWarningTitle: {
    fontWeight: "600",
    color: DayOfColors.light.warning,
  },
  bannerWarningBody: {
    color: DayOfColors.light.text,
    fontSize: 15,
  },
  bannerTitle: {
    fontWeight: "600",
    fontSize: 16,
    color: DayOfColors.light.text,
  },
  bannerBody: {
    fontSize: 15,
    color: DayOfColors.light.text,
  },
});
