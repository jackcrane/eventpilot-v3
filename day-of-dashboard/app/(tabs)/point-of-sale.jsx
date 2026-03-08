import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, useFocusEffect } from "expo-router";

import { getDefaultRouteForPermissions } from "../../constants/dayOfPermissions";
import { DayOfColors } from "../../constants/theme";
import { useDayOfSessionContext } from "../../contexts/DayOfSessionContext";
import { useTapToPay } from "../../hooks/useTapToPay";
import PaymentResultModal from "../../components/pos/PaymentResultModal";
import PosKeypad from "../../components/pos/PosKeypad";
import { IconSymbol } from "../../components/ui/icon-symbol";

const TAP_TO_PAY_MARKETING_COPY_ENABLED = false;

const PrimaryButton = ({ label, onPress, disabled, icon }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.primaryButton,
      disabled ? styles.primaryButtonDisabled : styles.primaryButtonEnabled,
      pressed && !disabled ? styles.primaryButtonPressed : null,
    ]}
  >
    <View style={styles.primaryButtonContent}>
      {icon ? (
        <IconSymbol
          name={icon}
          size={26}
          color={
            disabled ? DayOfColors.light.tertiary : DayOfColors.common.white
          }
          style={styles.primaryButtonIcon}
          weight="bold"
        />
      ) : null}
      <Text
        style={[
          styles.primaryButtonLabel,
          disabled
            ? styles.primaryButtonLabelDisabled
            : styles.primaryButtonLabelEnabled,
        ]}
      >
        {label}
      </Text>
    </View>
  </Pressable>
);

