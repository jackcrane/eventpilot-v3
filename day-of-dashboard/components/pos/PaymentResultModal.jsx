import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { DayOfColors } from "../../constants/theme";
import { usePaymentIntentCrmPerson } from "../../hooks/usePaymentIntentCrmPerson";

const SUCCESS_ICON = require("../../assets/icons/check.svg");
const ERROR_ICON = require("../../assets/icons/x.svg");

const CRM_POLL_INTERVAL_MS = 1000;
const CRM_POLL_MAX_ATTEMPTS = 5;
const CRM_POLL_FAILURE_MESSAGE =
  "Unable to load customer information, but the payment was successful and you may continue";

const ActionButton = ({ label, onPress, tone = "primary", disabled }) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        tone === "primary"
          ? styles.actionButtonPrimary
          : styles.actionButtonSecondary,
        disabled ? styles.actionButtonDisabled : null,
        pressed && !disabled ? styles.actionButtonPressed : null,
      ]}
    >
      <Text
        style={[
          styles.actionButtonLabel,
          tone === "primary"
            ? styles.actionButtonLabelPrimary
            : styles.actionButtonLabelSecondary,
          disabled ? styles.actionButtonLabelDisabled : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const getIconForStatus = (status) => {
  if (status === "success") {
    return SUCCESS_ICON;
  }
  if (status === "decline") {
    return ERROR_ICON;
  }
  return null;
};

const formatAmount = (amountInCents) => {
  if (typeof amountInCents !== "number") {
    return null;
  }
  const dollars = (amountInCents / 100).toFixed(2);
  return `$${dollars}`;
};

const PaymentResultModal = ({
  visible,
  status,
  amountInCents,
  declineReason,
  onClose,
  onRetry,
  paymentIntentId,
  processing = false,
}) => {
  const crmFormRef = useRef(null);
  const [crmSaving, setCrmSaving] = useState(false);
  const [crmReady, setCrmReady] = useState(false);
  const icon = getIconForStatus(status);
  const amount = formatAmount(amountInCents);
  const closeDisabled = processing || (status === "success" && (crmSaving || !crmReady));

  const handleRetry = () => {
    if (processing) {
      return;
    }
    if (onRetry) {
      onRetry();
    } else {
      onClose?.();
    }
  };

  const handleSaveAndFinish = useCallback(async () => {
    if (processing || crmSaving || !crmReady) {
      return;
    }
    if (status === "success" && paymentIntentId) {
      try {
        const result = await crmFormRef.current?.saveAndFinish?.();
        if (result && result.success === false) {
          return;
        }
      } catch (error) {
        console.log("[POS][PaymentResultModal] saveAndFinish error", {
          message: error?.message ?? null,
        });
        return;
      }
    }
    onClose?.();
  }, [crmReady, crmSaving, onClose, paymentIntentId, processing, status]);

  useEffect(() => {
    setCrmReady(false);
  }, [paymentIntentId, status, visible]);

  const handleClose = useCallback(() => {
    if (processing) {
      return;
    }
    if (status === "success") {
      void handleSaveAndFinish();
      return;
    }
    onClose?.();
  }, [handleSaveAndFinish, onClose, processing, status]);

  const renderHeaderTitle = () => {
    if (status === "success") {
      return "Payment Successful";
    }
    return "Payment Declined";
  };

  const renderHeaderSubtitle = () => {
    if (status === "success") {
      return "The charge completed without issues.";
    }
    return "Please review the decline reason and try again.";
  };

  return (
    <Modal
      animationType="slide"
      visible={visible}
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={styles.sheetContainer}
        edges={["top", "left", "right"]}
      >
        <View style={styles.sheetHeader}>
          <View style={styles.titleGroup}>
            <Text style={styles.modalTitle}>{renderHeaderTitle()}</Text>
            <Text style={styles.modalSubtitle}>{renderHeaderSubtitle()}</Text>
          </View>
          <Pressable
            onPress={handleClose}
            disabled={closeDisabled}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && !closeDisabled ? styles.closeButtonPressed : null,
              closeDisabled ? styles.closeButtonDisabled : null,
            ]}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          {icon ? (
            <View style={styles.iconWrapper}>
              <Image source={icon} style={styles.statusIcon} />
            </View>
          ) : null}
          {amount ? <Text style={styles.amountText}>{amount}</Text> : null}
          {status === "decline" && declineReason ? (
            <Text style={styles.declineReason}>{declineReason}</Text>
          ) : null}
          {status === "success" && paymentIntentId ? (
            <CrmPersonCaptureForm
              ref={crmFormRef}
              paymentIntentId={paymentIntentId}
              onSavingChange={setCrmSaving}
              onReadyChange={setCrmReady}
            />
          ) : null}
          {processing ? (
            <View style={styles.spinnerRow}>
              <ActivityIndicator />
              <Text style={styles.spinnerText}>Processing…</Text>
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.sheetActions}>
          {status === "decline" ? (
            <>
              <ActionButton
                tone="secondary"
                label="Dismiss"
                onPress={handleClose}
                disabled={processing}
              />
              <ActionButton
                label="Try Again"
                onPress={handleRetry}
                disabled={processing}
              />
            </>
          ) : status === "success" ? (
            <ActionButton
              label={
                !crmReady ? "Loading…" : crmSaving ? "Saving…" : "Save and finish"
              }
              onPress={handleSaveAndFinish}
              disabled={processing || crmSaving || !crmReady}
            />
          ) : (
            <ActionButton
              label="Done"
              onPress={handleClose}
              disabled={processing}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const CrmPersonCaptureForm = forwardRef(
  ({ paymentIntentId, onSavingChange, onReadyChange }, ref) => {
    const {
      crmPerson,
      loading,
      validating,
      error,
      created,
      save,
      saving,
      saveError,
      refetch,
    } = usePaymentIntentCrmPerson(paymentIntentId);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [feedback, setFeedback] = useState(null);
    const [feedbackTone, setFeedbackTone] = useState("info");
    const [pollAttempts, setPollAttempts] = useState(0);
    const [pollFailedMessage, setPollFailedMessage] = useState(null);

    const crmPersonId = crmPerson?.id ?? null;

    useEffect(() => {
      if (!crmPerson) return;
      setName(crmPerson.name ?? "");
      setEmail(crmPerson.email ?? "");
      setFeedback(null);
    }, [crmPerson]);

    useEffect(() => {
      setPollAttempts(0);
      setPollFailedMessage(null);
    }, [paymentIntentId]);

    useEffect(() => {
      if (crmPerson) {
        setPollFailedMessage(null);
        setPollAttempts(0);
      }
    }, [crmPerson]);

    useEffect(() => {
      if (!paymentIntentId) return;
      if (crmPerson) return;
      if (pollFailedMessage) return;
      if (loading || validating) return;
      if (!error) return;

      if (pollAttempts >= CRM_POLL_MAX_ATTEMPTS) {
        setPollFailedMessage(CRM_POLL_FAILURE_MESSAGE);
        return;
      }

      const timer = setTimeout(() => {
        refetch();
        setPollAttempts((prev) => prev + 1);
      }, CRM_POLL_INTERVAL_MS);

      return () => clearTimeout(timer);
    }, [
      crmPerson,
      error,
      loading,
      paymentIntentId,
      pollAttempts,
      pollFailedMessage,
      refetch,
      validating,
    ]);

    const headline = useMemo(() => {
      if (created) {
        return "We added a new CRM person from this payment. Update their details below.";
      }
      if (crmPersonId) {
        return "Review and update this customer's details.";
      }
      return "Attach this payment to a customer.";
    }, [created, crmPersonId]);

    const normalizedName = useMemo(() => name.trim(), [name]);
    const normalizedEmail = useMemo(
      () => (email ? email.trim() : ""),
      [email]
    );
    const currentEmail = crmPerson?.email ?? "";
    const requiresSave = useMemo(() => {
      if (!crmPerson) {
        return false;
      }
      const baseName = crmPerson?.name ?? "";
      const baseEmail = currentEmail ?? "";
      return (
        normalizedName !== baseName ||
        normalizedEmail !== (baseEmail || "")
      );
    }, [crmPerson, currentEmail, normalizedEmail, normalizedName]);

    useEffect(() => {
      onSavingChange?.(saving);
    }, [onSavingChange, saving]);

    useEffect(() => {
      onReadyChange?.(Boolean(crmPerson) || Boolean(pollFailedMessage));
    }, [crmPerson, onReadyChange, pollFailedMessage]);

    useEffect(() => {
      if (feedback && feedbackTone === "error") {
        setFeedback(null);
      }
    }, [feedback, feedbackTone, normalizedEmail, normalizedName]);

    const handleSave = useCallback(async () => {
      if (!normalizedName.length) {
        setFeedback("Name is required.");
        setFeedbackTone("error");
        return { success: false };
      }

      const result = await save({
        name: normalizedName,
        email: normalizedEmail,
      });

      if (!result.success) {
        const message =
          result.error?.message ||
          saveError?.message ||
          "Failed to save customer details.";
        setFeedback(message);
        setFeedbackTone("error");
        return { success: false };
      }

      setFeedback("Customer details saved.");
      setFeedbackTone("success");
      return { success: true };
    }, [normalizedEmail, normalizedName, save, saveError]);

    useImperativeHandle(
      ref,
      () => ({
        async saveAndFinish() {
          if (!paymentIntentId) {
            return { success: true };
          }
          if (pollFailedMessage) {
            return { success: true };
          }
          if (!crmPerson) {
            return { success: true };
          }
          if (!requiresSave) {
            return { success: true };
          }
          return handleSave();
        },
      }),
      [crmPerson, handleSave, paymentIntentId, pollFailedMessage, requiresSave]
    );

    const showForm = Boolean(crmPerson) && !pollFailedMessage;
    const showLoadingState =
      !crmPerson &&
      !pollFailedMessage &&
      (loading || validating || Boolean(error));

    if (!paymentIntentId) {
      return null;
    }

    return (
      <View style={styles.crmSection}>
        <Text style={styles.crmTitle}>Customer details</Text>
        <Text style={styles.crmDescription}>
          {pollFailedMessage ?? headline}
        </Text>

        {showLoadingState ? (
          <View style={styles.crmLoadingRow}>
            <ActivityIndicator />
            <Text style={styles.crmLoadingText}>Loading customer information…</Text>
          </View>
        ) : null}

        {pollFailedMessage || showLoadingState ? null : (
          <>
            <View style={styles.crmFieldGroup}>
              <Text style={styles.crmLabel}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.crmInput}
                placeholder="Customer name"
                autoCapitalize="words"
                editable={!saving}
              />
            </View>
            <View style={styles.crmFieldGroup}>
              <Text style={styles.crmLabel}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.crmInput}
                placeholder="Email (optional)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!saving}
              />
            </View>
            {feedback ? (
              <Text
                style={
                  feedbackTone === "success"
                    ? styles.crmSuccessText
                    : styles.crmErrorText
                }
              >
                {feedback}
              </Text>
            ) : null}
          </>
        )}
      </View>
    );
  }
);

CrmPersonCaptureForm.displayName = "CrmPersonCaptureForm";

export default PaymentResultModal;

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
    backgroundColor: DayOfColors.light.bodyBg,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DayOfColors.light.gray[200],
  },
  titleGroup: {
    flex: 1,
    gap: 6,
    paddingRight: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: DayOfColors.light.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: DayOfColors.light.secondary,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 24,
  },
  iconWrapper: {
    alignSelf: "center",
    width: 72,
    height: 72,
  },
  statusIcon: {
    width: "100%",
    height: "100%",
  },
  amountText: {
    fontSize: 28,
    fontWeight: "700",
    color: DayOfColors.light.text,
  },
  declineReason: {
    fontSize: 16,
    color: DayOfColors.light.danger,
  },
  spinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  spinnerText: {
    fontSize: 16,
    color: DayOfColors.light.secondary,
  },
  sheetActions: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 12,
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionButtonPrimary: {
    backgroundColor: DayOfColors.light.primary,
  },
  actionButtonSecondary: {
    backgroundColor: DayOfColors.common.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DayOfColors.light.gray[300],
  },
  actionButtonDisabled: {
    opacity: 0.75,
  },
  actionButtonPressed: {
    opacity: 0.92,
  },
  actionButtonLabel: {
    fontSize: 18,
    fontWeight: "700",
  },
  actionButtonLabelPrimary: {
    color: DayOfColors.common.white,
  },
  actionButtonLabelSecondary: {
    color: DayOfColors.light.text,
  },
  actionButtonLabelDisabled: {
    color: DayOfColors.light.secondary,
  },
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeButtonDisabled: {
    opacity: 0.5,
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  closeButtonText: {
    fontSize: 16,
    color: DayOfColors.light.secondary,
  },
  crmSection: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: DayOfColors.common.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DayOfColors.light.gray[200],
    gap: 12,
  },
  crmTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  crmDescription: {
    fontSize: 14,
    color: DayOfColors.light.secondary,
  },
  crmLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crmLoadingText: {
    fontSize: 14,
    color: DayOfColors.light.secondary,
  },
  crmFieldGroup: {
    gap: 6,
  },
  crmLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: DayOfColors.light.secondary,
  },
  crmInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DayOfColors.light.gray[300],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: DayOfColors.light.text,
    backgroundColor: DayOfColors.common.white,
  },
  crmErrorText: {
    fontSize: 14,
    color: DayOfColors.light.danger,
  },
  crmSuccessText: {
    fontSize: 14,
    color: DayOfColors.light.success,
  },
});
