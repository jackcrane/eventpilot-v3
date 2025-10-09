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

const PIN_LENGTH = 6;

export default function PinLoginScreen() {
  const colorScheme = useColorScheme();
  const { hydrated, token, requireName, login, loggingIn, loginError } =
    useDayOfSessionContext();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hydrated || !token) return;
    if (requireName) {
      router.replace("/login/name");
    } else {
      router.replace("/(tabs)");
    }
  }, [hydrated, token, requireName]);

  const disabled = useMemo(
    () => loggingIn || pin.trim().length !== PIN_LENGTH,
    [loggingIn, pin]
  );

  const handleSubmit = async () => {
    const normalized = pin.replace(/\D+/g, "");
    if (normalized.length !== PIN_LENGTH) {
      setError("Enter the 6-digit access PIN");
      return;
    }

    try {
      setError(null);
      const result = await login({ pin: normalized });
      if (result.account.name?.trim()) {
        router.replace("/(tabs)");
      } else {
        router.replace("/login/name");
      }
    } catch (submissionError) {
      if (submissionError instanceof Error && submissionError.message) {
        setError(submissionError.message);
      } else if (typeof submissionError === "string") {
        setError(submissionError);
      } else {
        setError("Unable to log in. Please try again.");
      }
    }
  };

  const combinedError = error || loginError;

  if (!hydrated && !token) {
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
          <Text style={styles.title}>Day-Of Dashboard</Text>
          <Text style={styles.subtitle}>Enter your 6-digit access PIN</Text>
          <TextInput
            value={pin}
            maxLength={PIN_LENGTH}
            inputMode="numeric"
            keyboardType={Platform.select({
              ios: "number-pad",
              android: "numeric",
            })}
            textContentType="oneTimeCode"
            autoFocus
            onChangeText={(value) => {
              const digitsOnly = value.replace(/\D+/g, "");
              setPin(digitsOnly);
            }}
            style={[
              styles.input,
              colorScheme === "dark" ? styles.inputDark : undefined,
            ]}
          />
          {combinedError ? (
            <Text style={styles.errorText}>{combinedError}</Text>
          ) : null}
          <View style={styles.spacer} />
          <TouchableOpacity
            style={[
              styles.button,
              disabled ? styles.buttonDisabled : undefined,
            ]}
            onPress={handleSubmit}
            disabled={disabled}
          >
            {loggingIn ? (
              <ActivityIndicator color={DayOfColors.common.white} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
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
    textAlign: "left",
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
    marginBottom: 12,
  },
  input: {
    fontSize: 24,
    fontWeight: "600",
    paddingVertical: 12,
    paddingLeft: 16,
    borderWidth: 2,
    borderRadius: 10,
    borderColor: DayOfColors.light.border,
    marginBottom: 4,
    color: DayOfColors.light.text,
    backgroundColor: DayOfColors.common.white,
  },
  inputDark: {
    borderColor: DayOfColors.dark.border,
    backgroundColor: DayOfColors.dark.bodyBg,
    color: DayOfColors.dark.text,
  },
  button: {
    marginTop: 8,
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
  errorText: {
    color: DayOfColors.light.danger,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: {
    flex: 1,
  },
});
