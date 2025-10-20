import { useCallback } from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';
import { SWRConfig } from 'swr';

import {
  DayOfSessionProvider,
  useDayOfSessionContext,
} from '../contexts/DayOfSessionContext';
import { dayOfAuthFetch, dayOfJson } from '../utils/apiClient';

export const unstable_settings = {
  initialRouteName: 'login',
};

const StripeTerminalBoundary = ({ children }) => {
  const { account, token } = useDayOfSessionContext();

  const tokenProvider = useCallback(async () => {
    if (!token || !account?.eventId) {
      throw new Error('Session is not ready to request a connection token');
    }
    const payload = {};
    if (account?.defaultTerminalLocationId) {
      payload.locationId = account.defaultTerminalLocationId;
    }
    console.log("[POS][tokenProvider] requesting connection token", {
      eventId: account.eventId,
      instanceId: account.instanceId ?? null,
      locationId: payload.locationId ?? null,
    });
    const response = await dayOfAuthFetch(
      `/api/events/${account.eventId}/day-of-dashboard/terminal/connection-token`,
      { token, instanceId: account.instanceId ?? null },
      {
        method: 'POST',
        body: Object.keys(payload).length ? JSON.stringify(payload) : undefined,
      }
    );
    const data = await dayOfJson(response);
    if (!data?.secret) {
      throw new Error('Stripe Terminal connection token missing secret');
    }
    console.log("[POS][tokenProvider] received connection token", {
      hasSecret: Boolean(data?.secret),
      expiresAt: data?.expiresAt ?? null,
      locationId: data?.locationId ?? null,
    });
    return data.secret;
  }, [account?.eventId, account?.instanceId, token]);

  return (
    <StripeTerminalProvider
      tokenProvider={tokenProvider}
      logLevel={__DEV__ ? 'verbose' : 'none'}>
      {children}
    </StripeTerminalProvider>
  );
};

export default function RootLayout() {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }}>
      <SafeAreaProvider>
        <DayOfSessionProvider>
          <StripeTerminalBoundary>
            <ThemeProvider value={DefaultTheme}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen
                  name="(tabs)"
                  options={{ headerShown: false, gestureEnabled: false }}
                />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: 'modal', title: 'Modal' }}
                />
              </Stack>
              <StatusBar style="dark" />
            </ThemeProvider>
          </StripeTerminalBoundary>
        </DayOfSessionProvider>
      </SafeAreaProvider>
    </SWRConfig>
  );
}
