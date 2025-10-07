import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDayOfSessionContext } from "../../contexts/DayOfSessionContext";
import { DayOfColors } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";

export default function NameEntryScreen() {
  const colorScheme = useColorScheme();
  const {
    hydrated,
    token,
    requireName,
    account,
    setAccountName,
    updatingName,
    logout,
  } = useDayOfSessionContext();
  const [name, setName] = useState(account?.name ?? "");
  const [error, setError] = useState(null);

  useEffect(() => {
    setName(account?.name ?? "");
  }, [account?.name]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!requireName) {
      router.replace("/(tabs)");
    }
  }, [hydrated, token, requireName]);

  const disabled = useMemo(
    () => updatingName || !name.trim().length,
    [name, updatingName]
  );

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed.length) {
      setError("Please enter a name for this station.");
      return;
    }

    try {
      setError(null);
      await setAccountName(trimmed);
      router.replace("/(tabs)");
    } catch (submissionError) {
      if (submissionError instanceof Error && submissionError.message) {
        setError(submissionError.message);
      } else if (typeof submissionError === "string") {
        setError(submissionError);
      } else {
        setError("Unable to save. Please try again.");
      }
    }
  };

  const handleUseDifferentPin = async () => {
    await logout();
    router.replace("/login");
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!token || !requireName) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Name this station</Text>
          <Text style={styles.subtitle}>
            This name helps your team identify where this dashboard is in use.
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            placeholder="e.g. Volunteer Check-In 1"
            placeholderTextColor={
              colorScheme === "dark"
                ? DayOfColors.dark.tertiary
                : DayOfColors.light.tertiary
            }
            style={[
              styles.input,
              colorScheme === "dark" ? styles.inputDark : undefined,
            ]}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleUseDifferentPin}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                colorScheme === "dark"
                  ? styles.secondaryButtonTextDark
                  : undefined,
              ]}
            >
              ← Use a different PIN
            </Text>
          </TouchableOpacity>
          <View style={styles.spacer} />
          <TouchableOpacity
            style={[
              styles.button,
              disabled ? styles.buttonDisabled : undefined,
            ]}
            onPress={handleSubmit}
            disabled={disabled}
          >
            {updatingName ? (
              <ActivityIndicator color={DayOfColors.common.white} />
            ) : (
              <Text style={styles.buttonText}>Save name</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DayOfColors.light.bodyBg,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 12,
    gap: 12,
    height: "100%",
    paddingTop: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 16,
    color: DayOfColors.light.secondary,
  },
  input: {
    borderWidth: 1,
    borderColor: DayOfColors.light.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: DayOfColors.common.white,
    color: DayOfColors.light.text,
  },
  inputDark: {
    borderColor: DayOfColors.dark.border,
    backgroundColor: DayOfColors.dark.bodyBg,
    color: DayOfColors.dark.text,
  },
  button: {
    marginTop: 4,
    backgroundColor: DayOfColors.light.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: DayOfColors.light.primaryLt,
  },
  buttonText: {
    color: DayOfColors.common.white,
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 0,
  },
  secondaryButtonText: {
    color: DayOfColors.light.secondary,
    fontWeight: "500",
    fontSize: 15,
  },
  secondaryButtonTextDark: {
    color: DayOfColors.dark.secondary,
  },
  errorText: {
    color: DayOfColors.light.danger,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: { flex: 1 },
});
