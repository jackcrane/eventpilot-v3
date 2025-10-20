import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { DayOfColors } from "../../constants/theme";
import PosKeypad from "./PosKeypad";

const SUCCESS_ICON = require("../../assets/icons/check.svg");
const ERROR_ICON = require("../../assets/icons/x.svg");

const MAX_PIN_LENGTH = 6;

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
  onSubmitPin,
  submittingPin = false,
}) => {
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!visible || status !== "pin") {
      setPin("");
    }
  }, [status, visible]);

  const maskedPin = useMemo(() => {
    if (!pin.length) {
      return "_ _ _ _";
    }
    return pin
      .split("")
      .map(() => "\u2022")
      .join(" ");
  }, [pin]);

  const icon = getIconForStatus(status);
  const amount = formatAmount(amountInCents);

  const handleClose = () => {
    if (submittingPin) {
      return;
    }
    onClose?.();
  };

  const handleRetry = () => {
    if (submittingPin) {
      return;
    }
    if (onRetry) {
      onRetry();
    } else {
      onClose?.();
    }
  };

  const handlePinKeyPress = (key) => {
    if (submittingPin) {
      return;
    }
    if (key === "clear") {
      setPin("");
      return;
    }
    if (key === "del") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (!/^\d$/.test(key)) {
      return;
    }
    setPin((prev) => {
      if (prev.length >= MAX_PIN_LENGTH) {
        return prev;
      }
      if (prev === "0") {
        return key;
      }
      return `${prev}${key}`;
    });
  };

  const handleSubmitPin = () => {
    if (submittingPin) {
      return;
    }
    if (pin.length < 4) {
      return;
    }
    onSubmitPin?.(pin);
  };

  const renderHeaderTitle = () => {
    if (status === "success") {
      return "Payment Successful";
    }
    if (status === "pin") {
      return "PIN Required";
    }
    return "Payment Declined";
  };

  const renderHeaderSubtitle = () => {
    if (status === "success") {
      return "The charge completed without issues.";
    }
    if (status === "pin") {
      return "Hand the device to the cardholder to enter their PIN.";
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
            disabled={submittingPin}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && !submittingPin ? styles.closeButtonPressed : null,
              submittingPin ? styles.closeButtonDisabled : null,
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
          {status === "pin" ? (
            <View style={styles.pinContainer}>
              <Text style={styles.pinIndicator}>{maskedPin}</Text>
              <PosKeypad
                onKeyPress={handlePinKeyPress}
                disabled={submittingPin}
              />
            </View>
          ) : null}
          {submittingPin ? (
            <View style={styles.spinnerRow}>
              <ActivityIndicator />
              <Text style={styles.spinnerText}>Submitting PIN…</Text>
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.sheetActions}>
          {status === "pin" ? (
            <>
              <ActionButton
                tone="secondary"
                label="Cancel"
                onPress={handleClose}
                disabled={submittingPin}
              />
              <ActionButton
                label="Submit PIN"
                onPress={handleSubmitPin}
                disabled={submittingPin || pin.length < 4}
              />
            </>
          ) : status === "decline" ? (
            <>
              <ActionButton
                tone="secondary"
                label="Dismiss"
                onPress={handleClose}
                disabled={submittingPin}
              />
              <ActionButton
                label="Try Again"
                onPress={handleRetry}
                disabled={submittingPin}
              />
            </>
          ) : (
            <ActionButton
              label="Done"
              onPress={handleClose}
              disabled={submittingPin}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

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
    alignItems: "center",
  },
  statusIcon: {
    width: 64,
    height: 64,
  },
  amountText: {
    fontSize: 28,
    fontWeight: "700",
    color: DayOfColors.light.text,
    textAlign: "center",
  },
  declineReason: {
    fontSize: 14,
    color: DayOfColors.light.danger,
    textAlign: "center",
  },
  pinContainer: {
    gap: 18,
  },
  pinIndicator: {
    fontSize: 32,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 8,
    color: DayOfColors.light.text,
  },
  spinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
  },
  spinnerText: {
    fontSize: 14,
    color: DayOfColors.light.secondary,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  actionButtonPrimary: {
    backgroundColor: DayOfColors.light.primary,
  },
  actionButtonSecondary: {
    backgroundColor: DayOfColors.light.gray[200],
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonPressed: {
    opacity: 0.9,
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  actionButtonLabelPrimary: {
    color: DayOfColors.common.white,
  },
  actionButtonLabelSecondary: {
    color: DayOfColors.light.text,
  },
  actionButtonLabelDisabled: {
    color: DayOfColors.light.tertiary,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: DayOfColors.light.gray[200],
  },
  closeButtonPressed: {
    opacity: 0.9,
  },
  closeButtonDisabled: {
    opacity: 0.6,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
});
