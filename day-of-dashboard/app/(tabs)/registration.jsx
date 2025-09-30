import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getDefaultRouteForPermissions } from "../../constants/dayOfPermissions";
import { useDayOfSessionContext } from "../../contexts/DayOfSessionContext";
import { DayOfColors } from "../../constants/theme";
import { useParticipantRoster } from "../../hooks/useParticipantRoster";
import { useParticipantDetail } from "../../hooks/useParticipantDetail";
import { useParticipantCheckIn } from "../../hooks/useParticipantCheckIn";
import { formatDate, formatDateTimeWithoutTimeZone } from "../../utils/date";

const formatFieldValue = (value) => {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value.length ? value : "—";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => formatFieldValue(entry))
      .filter((entry) => entry && entry !== "—");
    return parts.length ? parts.join(", ") : "—";
  }
  if (typeof value === "object") {
    if (value.label) return formatFieldValue(value.label);
    return JSON.stringify(value);
  }
  return "—";
};

const ParticipantDetailModal = ({ participantId, onClose }) => {
  const { detail, fields, loading, error, refetch } =
    useParticipantDetail(participantId);
  const { updateCheckIn, updating, updateError } =
    useParticipantCheckIn(participantId);

  const [checkedIn, setCheckedIn] = useState(Boolean(detail?.checkedInAt));
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    setCheckedIn(Boolean(detail?.checkedInAt));
    setSaveError(null);
  }, [detail?.checkedInAt, participantId]);

  const hasChanges = useMemo(() => {
    return Boolean(detail) && checkedIn !== Boolean(detail.checkedInAt);
  }, [checkedIn, detail]);

  const handleSave = useCallback(async () => {
    if (!participantId) return;
    if (!detail) return;
    if (!hasChanges) return;

    try {
      setSaveError(null);
      await updateCheckIn(checkedIn);
      await refetch();
    } catch (mutationError) {
      setSaveError(
        mutationError?.message ?? "Unable to update check-in. Please try again."
      );
    }
  }, [checkedIn, detail, hasChanges, participantId, refetch, updateCheckIn]);

  const currentCheckedInAt = detail?.checkedInAt
    ? formatDateTimeWithoutTimeZone(detail.checkedInAt)
    : null;

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={Boolean(participantId)}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={styles.modalContainer}
        edges={["top", "left", "right"]}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Participant Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.modalStatus}>
            <ActivityIndicator />
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.modalStatus}>
            <Text style={styles.errorText}>
              Unable to load participant. Please try again.
            </Text>
          </View>
        ) : null}

        {!loading && !error && detail ? (
          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile</Text>
              {fields.map((field) => {
                const value =
                  detail.resolvedResponses?.[field.id] ??
                  detail.responses?.[field.id] ??
                  null;
                return (
                  <View key={field.id} style={styles.row}>
                    <Text style={styles.rowLabel}>{field.label}</Text>
                    <Text style={styles.rowValue}>
                      {formatFieldValue(value)}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Registration Summary</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Tier</Text>
                <Text style={styles.rowValue}>
                  {detail.registrationTier?.name ?? "—"}
                </Text>
              </View>
              {detail.upsells?.length ? (
                detail.upsells.map((upsell) => (
                  <View
                    key={upsell.upsellItemId ?? upsell.id}
                    style={styles.row}
                  >
                    <Text style={styles.rowLabel}>
                      {upsell.upsellItem?.name ?? "Add-on"}
                    </Text>
                    <Text style={styles.rowValue}>
                      Qty {upsell.quantity ?? 1}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.rowValue}>No add-ons selected.</Text>
              )}
            </View>

            <View style={styles.bottomSpacer} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Check-In</Text>
              <View style={styles.checkInRow}>
                <Text style={styles.checkInStatus}>
                  {checkedIn
                    ? "Participant is checked in"
                    : "Participant is not checked in"}
                </Text>
                <Switch value={checkedIn} onValueChange={setCheckedIn} />
              </View>
              {detail.checkedInBy?.name && currentCheckedInAt ? (
                <Text style={styles.checkInMeta}>
                  Last checked in by {detail.checkedInBy.name} on{" "}
                  {currentCheckedInAt}
                </Text>
              ) : null}
              {!detail.checkedInBy?.name && currentCheckedInAt ? (
                <Text style={styles.checkInMeta}>
                  Last checked in on {currentCheckedInAt}
                </Text>
              ) : null}
              {hasChanges ? (
                <Text style={styles.unsavedBanner}>
                  You have unsaved check-in changes.
                </Text>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!hasChanges || updating) && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!hasChanges || updating}
              >
                {updating ? (
                  <ActivityIndicator color={DayOfColors.common.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Check-In</Text>
                )}
              </TouchableOpacity>
              {saveError ? (
                <Text style={styles.saveError}>{saveError}</Text>
              ) : null}
              {updateError && !saveError ? (
                <Text style={styles.saveError}>
                  {updateError.message ??
                    "Unable to update check-in. Please try again."}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
};

const RegistrationScreen = () => {
  const { permissions, hydrated } = useDayOfSessionContext();
  const hasPermission = permissions.includes("PARTICIPANT_CHECK_IN");

  const [search, setSearch] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  const { participants, loading, error, refetch } = useParticipantRoster();

  const filteredParticipants = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return participants;
    return participants.filter((participant) =>
      participant.searchText.includes(term)
    );
  }, [participants, search]);

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

  const renderParticipant = ({ item }) => {
    const name = item.name?.length ? item.name : "Unnamed Participant";
    return (
      <TouchableOpacity
        style={styles.listRow}
        onPress={() => setSelectedParticipant(item.id)}
      >
        <Text style={styles.listTitle} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.listMeta}>
          Registered {formatDate(item.createdAt)}
        </Text>
        {item.email ? (
          <Text style={styles.listDetail}>{item.email}</Text>
        ) : null}
        {item.phone ? (
          <Text style={styles.listDetail}>{item.phone}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safeArea}>
      <FlatList
        data={filteredParticipants}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => refetch()} />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.listContainer,
          filteredParticipants.length === 0 && !loading
            ? styles.emptyListContainer
            : null,
        ]}
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Participants</Text>
            <Text style={styles.subtitle}>
              Search roster and tap a participant to manage their check-in.
            </Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, email, phone, or answer"
              style={styles.searchInput}
              placeholderTextColor={DayOfColors.light.tertiary}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {error ? (
              <Text style={styles.errorText}>
                Unable to load participants. Pull to refresh.
              </Text>
            ) : null}
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={renderParticipant}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No participants yet</Text>
              <Text style={styles.emptySubtitle}>
                Participants will appear here once they register.
              </Text>
            </View>
          ) : null
        }
      />
      <ParticipantDetailModal
        participantId={selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
      />
    </View>
  );
};

export default RegistrationScreen;

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
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
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
  searchInput: {
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: DayOfColors.light.gray[200],
    fontSize: 16,
    color: DayOfColors.light.text,
  },
  errorText: {
    marginTop: 8,
    color: DayOfColors.light.error,
  },
  listContainer: {
    paddingBottom: 24,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  separator: {
    height: 1,
    backgroundColor: DayOfColors.light.gray[200],
    marginHorizontal: 20,
  },
  listRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 4,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  listMeta: {
    fontSize: 14,
    color: DayOfColors.light.secondary,
  },
  listDetail: {
    fontSize: 14,
    color: DayOfColors.light.tertiary,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 8,
    flex: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    color: DayOfColors.light.secondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: DayOfColors.light.bodyBg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
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
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    padding: 20,
    gap: 24,
    paddingBottom: 40,
    flexGrow: 1,
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
  checkInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkInStatus: {
    fontSize: 16,
    fontWeight: "500",
    color: DayOfColors.light.text,
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
    marginTop: 4,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: DayOfColors.light.primary,
  },
  saveButtonDisabled: {
    backgroundColor: DayOfColors.light.gray[300],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: DayOfColors.common.white,
  },
  saveError: {
    marginTop: 8,
    color: DayOfColors.light.error,
  },
  bottomSpacer: {
    flex: 1,
  },
});
