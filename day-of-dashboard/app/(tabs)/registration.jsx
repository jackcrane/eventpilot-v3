import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { getDefaultRouteForPermissions } from "../../constants/dayOfPermissions";
import { useDayOfSessionContext } from "../../contexts/DayOfSessionContext";
import { DayOfColors } from "../../constants/theme";

const RegistrationScreen = () => {
  const { account, permissions, hydrated } = useDayOfSessionContext();

  const hasPermission = permissions.includes("PARTICIPANT_CHECK_IN");

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
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Participant Registration</Text>
        <Text style={styles.subtitle}>
          Registration tools for {account?.name ? account.name : "this station"}{" "}
          go here.
        </Text>
        <Text style={styles.placeholder}>
          Hook up participant check-in flows as they become available.
        </Text>
      </View>
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
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 16,
    color: DayOfColors.light.secondary,
  },
  placeholder: {
    fontSize: 14,
    color: DayOfColors.light.tertiary,
  },
});