const PointOfSaleScreen = () => {
  const [amountDigits, setAmountDigits] = useState("0");
  const [localMessage, setLocalMessage] = useState(null);
  const [transactionModal, setTransactionModal] = useState(null);

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
    lastError,
    resetError,
    tapToPaySupported,
    merchantDisplayName,
    defaultLocationId,
  } = useTapToPay();

  const hasPermission = permissions.includes("POINT_OF_SALE");

  const amountInCents = useMemo(() => {
    const numeric = Number.parseInt(amountDigits, 10);
    if (Number.isNaN(numeric) || numeric < 0) {
      return 0;
    }
    return numeric;
  }, [amountDigits]);

  const formattedAmount = useMemo(() => {
    return (amountInCents / 100).toFixed(2);
  }, [amountInCents]);

  const handleInitialize = useCallback(
    async ({ auto = false } = {}) => {
      console.log("[POS][view] handleInitialize invoked", { auto });
      const result = await initializeTerminal();
      if (result.success) {
        setLocalMessage(auto ? null : "Stripe Terminal is initialized.");
        console.log("[POS][view] handleInitialize success", { auto });
      } else if (result.error?.message) {
        setLocalMessage(null);
        console.log("[POS][view] handleInitialize failed", {
          auto,
          error: result.error?.message ?? null,
        });
      }
      return result;
    },
    [initializeTerminal]
  );

  const handleStartTapToPay = useCallback(
    async ({ auto = false } = {}) => {
      console.log("[POS][view] handleStartTapToPay invoked", { auto });
      const result = await startTapToPay();
      if (result.success) {
        setLocalMessage(auto ? null : "Tap to Pay is ready on this device.");
        console.log("[POS][view] handleStartTapToPay success", { auto });
      } else if (result.error?.message) {
        setLocalMessage(null);
        console.log("[POS][view] handleStartTapToPay failed", {
          auto,
          error: result.error?.message ?? null,
        });
      }
      return result;
    },
    [startTapToPay]
  );

  const handleCollectPayment = useCallback(async () => {
    if (!amountInCents || amountInCents <= 0) {
      setLocalMessage("Enter a payment amount greater than zero.");
      console.log("[POS][view] handleCollectPayment blocked: invalid amount", {
        amountInCents,
      });
      return;
    }

    resetError();
    setLocalMessage(null);
    setTransactionModal(null);
    console.log("[POS][view] handleCollectPayment start", {
      amountInCents,
      merchantDisplayName,
    });

    const result = await takePayment({
      amount: amountInCents,
      currency: "usd",
      description: `Tap to Pay charge - ${merchantDisplayName}`,
    });

    if (result.success) {
      setAmountDigits("0");
      setTransactionModal({
        status: "success",
        amountInCents: result.summary?.amount ?? amountInCents,
        clientSecret: result.summary?.clientSecret ?? null,
        paymentIntentId: result.summary?.id ?? null,
      });
      resetError();
      console.log("[POS][view] handleCollectPayment success");
      return;
    }

    const declineReason =
      result.declineReason ||
      result.error?.message ||
      "Unable to process payment.";
    const amountForResult = result.summary?.amount ?? amountInCents;
    const clientSecret = result.summary?.clientSecret ?? null;

    setTransactionModal({
      status: "decline",
      amountInCents: amountForResult,
      clientSecret,
      declineReason,
      paymentIntentId: result.summary?.id ?? null,
    });
    resetError();
    console.log("[POS][view] handleCollectPayment declined", {
      declineReason,
    });
  }, [amountInCents, merchantDisplayName, resetError, takePayment]);

  const handleDismissTransactionModal = useCallback(() => {
    setTransactionModal(null);
  }, []);

  const autoInitializeAttemptedRef = useRef(false);
  const autoStartAttemptedRef = useRef(false);
  const previousReaderRef = useRef(null);
  const [focusTick, setFocusTick] = useState(0);

  const handleKeyPress = useCallback((key) => {
    setAmountDigits((prev) => {
      if (key === "clear") {
        return "0";
      }
      if (key === "del") {
        if (prev.length <= 1) {
          return "0";
        }
        return prev.slice(0, -1);
      }
      if (!/^\d$/.test(key)) {
        return prev;
      }
      if (prev.length >= 9) {
        return prev;
      }
      if (prev === "0") {
        return key;
      }
      return `${prev}${key}`;
    });
  }, []);

  const readyToCollect =
    Boolean(connectedReader) && amountInCents > 0 && !processingPayment;

  const collectLabel = useMemo(() => {
    if (processingPayment) {
      return "Processing…";
    }
    if (amountInCents > 0) {
      return `Collect $${formattedAmount}`;
    }
    return "Collect Payment";
  }, [amountInCents, formattedAmount, processingPayment]);

  const connectionSummary = useMemo(() => {
    if (!tapToPaySupported) {
      return "Tap to Pay is not supported on this device.";
    }
    if (connectedReader) {
      const label =
        connectedReader.label ||
        connectedReader.serialNumber ||
        "Tap to Pay reader";
      return `Reader ready: ${label}`;
    }
    if (initializing) {
      return "Initializing Stripe Terminal…";
    }
    if (discovering || connecting) {
      return "Activating Tap to Pay…";
    }
    if (connectionStatus && connectionStatus !== "notConnected") {
      return `Status: ${connectionStatus}`;
    }
    return "Waiting for Tap to Pay reader…";
  }, [
    connectedReader,
    connecting,
    connectionStatus,
    discovering,
    initializing,
    tapToPaySupported,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!initialized) {
        autoInitializeAttemptedRef.current = false;
        console.log("[POS][focus] reset auto initialization flag");
      }
      if (!connectedReader) {
        autoStartAttemptedRef.current = false;
        console.log("[POS][focus] reset auto start flag (no reader)");
      }
      setFocusTick((tick) => tick + 1);
    }, [connectedReader, initialized])
  );
  useEffect(() => {
    const shouldSkipAutoInit =
      autoInitializeAttemptedRef.current ||
      !hydrated ||
      initializing ||
      initialized ||
      !tapToPaySupported;
    if (shouldSkipAutoInit) {
      console.log("[POS][autoInit] skipped", {
        attempted: autoInitializeAttemptedRef.current,
        hydrated,
        initializing,
        initialized,
        tapToPaySupported,
      });
      return;
    }

    autoInitializeAttemptedRef.current = true;
    console.log("[POS][autoInit] attempting");
    (async () => {
      const result = await handleInitialize({ auto: true });
      if (!result?.success) {
        console.log("[POS][autoInit] will retry", {
          error: result?.error?.message ?? null,
        });
        autoInitializeAttemptedRef.current = false;
      }
    })();
  }, [
    focusTick,
    handleInitialize,
    hydrated,
    initializing,
    initialized,
    tapToPaySupported,
  ]);

  useEffect(() => {
    const hadReader = Boolean(previousReaderRef.current);
    const hasReader = Boolean(connectedReader);
    if (hadReader && !hasReader) {
      autoStartAttemptedRef.current = false;
      console.log("[POS][autoStart] reader disconnected, reset attempt flag");
    }
    if (hasReader) {
      autoStartAttemptedRef.current = false;
      console.log("[POS][autoStart] reader connected, reset attempt flag");
    }
    previousReaderRef.current = connectedReader;
  }, [connectedReader]);

  useEffect(() => {
    if (!defaultLocationId) {
      return;
    }
    if (!connectedReader) {
      autoStartAttemptedRef.current = false;
      console.log("[POS][autoStart] location available, reset attempt flag");
    }
    if (
      lastError &&
      `${lastError}`.toLowerCase().includes("stripe terminal address")
    ) {
      console.log("[POS][autoStart] clearing stale location error");
      resetError();
    }
  }, [connectedReader, defaultLocationId, lastError, resetError]);

  useEffect(() => {
    const shouldSkipAutoStart =
      autoStartAttemptedRef.current ||
      !hydrated ||
      !initialized ||
      discovering ||
      connecting ||
      processingPayment ||
      !tapToPaySupported ||
      connectedReader ||
      !defaultLocationId;
    if (shouldSkipAutoStart) {
      console.log("[POS][autoStart] skipped", {
        attempted: autoStartAttemptedRef.current,
        hydrated,
        initialized,
        discovering,
        connecting,
        processingPayment,
        tapToPaySupported,
        hasReader: Boolean(connectedReader),
        hasLocation: Boolean(defaultLocationId),
      });
      return;
    }

    autoStartAttemptedRef.current = true;
    console.log("[POS][autoStart] attempting");
    (async () => {
      const result = await handleStartTapToPay({ auto: true });
      if (!result?.success) {
        console.log("[POS][autoStart] will retry", {
          error: result?.error?.message ?? null,
        });
        autoStartAttemptedRef.current = false;
      }
    })();
  }, [
    connectedReader,
    connecting,
    discovering,
    focusTick,
    handleStartTapToPay,
    hydrated,
    initialized,
    processingPayment,
    defaultLocationId,
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

  if (!tapToPaySupported) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.unsupportedText}>
            Sorry, your device does not support Tap to Pay.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.topSection}>
          <View style={styles.header}>
            <Text style={styles.title}>Pay {merchantDisplayName}</Text>
            <Text style={styles.subtitle}>
              {account?.name
                ? `Station: ${account.name}`
                : "Tap to Pay station"}
            </Text>
            {connectionSummary ? (
              <Text style={styles.statusText}>{connectionSummary}</Text>
            ) : null}
            {defaultLocationId ? null : (
              <Text style={styles.statusText}>
                Stripe location not configured.
              </Text>
            )}
          </View>

          {lastError ? (
            <Text style={styles.errorText}>
              {lastError?.message || lastError}
            </Text>
          ) : localMessage ? (
            <Text style={styles.infoText}>{localMessage}</Text>
          ) : null}
          <View style={styles.amountContainer}>
            <Text style={styles.amountSymbol}>$</Text>
            <Text style={styles.amountValue}>{formattedAmount}</Text>
          </View>
        </View>
        <View style={styles.bottomSection}>
          <PosKeypad onKeyPress={handleKeyPress} />
          <PrimaryButton
            label={
              TAP_TO_PAY_MARKETING_COPY_ENABLED
                ? "Tap to Pay on iPhone"
                : collectLabel
            }
            icon={
              TAP_TO_PAY_MARKETING_COPY_ENABLED ? "wave.3.right.circle" : null
            }
            disabled={!readyToCollect}
            onPress={handleCollectPayment}
          />
        </View>
      </View>
      <PaymentResultModal
        visible={Boolean(transactionModal)}
        status={transactionModal?.status ?? null}
        amountInCents={transactionModal?.amountInCents ?? amountInCents}
        declineReason={transactionModal?.declineReason ?? null}
        onClose={handleDismissTransactionModal}
        onRetry={handleDismissTransactionModal}
        paymentIntentId={transactionModal?.paymentIntentId ?? null}
        processing={processingPayment}
      />
    </View>
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
  unsupportedText: {
    fontSize: 16,
    color: DayOfColors.light.secondary,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: "space-between",
    gap: 32,
  },
  topSection: {
    gap: 20,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: DayOfColors.light.text,
  },
  subtitle: {
    fontSize: 15,
    color: DayOfColors.light.secondary,
  },
  statusText: {
    fontSize: 14,
    color: DayOfColors.light.secondary,
  },
  errorText: {
    fontSize: 16,
    color: DayOfColors.light.danger,
  },
  infoText: {
    fontSize: 16,
    color: DayOfColors.light.success,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: DayOfColors.common.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DayOfColors.light.border,
    alignSelf: "stretch",
  },
  amountSymbol: {
    fontSize: 28,
    fontWeight: "600",
    color: DayOfColors.light.secondary,
  },
  amountValue: {
    fontSize: 56,
    fontWeight: "700",
    color: DayOfColors.light.text,
    letterSpacing: 1,
  },
  bottomSection: {
    gap: 24,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primaryButtonIcon: {
    marginBottom: 2,
  },
  primaryButtonEnabled: {
    backgroundColor: DayOfColors.light.primary,
  },
  primaryButtonDisabled: {
    backgroundColor: DayOfColors.light.border,
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonLabel: {
    fontSize: 20,
    fontWeight: "700",
  },
  primaryButtonLabelEnabled: {
    color: DayOfColors.common.white,
  },
  primaryButtonLabelDisabled: {
    color: DayOfColors.light.tertiary,
  },
});
