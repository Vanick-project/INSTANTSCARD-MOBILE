// app/auth/login.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Input, PinInput } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import api from '../../src/services/apiClient';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../../src/utils/tokens';

export default function LoginScreen() {
  const router   = useRouter();
  const { t }    = useTranslation();
  const setAuth  = useAuthStore((s) => s.setAuth);

  const [phone, setPhone]     = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState<'phone' | 'pin'>('phone');

  const handlePhoneNext = () => {
    if (!phone.trim()) return;
    setStep('pin');
  };

  const handlePinComplete = async (pin: string) => {
    setLoading(true);
    try {
      const res = await api.login(phone.trim(), pin);
      const { user, token, refreshToken } = res.data.data;
      await setAuth(user, token, refreshToken);
      router.replace('/app/(tabs)/home');
    } catch (err: any) {
      Alert.alert(
        'Accès refusé',
        err?.response?.data?.message ?? 'Numéro ou PIN incorrect',
        [{ text: 'Réessayer' }]
      );
      setStep('phone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: Colors.text1, fontSize: 20 }}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {step === 'phone' ? (
          <>
            <Text style={styles.title}>{t('auth.loginTitle')}</Text>
            <Text style={styles.sub}>{t('auth.loginSub')}</Text>

            <Input
              label={t('auth.phoneNumber')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+225 07 00 00 00 00"
              autoFocus
            />

            <Button label={t('common.continue')} onPress={handlePhoneNext} style={{ marginTop: Spacing.sm }} />
          </>
        ) : (
          <>
            <Text style={styles.title}>Entrez votre PIN</Text>
            <Text style={styles.sub}>PIN à 4 chiffres pour {phone}</Text>

            <View style={{ marginTop: Spacing['3xl'], marginBottom: Spacing['3xl'] }}>
              <PinInput onComplete={handlePinComplete} />
            </View>

            {loading && (
              <Text style={{ textAlign: 'center', color: Colors.text3, fontSize: FontSizes.sm }}>
                Connexion en cours...
              </Text>
            )}

            <TouchableOpacity style={{ alignItems: 'center', marginTop: Spacing.xl }} onPress={() => setStep('phone')}>
              <Text style={{ color: Colors.brand, fontSize: FontSizes.md }}>Changer de numéro</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.switchRow} onPress={() => router.push('/auth/register')}>
          <Text style={styles.switchText}>
            {t('auth.noAccount')} <Text style={{ color: Colors.brand }}>Créer un compte</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header:    { paddingTop: 56, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  backBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.s2, alignItems: 'center', justifyContent: 'center' },
  scroll:    { padding: Spacing.xl, paddingTop: Spacing.xxl, paddingBottom: 48 },
  title:     { fontSize: FontSizes['2xl'], fontWeight: FontWeights.black, color: Colors.text1, marginBottom: Spacing.sm },
  sub:       { fontSize: FontSizes.md, color: Colors.text2, marginBottom: Spacing['3xl'] },
  switchRow: { alignItems: 'center', marginTop: Spacing['4xl'] },
  switchText:{ fontSize: FontSizes.md, color: Colors.text2 },
});
