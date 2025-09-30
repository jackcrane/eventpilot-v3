import {
  ActivityIndicator,
  StyleSheet,
  Text,
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
import RosterList, {
  rosterListStyles,
} from "../../components/roster/RosterList";
import RosterDetailModal, {
  rosterDetailStyles,
} from "../../components/roster/RosterDetailModal";

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
    <RosterDetailModal
      title="Participant Details"
      visible={Boolean(participantId)}
      onClose={onClose}
      loading={loading}
      error={error}
      errorText="Unable to load participant. Please try again."
    >
      {detail ? (
        <>
          <View style={rosterDetailStyles.section}>
            <Text style={rosterDetailStyles.sectionTitle}>Profile</Text>
            {fields.map((field) => {
              const value =
                detail.resolvedResponses?.[field.id] ??
                detail.responses?.[field.id] ??
                null;
              return (
                <View key={field.id} style={rosterDetailStyles.row}>
                  <Text style={rosterDetailStyles.rowLabel}>{field.label}</Text>
                  <Text style={rosterDetailStyles.rowValue}>
                    {formatFieldValue(value)}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={rosterDetailStyles.section}>
            <Text style={rosterDetailStyles.sectionTitle}>
              Registration Summary
            </Text>
            <View style={rosterDetailStyles.row}>
              <Text style={rosterDetailStyles.rowLabel}>Tier</Text>
              <Text style={rosterDetailStyles.rowValue}>
                {detail.registrationTier?.name ?? "—"}
              </Text>
            </View>
            {detail.upsells?.length ? (
              detail.upsells.map((upsell) => (
                <View
                  key={upsell.upsellItemId ?? upsell.id}
                  style={rosterDetailStyles.row}
                >
                  <Text style={rosterDetailStyles.rowLabel}>
                    {upsell.upsellItem?.name ?? "Add-on"}
                  </Text>
                  <Text style={rosterDetailStyles.rowValue}>
                    Qty {upsell.quantity ?? 1}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={rosterDetailStyles.rowValue}>
                No add-ons selected.
              </Text>
            )}
          </View>

          <View style={rosterDetailStyles.bottomSpacer} />

          <View style={rosterDetailStyles.section}>
            <Text style={rosterDetailStyles.sectionTitle}>Check-In</Text>
            <View style={registrationStyles.checkInRow}>
              <Text style={registrationStyles.checkInStatus}>
                {checkedIn
                  ? "Participant is checked in"
                  : "Participant is not checked in"}
              </Text>
              <Switch value={checkedIn} onValueChange={setCheckedIn} />
            </View>
            {detail.checkedInBy?.name && currentCheckedInAt ? (
              <Text style={rosterDetailStyles.checkInMeta}>
                Last checked in by {detail.checkedInBy.name} on {currentCheckedInAt}
              </Text>
            ) : null}
            {!detail.checkedInBy?.name && currentCheckedInAt ? (
              <Text style={rosterDetailStyles.checkInMeta}>
                Last checked in on {currentCheckedInAt}
              </Text>
            ) : null}
            {hasChanges ? (
              <Text style={rosterDetailStyles.unsavedBanner}>
                You have unsaved check-in changes.
              </Text>
            ) : null}
            <TouchableOpacity
              style={[
                rosterDetailStyles.saveButton,
                (!hasChanges || updating) &&
                  rosterDetailStyles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!hasChanges || updating}
            >
              {updating ? (
                <ActivityIndicator color={DayOfColors.common.white} />
              ) : (
                <Text style={rosterDetailStyles.saveButtonText}>
                  Save Check-In
                </Text>
              )}
            </TouchableOpacity>
            {saveError ? (
              <Text style={rosterDetailStyles.saveError}>{saveError}</Text>
            ) : null}
            {updateError && !saveError ? (
              <Text style={rosterDetailStyles.saveError}>
                {updateError.message ??
                  "Unable to update check-in. Please try again."}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
    </RosterDetailModal>
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

  const getParticipantRowData = useCallback(
    (item) => ({
      id: item.id,
      title: item.name?.length ? item.name : "Unnamed Participant",
      meta: `Registered ${formatDate(item.createdAt)}`,
      details: [item.email, item.phone].filter(Boolean),
    }),
    []
  );

  return (
    <View style={rosterListStyles.safeArea}>
      <RosterList
        title="Participants"
        subtitle="Search roster and tap a participant to manage their check-in."
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email, phone, or answer"
        errorText={
          error ? "Unable to load participants. Pull to refresh." : undefined
        }
        data={filteredParticipants}
        loading={loading}
        onRefresh={refetch}
        emptyTitle="No participants yet"
        emptySubtitle="Participants will appear here once they register."
        getRowData={getParticipantRowData}
        onSelectItem={setSelectedParticipant}
      />
      <ParticipantDetailModal
        participantId={selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
      />
    </View>
  );
};

export default RegistrationScreen;

const registrationStyles = StyleSheet.create({
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
});
