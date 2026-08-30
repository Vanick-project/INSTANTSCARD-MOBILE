// app/auth/_layout.tsx
import { Stack } from 'expo-router';
import { Colors } from '../../src/utils/tokens';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }} />
  );
}
