import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
import RosterList, {
  rosterListStyles,
} from "../../components/roster/RosterList";
import RosterDetailModal, {
  rosterDetailStyles,
} from "../../components/roster/RosterDetailModal";

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
    <RosterDetailModal
      title="Volunteer Details"
      visible={Boolean(volunteerId)}
      onClose={onClose}
      loading={loading}
      error={error}
      errorText="Unable to load volunteer. Please try again."
    >
      {detail ? (
        <>
          <View style={rosterDetailStyles.section}>
            <Text style={rosterDetailStyles.sectionTitle}>Profile</Text>
            {detail.fields.map((field) => {
              const value = detail.response[field.id];
              const displayValue =
                typeof value === "string"
                  ? value
                  : value?.label ?? value ?? "—";
              return (
                <View key={field.id} style={rosterDetailStyles.row}>
                  <Text style={rosterDetailStyles.rowLabel}>{field.label}</Text>
                  <Text style={rosterDetailStyles.rowValue}>
                    {displayValue?.toString()?.length ? displayValue : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={rosterDetailStyles.section}>
            <Text style={rosterDetailStyles.sectionTitle}>Assigned Shifts</Text>
            {hasAssignedShifts ? (
              detail.groupedShifts?.map((location) => (
                <View key={location.id} style={volunteerStyles.shiftGroup}>
                  <Text style={volunteerStyles.locationTitle}>
                    {location.name}
                  </Text>
                  {location.jobs.map((job) => (
                    <View key={job.id} style={volunteerStyles.jobGroup}>
                      <Text style={volunteerStyles.jobTitle}>{job.name}</Text>
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
                          <View
                            key={shift.id}
                            style={volunteerStyles.shiftItemRow}
                          >
                            <View style={volunteerStyles.shiftInfo}>
                              <Text style={volunteerStyles.shiftItemLabel}>
                                {shiftRange}
                              </Text>
                              <Text
                                style={
                                  isCheckedIn
                                    ? volunteerStyles.shiftCheckedInText
                                    : volunteerStyles.shiftNotCheckedInText
                                }
                              >
                                {isCheckedIn ? "Checked in" : "Not checked in"}
                                {dirty ? " (unsaved)" : ""}
                              </Text>
                              {shift.checkedInAt ? (
                                <Text style={rosterDetailStyles.checkInMeta}>
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
              <Text style={rosterDetailStyles.checkInMeta}>
                This volunteer has no assigned shifts yet.
              </Text>
            )}
          </View>

          <View style={rosterDetailStyles.bottomSpacer} />

          <View style={rosterDetailStyles.section}>
            <Text style={rosterDetailStyles.sectionTitle}>Check-In</Text>
            <Text style={rosterDetailStyles.checkInMeta}>
              {totalShiftCount
                ? "Toggle each shift above and save to capture attendance."
                : "Assign shifts to enable check-in tracking for this volunteer."}
            </Text>
            {hasChanges ? (
              <Text style={rosterDetailStyles.unsavedBanner}>
                You have unsaved check-in changes.
              </Text>
            ) : null}
            <TouchableOpacity
              style={[
                rosterDetailStyles.saveButton,
                (totalShiftCount === 0 || !hasChanges || updating) &&
                  rosterDetailStyles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={totalShiftCount === 0 || !hasChanges || updating}
            >
              {updating ? (
                <ActivityIndicator color={DayOfColors.common.white} />
              ) : (
                <Text style={rosterDetailStyles.saveButtonText}>
                  Save Check-Ins
                </Text>
              )}
            </TouchableOpacity>
            {saveError ? (
              <Text style={rosterDetailStyles.saveError}>{saveError}</Text>
            ) : null}
            {updateError && !saveError ? (
              <Text style={rosterDetailStyles.saveError}>
                {updateError.message ??
                  "Unable to update shifts. Please try again."}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
    </RosterDetailModal>
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

  const getVolunteerRowData = useCallback(
    (item) => ({
      id: item.id,
      title: item.name?.length ? item.name : "Unnamed Volunteer",
      meta: `Registered ${formatDate(item.createdAt)}`,
      details: [item.email, item.phone].filter(Boolean),
    }),
    []
  );

  if (!hydrated) {
    return (
      <SafeAreaView style={rosterListStyles.safeArea}>
        <View style={rosterListStyles.centerContent}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return <Redirect href={getDefaultRouteForPermissions(permissions)} />;
  }

  return (
    <View style={rosterListStyles.safeArea}>
      <RosterList
        title="Volunteers"
        subtitle="Search roster and tap a volunteer to view their full registration."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, phone, or answer"
        errorText={
          error ? "Unable to load volunteers. Pull to refresh." : undefined
        }
        data={filteredVolunteers}
        loading={loading}
        onRefresh={refetch}
        emptyTitle="No volunteers yet"
        emptySubtitle="Volunteers will appear here once they register."
        getRowData={getVolunteerRowData}
        onSelectItem={setSelectedVolunteer}
      />
      <VolunteerDetailModal
        volunteerId={selectedVolunteer}
        onClose={() => setSelectedVolunteer(null)}
      />
    </View>
  );
};

export default VolunteerScreen;

const volunteerStyles = StyleSheet.create({
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
});
