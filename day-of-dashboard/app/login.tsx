import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDayOfSessionContext } from '@/contexts/DayOfSessionContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PIN_LENGTH = 6;

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const {
    hydrated,
    token,
    login,
    loggingIn,
    loginError,
  } = useDayOfSessionContext();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && token) {
      router.replace('/(tabs)');
    }
  }, [hydrated, token]);

  const disabled = useMemo(
    () => loggingIn || pin.trim().length !== PIN_LENGTH,
    [loggingIn, pin]
  );

  const handleSubmit = async () => {
    const normalized = pin.replace(/\D+/g, '');
    if (normalized.length !== PIN_LENGTH) {
      setError('Enter the 6-digit access PIN');
      return;
    }

    try {
      setError(null);
      await login({ pin: normalized });
      router.replace('/(tabs)');
    } catch (submissionError) {
      if (submissionError instanceof Error && submissionError.message) {
        setError(submissionError.message);
      } else if (typeof submissionError === 'string') {
        setError(submissionError);
      } else {
        setError('Unable to log in. Please try again.');
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
        behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <View style={styles.card}>
          <Text style={styles.title}>Day-Of Dashboard</Text>
        <Text style={styles.subtitle}>Enter your 6-digit access PIN</Text>
        <TextInput
          value={pin}
          maxLength={PIN_LENGTH}
          inputMode="numeric"
          keyboardType={Platform.select({ ios: 'number-pad', android: 'numeric' })}
          textContentType="oneTimeCode"
          autoFocus
          onChangeText={(value) => {
            const digitsOnly = value.replace(/\D+/g, '');
            setPin(digitsOnly);
          }}
          style={[styles.input, colorScheme === 'dark' ? styles.inputDark : undefined]}
        />
        {combinedError ? <Text style={styles.errorText}>{combinedError}</Text> : null}
          <TouchableOpacity
            style={[styles.button, disabled ? styles.buttonDisabled : undefined]}
            onPress={handleSubmit}
            disabled={disabled}>
            {loggingIn ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
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
    backgroundColor: '#f4f6fb',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginBottom: 24,
  },
  input: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 12,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 10,
    borderColor: '#ccc',
    marginBottom: 16,
    color: '#111',
    backgroundColor: '#fff',
  },
  inputDark: {
    borderColor: '#555',
    backgroundColor: '#1f1f1f',
    color: Colors.dark.text,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#0077ff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#97c2ff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    color: '#d93025',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
