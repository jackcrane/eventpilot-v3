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

import { useDayOfSessionContext } from '../../contexts/DayOfSessionContext';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';

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
  const [name, setName] = useState(account?.name ?? '');
  const [error, setError] = useState(null);

  useEffect(() => {
    setName(account?.name ?? '');
  }, [account?.name]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    if (!requireName) {
      router.replace('/(tabs)');
    }
  }, [hydrated, token, requireName]);

  const disabled = useMemo(() => updatingName || !name.trim().length, [name, updatingName]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed.length) {
      setError('Please enter a name for this station.');
      return;
    }

    try {
      setError(null);
      await setAccountName(trimmed);
      router.replace('/(tabs)');
    } catch (submissionError) {
      if (submissionError instanceof Error && submissionError.message) {
        setError(submissionError.message);
      } else if (typeof submissionError === 'string') {
        setError(submissionError);
      } else {
        setError('Unable to save. Please try again.');
      }
    }
  };

  const handleUseDifferentPin = async () => {
    await logout();
    router.replace('/login');
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
        behavior={Platform.select({ ios: 'padding', android: undefined })}>
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
            placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#9aa0a6'}
            style={[styles.input, colorScheme === 'dark' ? styles.inputDark : undefined]}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.button, disabled ? styles.buttonDisabled : undefined]}
            onPress={handleSubmit}
            disabled={disabled}>
            {updatingName ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save name</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleUseDifferentPin}>
            <Text
              style={[
                styles.secondaryButtonText,
                colorScheme === 'dark' ? styles.secondaryButtonTextDark : undefined,
              ]}>
              Use a different PIN
            </Text>
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
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#c5c9d0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111',
  },
  inputDark: {
    borderColor: '#3a3c40',
    backgroundColor: '#1f1f1f',
    color: Colors.dark.text,
  },
  button: {
    marginTop: 4,
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
  secondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4a4c50',
    fontWeight: '500',
    fontSize: 15,
  },
  secondaryButtonTextDark: {
    color: '#f3f4f6',
  },
  errorText: {
    color: '#d93025',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
