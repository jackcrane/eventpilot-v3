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
} from 'react-native';
import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDefaultRouteForPermissions } from '../../constants/dayOfPermissions';
import { Colors } from '../../constants/theme';
import { useDayOfSessionContext } from '../../contexts/DayOfSessionContext';
import { useVolunteerRoster } from '../../hooks/useVolunteerRoster';
import { useVolunteerDetail } from '../../hooks/useVolunteerDetail';

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
                  typeof value === 'string'
                    ? value
                    : value?.label ?? value ?? '—';
                return (
                  <View key={field.id} style={styles.row}>
                    <Text style={styles.rowLabel}>{field.label}</Text>
                    <Text style={styles.rowValue}>
                      {displayValue?.toString()?.length ? displayValue : '—'}
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
                            {new Date(shift.startTime).toLocaleString()} →{' '}
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
  const hasPermission = permissions.includes('VOLUNTEER_CHECK_IN');
  const [search, setSearch] = useState('');
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

  return (
    <SafeAreaView style={styles.safeArea}>
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
          placeholderTextColor="#7d8186"
          autoCorrect={false}
        />
      </View>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Unable to load volunteers. Pull to refresh.
          </Text>
        </View>
      ) : null}
      <FlatList
        data={filteredVolunteers}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => refetch()} />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle=
          {filteredVolunteers.length === 0 && !loading
            ? styles.emptyListContainer
            : styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedVolunteer(item.id)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {item.name?.length ? item.name : 'Unnamed Volunteer'}
              </Text>
              <Text style={styles.cardTimestamp}>
                Registered {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {item.email ? (
              <Text style={styles.cardDetail}>{item.email}</Text>
            ) : null}
            {item.phone ? (
              <Text style={styles.cardDetail}>{item.phone}</Text>
            ) : null}
          </TouchableOpacity>
        )}
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
    </SafeAreaView>
  );
};

export default VolunteerScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6fb',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#f4f6fb',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#101a33',
  },
  subtitle: {
    fontSize: 15,
    color: '#596078',
  },
  searchInput: {
    marginTop: 4,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dfe3eb',
    fontSize: 16,
    color: '#101a33',
  },
  errorContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  errorText: {
    color: '#c33e3e',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  emptyListContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101a33',
    flex: 1,
    marginRight: 12,
  },
  cardTimestamp: {
    fontSize: 12,
    color: '#7d8186',
  },
  cardDetail: {
    fontSize: 14,
    color: '#3a3f55',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#101a33',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#596078',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dfe3eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#101a33',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.tint,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalStatus: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#101a33',
  },
  row: {
    gap: 4,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#596078',
  },
  rowValue: {
    fontSize: 15,
    color: '#101a33',
  },
  shiftGroup: {
    gap: 8,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#101a33',
  },
  jobGroup: {
    paddingLeft: 8,
    gap: 4,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3a3f55',
  },
  shiftItem: {
    fontSize: 13,
    color: '#596078',
  },
});
