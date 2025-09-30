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
} from "react-native";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { getDefaultRouteForPermissions } from "../../constants/dayOfPermissions";
import { DayOfColors } from "../../constants/theme";
import { useDayOfSessionContext } from "../../contexts/DayOfSessionContext";
import { useVolunteerRoster } from "../../hooks/useVolunteerRoster";
import { useVolunteerDetail } from "../../hooks/useVolunteerDetail";

const VolunteerDetailModal = ({ volunteerId, onClose }) => {
  const { detail, loading, error } = useVolunteerDetail(volunteerId);

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={Boolean(volunteerId)}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
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
            {detail.groupedShifts?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Assigned Shifts</Text>
                {detail.groupedShifts.map((location) => (
                  <View key={location.id} style={styles.shiftGroup}>
                    <Text style={styles.locationTitle}>{location.name}</Text>
                    {location.jobs.map((job) => (
                      <View key={job.id} style={styles.jobGroup}>
                        <Text style={styles.jobTitle}>{job.name}</Text>
                        {job.shifts.map((shift) => (
                          <Text key={shift.id} style={styles.shiftItem}>
                            {new Date(shift.startTime).toLocaleString()} →{" "}
                            {new Date(shift.endTime).toLocaleString()}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}
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
        Registered {new Date(item.createdAt).toLocaleDateString()}
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
    color: DayOfColors.light.danger,
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
    backgroundColor: DayOfColors.common.white,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DayOfColors.light.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: DayOfColors.light.primary,
  },
  closeButtonText: {
    color: DayOfColors.common.white,
    fontWeight: "600",
  },
  modalStatus: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: DayOfColors.light.gray[200],
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  row: {
    gap: 4,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: DayOfColors.light.secondary,
  },
  rowValue: {
    fontSize: 15,
    color: DayOfColors.light.text,
  },
  shiftGroup: {
    gap: 8,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: DayOfColors.light.text,
  },
  jobGroup: {
    paddingLeft: 8,
    gap: 4,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: DayOfColors.light.secondary,
  },
  shiftItem: {
    fontSize: 13,
    color: DayOfColors.light.secondary,
  },
});
