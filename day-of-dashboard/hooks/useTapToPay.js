import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { useStripeTerminal } from "@stripe/stripe-terminal-react-native";

import { useDayOfSessionContext } from "../contexts/DayOfSessionContext";
import { dayOfAuthFetch, dayOfJson } from "../utils/apiClient";

const DEFAULT_MERCHANT_NAME = "EventPilot POS";
const MINIMUM_IOS_MAJOR = 16;
const MINIMUM_IOS_MINOR = 4;

const summarizePaymentIntent = (intent, fallbackClientSecret = null) => {
  if (!intent) {
    return null;
  }
  return {
    id: intent.id ?? null,
    clientSecret: intent.clientSecret ?? fallbackClientSecret ?? null,
    amount:
      typeof intent.amount === "number" && Number.isFinite(intent.amount)
        ? intent.amount
        : null,
    currency: intent.currency ?? null,
    status: intent.status ?? null,
  };
};

const normalizeMessage = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const extractDeclineReason = (error, intent, fallbackError) => {
  const directMessage = normalizeMessage(error?.message);
  if (directMessage) {
    return directMessage;
  }
  if (fallbackError instanceof Error) {
    const fallbackMessage = normalizeMessage(fallbackError.message);
    if (fallbackMessage) {
      return fallbackMessage;
    }
  }
  const charges = Array.isArray(intent?.charges) ? intent.charges : [];
  const mostRecentCharge =
    charges.length > 0 ? charges[charges.length - 1] : undefined;
  const outcome = mostRecentCharge?.outcome;
  const outcomeMessages = [
    normalizeMessage(outcome?.sellerMessage),
    normalizeMessage(outcome?.networkStatus),
    normalizeMessage(outcome?.type),
  ].filter(Boolean);
  if (outcomeMessages.length > 0) {
    return outcomeMessages[0];
  }
  const receipt =
    mostRecentCharge?.paymentMethodDetails?.cardPresentDetails?.receipt;
  const receiptMessage = normalizeMessage(receipt?.transactionStatusInformation);
  if (receiptMessage) {
    return receiptMessage;
  }
  const statusMessage = normalizeMessage(intent?.status);
  if (statusMessage) {
    return statusMessage;
  }
  return null;
};

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
    const eventName =
      typeof account?.eventName === "string" ? account.eventName.trim() : "";
    if (eventName.length > 0) {
      return eventName;
    }
    if (account?.name && account.name.trim().length > 0) {
      return account.name.trim();
    }
    return DEFAULT_MERCHANT_NAME;
  }, [account?.eventName, account?.name]);
  const defaultTerminalLocationId =
    account?.defaultTerminalLocationId ?? null;

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
      console.log("[POS][useTapToPay] onUpdateDiscoveredReaders", {
        count: readers?.length ?? 0,
      });
      discoveredReadersRef.current = readers || [];
    },
    onDidChangeConnectionStatus: (status) => {
      console.log("[POS][useTapToPay] onDidChangeConnectionStatus", status);
      setConnectionStatus(status);
    },
    onDidChangePaymentStatus: (status) => {
      console.log("[POS][useTapToPay] onDidChangePaymentStatus", status);
      setPaymentStatus(status);
    },
  });

  useEffect(() => {
    if (discoveredReaders) {
      discoveredReadersRef.current = discoveredReaders;
    }
  }, [discoveredReaders]);

  useEffect(() => {
    console.log("[POS][useTapToPay] context snapshot", {
      eventId: account?.eventId ?? null,
      defaultLocationId: defaultTerminalLocationId ?? null,
      merchantDisplayName,
      hasToken: Boolean(token),
    });
  }, [account?.eventId, defaultTerminalLocationId, merchantDisplayName, token]);

  useEffect(() => {
    console.log("[POS][useTapToPay] stripeTerminal:loadingStateChanged", {
      loading,
    });
  }, [loading]);

  useEffect(() => {
    console.log("[POS][useTapToPay] lifecycle:initializationStateChanged", {
      initializing,
      initialized,
    });
  }, [initializing, initialized]);

  useEffect(() => {
    console.log("[POS][useTapToPay] lifecycle:readerDiscoveryStateChanged", {
      discovering,
      connecting,
    });
  }, [discovering, connecting]);

  useEffect(() => {
    if (!connectedReader) {
      console.log("[POS][useTapToPay] connectedReader:cleared");
      return;
    }
    console.log("[POS][useTapToPay] connectedReader:updated", {
      label: connectedReader.label ?? null,
      serialNumber: connectedReader.serialNumber ?? null,
      deviceType: connectedReader.deviceType ?? null,
      status: connectedReader.status ?? null,
    });
  }, [connectedReader]);

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
      console.log("[POS][useTapToPay] initializeTerminal:sessionError", error);
      setLastError(error.message || "Unable to initialize Stripe Terminal");
      return { success: false, error };
    }

    setInitializing(true);
    setLastError(null);

    try {
      console.log("[POS][useTapToPay] initializeTerminal:start", {
        eventId: account?.eventId ?? null,
        merchantDisplayName,
      });
      const result = await initialize({});
      console.log("[POS][useTapToPay] initializeTerminal:result", {
        hasResult: Boolean(result),
        error: result?.error?.message ?? null,
        reader: result?.reader
          ? {
              label: result.reader.label ?? null,
              serialNumber: result.reader.serialNumber ?? null,
              deviceType: result.reader.deviceType ?? null,
            }
          : null,
      });
      if (result?.error) {
        console.log("[POS][useTapToPay] initializeTerminal:error", result.error);
        setLastError(result.error.message || "Failed to initialize Stripe Terminal");
        return { success: false, error: result.error };
      }

      if (Platform.OS === "ios") {
        await setTapToPayUxConfiguration({
          merchantDisplayName,
        });
      }

      setInitialized(true);
      console.log("[POS][useTapToPay] initializeTerminal:success");
      return { success: true };
    } catch (error) {
      console.log("[POS][useTapToPay] initializeTerminal:exception", error);
      setLastError(error?.message || "Failed to initialize Stripe Terminal");
      return { success: false, error };
    } finally {
      console.log("[POS][useTapToPay] initializeTerminal:complete");
      setInitializing(false);
    }
  }, [
    ensureSessionReady,
    initialize,
    merchantDisplayName,
    setTapToPayUxConfiguration,
    account?.eventId,
  ]);

  const startTapToPay = useCallback(
    async ({ simulated = false } = {}) => {
      if (!initialized) {
        console.log("[POS][useTapToPay] startTapToPay:blocked:notInitialized");
        const error = new Error("Initialize Stripe Terminal before starting Tap to Pay");
        setLastError(error.message);
        return { success: false, error };
      }

      if (!isTapToPaySupported) {
        console.log("[POS][useTapToPay] startTapToPay:blocked:notSupported");
        const error = new Error("Tap to Pay requires iOS 16.4 or later");
        setLastError(error.message);
        return { success: false, error };
      }

      const trimmedLocationId =
        typeof defaultTerminalLocationId === "string"
          ? defaultTerminalLocationId.trim()
          : null;

      if (!trimmedLocationId) {
        console.log("[POS][useTapToPay] startTapToPay:blocked:noLocation");
        const error = new Error(
          "Assign a Stripe Terminal address before starting Tap to Pay"
        );
        setLastError(error.message);
        return { success: false, error };
      }

      console.log("[POS][useTapToPay] startTapToPay:begin", {
        locationId: trimmedLocationId,
        simulated,
      });
      setDiscovering(true);
      setLastError(null);

      try {
        const discoveryMethod = "tapToPay";
        const { error } = await discoverReaders({
          discoveryMethod,
          locationId: trimmedLocationId,
          simulated,
        });

        if (error) {
          console.log("[POS][useTapToPay] startTapToPay:discoverError", error);
          setLastError(error.message);
          return { success: false, error };
        }

        const readers = discoveredReadersRef.current || [];
        console.log("[POS][useTapToPay] startTapToPay:readers", {
          count: readers.length,
        });
        const reader = readers[0];

        if (!reader) {
          console.log("[POS][useTapToPay] startTapToPay:noReader");
          const noReaderError = new Error(
            "No Tap to Pay reader is available on this device"
          );
          setLastError(noReaderError.message);
          return { success: false, error: noReaderError };
        }

        console.log("[POS][useTapToPay] startTapToPay:connect", {
          readerLabel: reader.label ?? reader.serialNumber ?? null,
        });
        setConnecting(true);
        const { error: connectError, reader: connected } = await connectReader(
          {
            reader,
            merchantDisplayName,
            tosAcceptancePermitted: true,
            autoReconnectOnUnexpectedDisconnect: true,
            locationId: trimmedLocationId,
          },
          discoveryMethod
        );

        if (connectError) {
          console.log("[POS][useTapToPay] startTapToPay:connectError", connectError);
          setLastError(connectError.message);
          return { success: false, error: connectError };
        }

        console.log("[POS][useTapToPay] startTapToPay:success", {
          readerLabel: connected?.label ?? connected?.serialNumber ?? null,
        });
        return { success: true, reader: connected };
      } catch (error) {
        console.log("[POS][useTapToPay] startTapToPay:exception", error);
        setLastError(error?.message || "Failed to start Tap to Pay");
        return { success: false, error };
      } finally {
        setConnecting(false);
        setDiscovering(false);
        await cancelDiscovering().catch(() => {});
      }
    },
    [
      cancelDiscovering,
      connectReader,
      defaultTerminalLocationId,
      discoverReaders,
      initialized,
      isTapToPaySupported,
      merchantDisplayName,
    ]
  );

  const createPaymentIntentOnServer = useCallback(
    async ({ amount, currency = "usd", description }) => {
      ensureSessionReady();
      const payload = {
        amount,
        currency,
        description,
      };
      if (defaultTerminalLocationId) {
        payload.locationId = defaultTerminalLocationId;
      }
      const response = await dayOfAuthFetch(
        `/api/events/${account.eventId}/day-of-dashboard/terminal/payment-intents`,
        { token, instanceId: account.instanceId ?? null },
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
      const data = await dayOfJson(response);
      if (!data?.paymentIntent?.clientSecret) {
        throw new Error("Payment intent response is missing a client secret");
      }
      return data.paymentIntent;
    },
    [
      account?.eventId,
      account?.instanceId,
      defaultTerminalLocationId,
      ensureSessionReady,
      token,
    ]
  );

  const processPaymentIntent = useCallback(
    async ({ paymentIntent, clientSecret }) => {
      if (!paymentIntent) {
        const error = new Error("Payment intent is required for processing");
        return {
          success: false,
          error,
          paymentIntent: null,
          summary: null,
          declineReason: error.message,
        };
      }

      const summaryForState = summarizePaymentIntent(
        paymentIntent,
        clientSecret
      );

      const collected = await collectPaymentMethod({
        paymentIntent,
      });

      if (collected.error) {
        const normalizedError =
          collected.error instanceof Error
            ? collected.error
            : new Error(collected.error?.message || "Tap to Pay transaction failed");
        const intentAfterCollect =
          collected.paymentIntent || paymentIntent;
        const summaryAfterCollect = summarizePaymentIntent(
          intentAfterCollect,
          summaryForState?.clientSecret
        );
        if (summaryAfterCollect) {
          setLastPaymentIntent(summaryAfterCollect);
        }
        return {
          success: false,
          error: normalizedError,
          paymentIntent: intentAfterCollect,
          summary: summaryAfterCollect,
          declineReason: extractDeclineReason(
            collected.error,
            intentAfterCollect,
            normalizedError
          ),
        };
      }

      const intentForConfirmation =
        collected.paymentIntent || paymentIntent;
      const confirmed = await confirmPaymentIntent({
        paymentIntent: intentForConfirmation,
      });

      if (confirmed.error || !confirmed.paymentIntent) {
        const normalizedError =
          confirmed.error instanceof Error
            ? confirmed.error
            : new Error(
                confirmed.error?.message ||
                  "Payment confirmation failed unexpectedly"
              );
        const intentAfterConfirm =
          confirmed.paymentIntent || intentForConfirmation;
        const summaryAfterConfirm = summarizePaymentIntent(
          intentAfterConfirm,
          summaryForState?.clientSecret
        );
        if (summaryAfterConfirm) {
          setLastPaymentIntent(summaryAfterConfirm);
        }
        return {
          success: false,
          error: normalizedError,
          paymentIntent: intentAfterConfirm,
          summary: summaryAfterConfirm,
          declineReason: extractDeclineReason(
            confirmed.error,
            intentAfterConfirm,
            normalizedError
          ),
        };
      }

      const summaryAfterConfirm = summarizePaymentIntent(
        confirmed.paymentIntent,
        summaryForState?.clientSecret
      );
      if (summaryAfterConfirm) {
        setLastPaymentIntent(summaryAfterConfirm);
      }
      return {
        success: true,
        paymentIntent: confirmed.paymentIntent,
        summary: summaryAfterConfirm,
      };
    },
    [collectPaymentMethod, confirmPaymentIntent]
  );

  const takePayment = useCallback(
    async ({ amount, currency = "usd", description } = {}) => {
      if (!connectedReader) {
        console.log("[POS][useTapToPay] takePayment:blocked:noReader");
        const error = new Error("Connect Tap to Pay before taking a payment");
        setLastError(error.message);
        return { success: false, error };
      }

      if (amount === undefined || amount === null || Number.isNaN(amount)) {
        console.log("[POS][useTapToPay] takePayment:blocked:invalidAmount", {
          amount,
        });
        const error = new Error("Amount is required for tap-to-pay transactions");
        setLastError(error.message);
        return { success: false, error };
      }

      setProcessingPayment(true);
      setLastError(null);
      console.log("[POS][useTapToPay] takePayment:start", {
        amount,
        currency,
        description,
      });

      try {
        const paymentIntentSummary = await createPaymentIntentOnServer({
          amount,
          currency,
          description,
        });

        setLastPaymentIntent(paymentIntentSummary);
        console.log("[POS][useTapToPay] takePayment:paymentIntentCreated", {
          id: paymentIntentSummary.id,
        });

        const clientSecret = paymentIntentSummary.clientSecret;

        const retrieved = await retrievePaymentIntent(
          paymentIntentSummary.clientSecret
        );

        if (retrieved.error || !retrieved.paymentIntent) {
          console.log("[POS][useTapToPay] takePayment:retrieveError", retrieved.error);
          const intentError =
            retrieved.error ||
            new Error("Failed to retrieve the payment intent for processing");
          setLastError(intentError.message);
          return { success: false, error: intentError };
        }

        const processResult = await processPaymentIntent({
          paymentIntent: retrieved.paymentIntent,
          clientSecret,
        });

        if (!processResult.success) {
          console.log("[POS][useTapToPay] takePayment:processError", {
            message: processResult.error?.message ?? null,
          });
          if (processResult.error) {
            setLastError(processResult.error.message);
          }
          return processResult;
        }

        console.log("[POS][useTapToPay] takePayment:success", processResult.summary);
        return processResult;
      } catch (error) {
        console.log("[POS][useTapToPay] takePayment:exception", error);
        setLastError(error?.message || "Tap to Pay transaction failed");
        return {
          success: false,
          error,
          paymentIntent: null,
          summary: null,
          declineReason: extractDeclineReason(error, null, error),
        };
      } finally {
        setProcessingPayment(false);
        console.log("[POS][useTapToPay] takePayment:finished");
      }
    },
    [
      processPaymentIntent,
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
    defaultLocationId: defaultTerminalLocationId,
    tapToPaySupported: isTapToPaySupported,
  };
};
