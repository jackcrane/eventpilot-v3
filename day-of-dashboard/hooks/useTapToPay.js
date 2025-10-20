import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { useStripeTerminal } from "@stripe/stripe-terminal-react-native";

import { useDayOfSessionContext } from "../contexts/DayOfSessionContext";
import { dayOfAuthFetch, dayOfJson } from "../utils/apiClient";

const DEFAULT_MERCHANT_NAME = "EventPilot POS";
const MINIMUM_IOS_MAJOR = 16;
const MINIMUM_IOS_MINOR = 4;

export const useTapToPay = () => {
  const { account, token } = useDayOfSessionContext();
  const [connectionStatus, setConnectionStatus] = useState("notConnected");
  const [paymentStatus, setPaymentStatus] = useState("notReady");
  const [lastError, setLastError] = useState(null);
  const [initializing, setInitializing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastPaymentIntent, setLastPaymentIntent] = useState(null);
  const discoveredReadersRef = useRef([]);

  const merchantDisplayName = useMemo(() => {
    if (account?.name && account.name.trim().length > 0) {
      return account.name.trim();
    }
    return DEFAULT_MERCHANT_NAME;
  }, [account?.name]);

  const {
    initialize,
    discoverReaders,
    connectReader,
    cancelDiscovering,
    connectedReader,
    collectPaymentMethod,
    confirmPaymentIntent,
    retrievePaymentIntent,
    loading,
    discoveredReaders,
    setTapToPayUxConfiguration,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers) => {
      discoveredReadersRef.current = readers || [];
    },
    onDidChangeConnectionStatus: (status) => {
      setConnectionStatus(status);
    },
    onDidChangePaymentStatus: (status) => {
      setPaymentStatus(status);
    },
  });

  useEffect(() => {
    if (discoveredReaders) {
      discoveredReadersRef.current = discoveredReaders;
    }
  }, [discoveredReaders]);

  const ensureSessionReady = useCallback(() => {
    if (!account?.eventId || !token) {
      throw new Error("POS session is not ready yet");
    }
  }, [account?.eventId, token]);

  const isTapToPaySupported = useMemo(() => {
    if (Platform.OS !== "ios") {
      return true;
    }
    const version = Platform.Version;
    if (typeof version === "string") {
      const [majorRaw, minorRaw = "0"] = version.split(".");
      const major = Number(majorRaw);
      const minor = Number(minorRaw);
      if (Number.isNaN(major) || Number.isNaN(minor)) {
        return false;
      }
      if (major > MINIMUM_IOS_MAJOR) {
        return true;
      }
      if (major < MINIMUM_IOS_MAJOR) {
        return false;
      }
      return minor >= MINIMUM_IOS_MINOR;
    }
    if (typeof version === "number") {
      return version >= MINIMUM_IOS_MAJOR + MINIMUM_IOS_MINOR / 10;
    }
    return false;
  }, []);

  const initializeTerminal = useCallback(async () => {
    try {
      ensureSessionReady();
    } catch (error) {
      setLastError(error.message || "Unable to initialize Stripe Terminal");
      return { success: false, error };
    }

    setInitializing(true);
    setLastError(null);

    try {
      const result = await initialize({});
      if (result?.error) {
        setLastError(result.error.message || "Failed to initialize Stripe Terminal");
        return { success: false, error: result.error };
      }

      if (Platform.OS === "ios") {
        await setTapToPayUxConfiguration({
          merchantDisplayName,
        });
      }

      setInitialized(true);
      return { success: true };
    } catch (error) {
      setLastError(error?.message || "Failed to initialize Stripe Terminal");
      return { success: false, error };
    } finally {
      setInitializing(false);
    }
  }, [ensureSessionReady, initialize, merchantDisplayName, setTapToPayUxConfiguration]);

  const startTapToPay = useCallback(
    async ({ simulated = false } = {}) => {
      if (!initialized) {
        const error = new Error("Initialize Stripe Terminal before starting Tap to Pay");
        setLastError(error.message);
        return { success: false, error };
      }

      if (!isTapToPaySupported) {
        const error = new Error("Tap to Pay requires iOS 16.4 or later");
        setLastError(error.message);
        return { success: false, error };
      }

      setDiscovering(true);
      setLastError(null);

      try {
        const { error } = await discoverReaders({
          discoveryMethod: "tapToPay",
          simulated,
        });

        if (error) {
          setLastError(error.message);
          return { success: false, error };
        }

        const readers = discoveredReadersRef.current || [];
        const reader = readers[0];

        if (!reader) {
          const noReaderError = new Error(
            "No Tap to Pay reader is available on this device"
          );
          setLastError(noReaderError.message);
          return { success: false, error: noReaderError };
        }

        setConnecting(true);
        const { error: connectError, reader: connected } = await connectReader(
          {
            reader,
            merchantDisplayName,
            tosAcceptancePermitted: true,
            autoReconnectOnUnexpectedDisconnect: true,
          },
          "tapToPay"
        );

        if (connectError) {
          setLastError(connectError.message);
          return { success: false, error: connectError };
        }

        return { success: true, reader: connected };
      } catch (error) {
        setLastError(error?.message || "Failed to start Tap to Pay");
        return { success: false, error };
      } finally {
        setConnecting(false);
        setDiscovering(false);
        await cancelDiscovering().catch(() => {});
      }
    },
    [cancelDiscovering, connectReader, discoverReaders, initialized, isTapToPaySupported, merchantDisplayName]
  );

  const createPaymentIntentOnServer = useCallback(
    async ({ amount, currency = "usd", description }) => {
      ensureSessionReady();
      const response = await dayOfAuthFetch(
        `/api/events/${account.eventId}/day-of-dashboard/terminal/payment-intents`,
        { token, instanceId: account.instanceId ?? null },
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            currency,
            description,
          }),
        }
      );
      const data = await dayOfJson(response);
      if (!data?.paymentIntent?.clientSecret) {
        throw new Error("Payment intent response is missing a client secret");
      }
      return data.paymentIntent;
    },
    [account?.eventId, account?.instanceId, ensureSessionReady, token]
  );

  const takePayment = useCallback(
    async ({ amount, currency = "usd", description } = {}) => {
      if (!connectedReader) {
        const error = new Error("Connect Tap to Pay before taking a payment");
        setLastError(error.message);
        return { success: false, error };
      }

      if (amount === undefined || amount === null || Number.isNaN(amount)) {
        const error = new Error("Amount is required for tap-to-pay transactions");
        setLastError(error.message);
        return { success: false, error };
      }

      setProcessingPayment(true);
      setLastError(null);

      try {
        const paymentIntentSummary = await createPaymentIntentOnServer({
          amount,
          currency,
          description,
        });

        setLastPaymentIntent(paymentIntentSummary);

        const retrieved = await retrievePaymentIntent(
          paymentIntentSummary.clientSecret
        );

        if (retrieved.error || !retrieved.paymentIntent) {
          const intentError =
            retrieved.error ||
            new Error("Failed to retrieve the payment intent for processing");
          setLastError(intentError.message);
          return { success: false, error: intentError };
        }

        const collected = await collectPaymentMethod({
          paymentIntent: retrieved.paymentIntent,
        });

        if (collected.error) {
          setLastError(collected.error.message);
          return { success: false, error: collected.error };
        }

        const intentForConfirmation =
          collected.paymentIntent || retrieved.paymentIntent;

        const confirmed = await confirmPaymentIntent({
          paymentIntent: intentForConfirmation,
        });

        if (confirmed.error || !confirmed.paymentIntent) {
          const confirmError =
            confirmed.error ||
            new Error("Payment confirmation failed unexpectedly");
          setLastError(confirmError.message);
          return { success: false, error: confirmError };
        }

        const summary = {
          id: confirmed.paymentIntent.id,
          clientSecret:
            confirmed.paymentIntent.clientSecret ||
            paymentIntentSummary.clientSecret,
          amount: confirmed.paymentIntent.amount,
          currency: confirmed.paymentIntent.currency,
          status: confirmed.paymentIntent.status,
        };

        setLastPaymentIntent(summary);
        return { success: true, paymentIntent: confirmed.paymentIntent };
      } catch (error) {
        setLastError(error?.message || "Tap to Pay transaction failed");
        return { success: false, error };
      } finally {
        setProcessingPayment(false);
      }
    },
    [
      collectPaymentMethod,
      confirmPaymentIntent,
      connectedReader,
      createPaymentIntentOnServer,
      retrievePaymentIntent,
    ]
  );

  const resetError = useCallback(() => setLastError(null), []);

  return {
    initializeTerminal,
    startTapToPay,
    takePayment,
    resetError,
    initialized,
    initializing,
    discovering,
    connecting,
    processingPayment,
    loading,
    connectedReader,
    connectionStatus,
    paymentStatus,
    lastError,
    lastPaymentIntent,
    merchantDisplayName,
    tapToPaySupported: isTapToPaySupported,
  };
};
