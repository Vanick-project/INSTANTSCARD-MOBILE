// app/app/_layout.tsx
import { Stack } from 'expo-router';
import { Colors } from '../../src/utils/tokens';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="topup"    options={{ presentation: 'card' }} />
      <Stack.Screen name="withdraw" options={{ presentation: 'card' }} />
      <Stack.Screen name="newcard" options={{ presentation: 'card' }} />
      <Stack.Screen name="reveal"  options={{ presentation: 'modal' }} />
      <Stack.Screen name="kyc"     options={{ presentation: 'card' }} />
    </Stack>
  );
}
