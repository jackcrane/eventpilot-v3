import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DayOfColors } from "../../constants/theme";

const RosterDetailModal = ({
  title,
  visible,
  onClose,
  loading,
  error,
  errorText = "Unable to load details. Please try again.",
  children,
}) => {
  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={rosterDetailStyles.modalContainer}
        edges={["top", "left", "right"]}
      >
        <View style={rosterDetailStyles.modalHeader}>
          <Text style={rosterDetailStyles.modalTitle}>{title}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={rosterDetailStyles.closeButton}
          >
            <Text style={rosterDetailStyles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={rosterDetailStyles.modalStatus}>
            <ActivityIndicator />
          </View>
        ) : null}
        {!loading && error ? (
          <View style={rosterDetailStyles.modalStatus}>
            <Text style={rosterDetailStyles.errorText}>{errorText}</Text>
          </View>
        ) : null}
        {!loading && !error ? (
          <ScrollView
            contentContainerStyle={rosterDetailStyles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
};

export default RosterDetailModal;

export const rosterDetailStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: DayOfColors.light.bodyBg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DayOfColors.light.gray[200],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: DayOfColors.light.gray[200],
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  modalStatus: {
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    padding: 20,
    gap: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  errorText: {
    color: DayOfColors.light.error,
    fontSize: 14,
    textAlign: "center",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  rowValue: {
    flex: 1,
    fontSize: 14,
    textAlign: "right",
    color: DayOfColors.light.secondary,
  },
  checkInMeta: {
    fontSize: 13,
    color: DayOfColors.light.secondary,
  },
  unsavedBanner: {
    fontSize: 13,
    color: DayOfColors.light.warning,
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: DayOfColors.light.primary,
  },
  saveButtonDisabled: {
    backgroundColor: DayOfColors.light.gray[300],
  },
  saveButtonText: {
    color: DayOfColors.common.white,
    fontWeight: "600",
    fontSize: 15,
  },
  saveError: {
    marginTop: 8,
    fontSize: 12,
    color: DayOfColors.light.error,
  },
  bottomSpacer: {
    flex: 1,
  },
});
