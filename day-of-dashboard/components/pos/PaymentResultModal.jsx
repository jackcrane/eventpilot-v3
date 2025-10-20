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

const SUCCESS_ICON = require("../../assets/icons/check.svg");
const ERROR_ICON = require("../../assets/icons/x.svg");

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
  processing = false,
}) => {
  const icon = getIconForStatus(status);
  const amount = formatAmount(amountInCents);

  const handleClose = () => {
    if (processing) {
      return;
    }
    onClose?.();
  };

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
            disabled={processing}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && !processing ? styles.closeButtonPressed : null,
              processing ? styles.closeButtonDisabled : null,
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
