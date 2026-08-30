// app/_layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// App entry point. Handles:
//   - QueryClient (React Query)
//   - i18n initialisation
//   - Auth hydration + navigation guard (unauthenticated → splash)
//   - Expo push notification registration → backend device-token endpoint
//   - Expo deep-link initialisation (for Flutterwave redirect flow)
// ─────────────────────────────────────────────────────────────────────────────
import { initLanguage } from '../src/i18n';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';

import { useAuthStore } from '../src/stores/authStore';
import api from '../src/services/apiClient';
import { Colors } from '../src/utils/tokens';

// Configure how notifications appear while the app is in the foreground.
//
// SDK 54 replaced the single `shouldShowAlert` flag with the more granular
// `shouldShowBanner` (heads-up alert) and `shouldShowList` (notification
// centre). The old field is gone from NotificationBehavior, so the previous
// version of this object failed type-check and left the two required fields
// undefined at runtime.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

// ── React Query client ────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:                  2,
      staleTime:              30_000,
      refetchOnWindowFocus:   false,
      refetchOnReconnect:     true,
    },
  },
});

// ── Auth guard ────────────────────────────────────────────────────────────────
function AuthGuard() {
  const { token, isHydrated } = useAuthStore();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (!isHydrated) return;

    const inAuth = segments[0] === 'auth';

    if (!token && !inAuth) {
      router.replace('/auth/splash');
    } else if (token && inAuth) {
      router.replace('/app/(tabs)/home');
    }
  }, [token, isHydrated, segments]);

  return null;
}

// ── Push notification registration ───────────────────────────────────────────
async function registerPushToken() {
  // Notifications only work on physical devices and registered simulators
  if (Platform.OS === 'web') return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const { data: pushToken } = await Notifications.getExpoPushTokenAsync();

    // Register with backend so it can send wallet-credit and card-spend alerts
    await api.registerDeviceToken(pushToken);
    console.log('[Push] device token registered:', pushToken.slice(0, 40) + '…');
  } catch (err) {
    // Non-fatal — app works fine without push notifications
    console.warn('[Push] registration failed:', err);
  }
}

// ── Root component ────────────────────────────────────────────────────────────
export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const token   = useAuthStore((s) => s.token);

  // Hydrate auth store from SecureStore on first mount
  useEffect(() => { hydrate(); }, []);

  // Resolve the startup language: stored user choice → device locale → French.
  // Without this the app was permanently French — i18n was configured with a
  // hardcoded `lng: 'fr'` and changeLanguage was never called anywhere.
  useEffect(() => { initLanguage(); }, []);

  // Register push token once the user is authenticated
  useEffect(() => {
    if (token) registerPushToken();
  }, [token]);

  // Handle deep links that arrive while the app is already open
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      console.log('[DeepLink] received:', url);
      // Individual screens (topup.tsx) add their own listeners for specific paths.
      // This top-level listener is just for debugging.
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <AuthGuard />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="auth" />
          <Stack.Screen name="app"  />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
