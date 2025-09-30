import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Switch,
} from "react-native";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { getDefaultRouteForPermissions } from "../../constants/dayOfPermissions";
import { DayOfColors } from "../../constants/theme";
import { useDayOfSessionContext } from "../../contexts/DayOfSessionContext";
import { useVolunteerRoster } from "../../hooks/useVolunteerRoster";
import { useVolunteerDetail } from "../../hooks/useVolunteerDetail";
import { useVolunteerShiftCheckins } from "../../hooks/useVolunteerShiftCheckins";
import {
  formatDate,
  formatDateTimeWithoutTimeZone,
  formatShiftRange,
} from "../../utils/date";

const VolunteerDetailModal = ({ volunteerId, onClose }) => {
  const { detail, loading, error, refetch } = useVolunteerDetail(volunteerId);
  const { updateCheckIns, updating, updateError } =
    useVolunteerShiftCheckins(volunteerId);
  const [checkState, setCheckState] = useState({});
  const [saveError, setSaveError] = useState(null);

  const initialState = useMemo(() => {
    if (!detail?.shifts?.length) return {};
    const next = {};
    for (const shift of detail.shifts) {
      next[shift.id] = Boolean(shift.checkedInAt);
    }
    return next;
  }, [detail?.shifts]);

  useEffect(() => {
    setCheckState({ ...initialState });
    setSaveError(null);
  }, [initialState, volunteerId]);

  const toggleShift = useCallback((shiftId, value) => {
    setCheckState((prev) => ({ ...prev, [shiftId]: value }));
  }, []);

  const hasChanges = useMemo(() => {
    const shiftIds = Object.keys(initialState);
    if (!shiftIds.length) return false;
    return shiftIds.some((id) => {
      const initialValue = Boolean(initialState[id]);
      const currentValue = Boolean(checkState[id]);
      return initialValue !== currentValue;
    });
  }, [checkState, initialState]);

  const hasAssignedShifts = Boolean(detail?.groupedShifts?.length);
  const totalShiftCount = detail?.shifts?.length ?? 0;

  const handleSave = useCallback(async () => {
    if (!detail?.shifts?.length) return;
    const payload = detail.shifts
      .map((shift) => ({
        shiftId: shift.id,
        checkedIn: Boolean(checkState[shift.id]),
        initial: Boolean(initialState[shift.id]),
      }))
      .filter((item) => item.checkedIn !== item.initial)
      .map((item) => ({
        shiftId: item.shiftId,
        checkedIn: item.checkedIn,
      }));

    if (!payload.length) return;

    try {
      setSaveError(null);
      await updateCheckIns(payload);
      await refetch();
    } catch (e) {
      setSaveError(e?.message ?? "Unable to update check-ins.");
    }
  }, [checkState, detail?.shifts, initialState, refetch, updateCheckIns]);

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={Boolean(volunteerId)}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={styles.modalContainer}
        edges={["top", "left", "right"]}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Volunteer Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
        {loading && (
          <View style={styles.modalStatus}>
            <ActivityIndicator />
          </View>
        )}
        {!loading && error && (
          <View style={styles.modalStatus}>
            <Text style={styles.errorText}>
              Unable to load volunteer. Please try again.
            </Text>
          </View>
        )}
        {!loading && !error && detail && (
          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile</Text>
              {detail.fields.map((field) => {
                const value = detail.response[field.id];
                const displayValue =
                  typeof value === "string"
                    ? value
                    : value?.label ?? value ?? "—";
                return (
                  <View key={field.id} style={styles.row}>
                    <Text style={styles.rowLabel}>{field.label}</Text>
                    <Text style={styles.rowValue}>
                      {displayValue?.toString()?.length ? displayValue : "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assigned Shifts</Text>
              {hasAssignedShifts ? (
                detail.groupedShifts?.map((location) => (
                  <View key={location.id} style={styles.shiftGroup}>
                    <Text style={styles.locationTitle}>{location.name}</Text>
                    {location.jobs.map((job) => (
                      <View key={job.id} style={styles.jobGroup}>
                        <Text style={styles.jobTitle}>{job.name}</Text>
                        {job.shifts.map((shift) => {
                          const current = Boolean(
                            checkState[shift.id] ?? initialState[shift.id]
                          );
                          const initialValue = Boolean(initialState[shift.id]);
                          const dirty = current !== initialValue;
                          const isCheckedIn = current;
                          const shiftRange = formatShiftRange({
                            startTime: shift.startTime,
                            endTime: shift.endTime,
                            startTimeTz: shift.startTimeTz,
                            endTimeTz: shift.endTimeTz,
                          });
                          return (
                            <View key={shift.id} style={styles.shiftItemRow}>
                              <View style={styles.shiftInfo}>
                                <Text style={styles.shiftItemLabel}>
                                  {shiftRange}
                                </Text>
                                <Text
                                  style={
                                    isCheckedIn
                                      ? styles.shiftCheckedInText
                                      : styles.shiftNotCheckedInText
                                  }
                                >
                                  {isCheckedIn
                                    ? "Checked in"
                                    : "Not checked in"}
                                  {dirty ? " (unsaved)" : ""}
                                </Text>
                                {shift.checkedInAt ? (
                                  <Text style={styles.checkInMeta}>
                                    {shift.checkedInBy?.name
                                      ? `Last checked in by ${shift.checkedInBy.name}`
                                      : "Last checked in"}{" "}
                                    {formatDateTimeWithoutTimeZone(
                                      shift.checkedInAt
                                    )}
                                  </Text>
                                ) : null}
                              </View>
                              <Switch
                                value={current}
                                onValueChange={(value) =>
                                  toggleShift(shift.id, value)
                                }
                              />
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={styles.checkInMeta}>
                  This volunteer has no assigned shifts yet.
                </Text>
              )}
            </View>

            <View style={styles.bottomSpacer} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Check-In</Text>
              <Text style={styles.checkInMeta}>
                {totalShiftCount
                  ? "Toggle each shift above and save to capture attendance."
                  : "Assign shifts to enable check-in tracking for this volunteer."}
              </Text>
              {hasChanges ? (
                <Text style={styles.unsavedBanner}>
                  You have unsaved check-in changes.
                </Text>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (totalShiftCount === 0 || !hasChanges || updating) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={totalShiftCount === 0 || !hasChanges || updating}
              >
                {updating ? (
                  <ActivityIndicator color={DayOfColors.common.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Check-Ins</Text>
                )}
              </TouchableOpacity>
              {saveError ? (
                <Text style={styles.saveError}>{saveError}</Text>
              ) : null}
              {updateError && !saveError ? (
                <Text style={styles.saveError}>
                  {updateError.message ??
                    "Unable to update shifts. Please try again."}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const VolunteerScreen = () => {
  const { permissions, hydrated } = useDayOfSessionContext();
  const hasPermission = permissions.includes("VOLUNTEER_CHECK_IN");
  const [search, setSearch] = useState("");
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const { volunteers, loading, error, refetch } = useVolunteerRoster();

  const filteredVolunteers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return volunteers;
    return volunteers.filter((volunteer) =>
      volunteer.searchText.includes(term)
    );
  }, [search, volunteers]);

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

  const renderVolunteer = ({ item }) => (
    <TouchableOpacity
      style={styles.listRow}
      onPress={() => setSelectedVolunteer(item.id)}
    >
      <Text style={styles.listTitle} numberOfLines={1}>
        {item.name?.length ? item.name : "Unnamed Volunteer"}
      </Text>
      <Text style={styles.listMeta}>
        Registered {formatDate(item.createdAt)}
      </Text>
      {item.email ? <Text style={styles.listDetail}>{item.email}</Text> : null}
      {item.phone ? <Text style={styles.listDetail}>{item.phone}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.safeArea}>
      <FlatList
        data={filteredVolunteers}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => refetch()} />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        // Make the list fill the screen and allow scrolling even with few items
        contentContainerStyle={[
          styles.listContainer,
          filteredVolunteers.length === 0 && !loading
            ? styles.emptyListContainer
            : null,
        ]}
        // Helpful UX tweaks for both platforms
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Volunteers</Text>
            <Text style={styles.subtitle}>
              Search roster and tap a volunteer to view their full registration.
            </Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, email, phone, or answer"
              style={styles.searchInput}
              placeholderTextColor={DayOfColors.light.tertiary}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="always"
            />
            {error ? (
              <Text style={styles.errorText}>
                Unable to load volunteers. Pull to refresh.
              </Text>
            ) : null}
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={renderVolunteer}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No volunteers yet</Text>
              <Text style={styles.emptySubtitle}>
                Volunteers will appear here once they register.
              </Text>
            </View>
          ) : null
        }
      />
      <VolunteerDetailModal
        volunteerId={selectedVolunteer}
        onClose={() => setSelectedVolunteer(null)}
      />
    </View>
  );
};

export default VolunteerScreen;

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
    color: DayOfColors.light.error,
    fontSize: 14,
    marginTop: 8,
  },
  // Ensures FlatList fills screen and stays scrollable
  listContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  // When empty, keep full height so pull-to-refresh/bounce still works
  emptyListContainer: {
    justifyContent: "center",
  },
  listRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: DayOfColors.common.white,
    gap: 4,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  listMeta: {
    fontSize: 13,
    color: DayOfColors.light.tertiary,
  },
  listDetail: {
    fontSize: 14,
    color: DayOfColors.light.secondary,
  },
  separator: {
    marginLeft: 20,
    height: StyleSheet.hairlineWidth,
    backgroundColor: DayOfColors.light.border,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 32,
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
    color: DayOfColors.light.secondary,
    textAlign: "center",
  },
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
  shiftGroup: {
    gap: 12,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  jobGroup: {
    paddingLeft: 8,
    gap: 8,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: DayOfColors.light.secondary,
  },
  shiftItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 16,
  },
  shiftInfo: {
    flex: 1,
    gap: 4,
  },
  shiftItemLabel: {
    fontSize: 13,
    color: DayOfColors.light.text,
    fontWeight: "500",
  },
  shiftCheckedInText: {
    fontSize: 13,
    color: DayOfColors.light.success,
  },
  shiftNotCheckedInText: {
    fontSize: 13,
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
