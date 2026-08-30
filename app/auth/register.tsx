// app/auth/register.tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import api from '../../src/services/apiClient';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../../src/utils/tokens';

const COUNTRIES = [
  { code: 'CI', flag: '🇨🇮', name: "Côte d'Ivoire", dial: '+225', currency: 'XOF' },
  { code: 'SN', flag: '🇸🇳', name: 'Sénégal',       dial: '+221', currency: 'XOF' },
  { code: 'ML', flag: '🇲🇱', name: 'Mali',          dial: '+223', currency: 'XOF' },
  { code: 'BF', flag: '🇧🇫', name: 'Burkina Faso',  dial: '+226', currency: 'XOF' },
  { code: 'GH', flag: '🇬🇭', name: 'Ghana',         dial: '+233', currency: 'GHS' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria',       dial: '+234', currency: 'NGN' },
  { code: 'KE', flag: '🇰🇪', name: 'Kenya',         dial: '+254', currency: 'KES' },
  { code: 'UG', flag: '🇺🇬', name: 'Uganda',        dial: '+256', currency: 'UGX' },
  { code: 'TZ', flag: '🇹🇿', name: 'Tanzania',      dial: '+255', currency: 'TZS' },
  { code: 'CM', flag: '🇨🇲', name: 'Cameroun',      dial: '+237', currency: 'XAF' },
];

export default function RegisterScreen() {
  const router  = useRouter();
  const { t }   = useTranslation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm]     = useState({ firstName: '', lastName: '', phone: '', pin: '', pinConfirm: '' });
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Requis';
    if (!form.lastName.trim())  e.lastName  = 'Requis';
    if (!form.phone.trim())     e.phone     = 'Requis';
    if (form.pin.length < 4)    e.pin       = 'PIN de 4 chiffres requis';
    if (form.pin !== form.pinConfirm) e.pinConfirm = t('auth.pinMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.register({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        phone:     country.dial + form.phone.replace(/\s/g, ''),
        pin:       form.pin,
        country:   country.code,
      });
      const { user, token, refreshToken } = res.data.data;
      await setAuth(user, token, refreshToken);
      router.replace('/app/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: Colors.text1, fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Créer un compte</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          <Input containerStyle={{ flex: 1 }} label={t('auth.firstName')} value={form.firstName} onChangeText={(v) => setForm(p => ({ ...p, firstName: v }))} error={errors.firstName} placeholder="Kofi" />
          <Input containerStyle={{ flex: 1 }} label={t('auth.lastName')}  value={form.lastName}  onChangeText={(v) => setForm(p => ({ ...p, lastName: v  }))} error={errors.lastName}  placeholder="Mensah" />
        </View>

        {/* Country picker */}
        <Text style={styles.inputLabel}>{t('auth.country')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
          {COUNTRIES.map((c) => (
            <TouchableOpacity key={c.code} onPress={() => setCountry(c)}
              style={[styles.countryChip, country.code === c.code && styles.countryChipActive]}>
              <Text style={{ fontSize: 16 }}>{c.flag}</Text>
              <Text style={[styles.countryName, country.code === c.code && { color: Colors.brand }]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.inputLabel}>{t('auth.phoneNumber')}</Text>
        <View style={styles.phoneRow}>
          <View style={styles.dialCode}>
            <Text style={styles.dialText}>{country.flag} {country.dial}</Text>
          </View>
          <Input
            containerStyle={{ flex: 1, marginBottom: 0 }}
            value={form.phone}
            onChangeText={(v) => setForm(p => ({ ...p, phone: v }))}
            keyboardType="phone-pad"
            placeholder="07 00 00 00 00"
            error={errors.phone}
          />
        </View>

        <Input
          label={t('auth.pin')}
          value={form.pin}
          onChangeText={(v) => setForm(p => ({ ...p, pin: v }))}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          error={errors.pin}
          placeholder="••••"
          style={{ fontSize: 22, letterSpacing: 8 }}
        />
        <Input
          label={t('auth.pinConfirm')}
          value={form.pinConfirm}
          onChangeText={(v) => setForm(p => ({ ...p, pinConfirm: v }))}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          error={errors.pinConfirm}
          placeholder="••••"
          style={{ fontSize: 22, letterSpacing: 8 }}
        />

        <Text style={styles.terms}>{t('auth.terms')}</Text>

        <Button label={t('auth.createAccount')} onPress={handleRegister} loading={loading} />

        <TouchableOpacity style={styles.switchRow} onPress={() => router.push('/auth/login')}>
          <Text style={styles.switchText}>{t('auth.hasAccount')} <Text style={{ color: Colors.brand }}>Se connecter</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header:   { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, paddingTop: 56, gap: 14 },
  backBtn:  { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.s2, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.text1 },
  scroll:   { padding: Spacing.xl, paddingBottom: 48 },
  row:      { flexDirection: 'row', gap: Spacing.md },
  inputLabel: { fontSize: FontSizes.xs, color: Colors.text3, fontWeight: FontWeights.medium, marginBottom: 7, letterSpacing: 0.3 },
  countryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radii.full, borderWidth: 0.5, borderColor: Colors.b2, marginRight: 8, backgroundColor: Colors.s1 },
  countryChipActive: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  countryName: { fontSize: FontSizes.sm, color: Colors.text2 },
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  dialCode: { paddingHorizontal: 14, paddingVertical: 14, borderRadius: Radii.md, backgroundColor: Colors.s2, borderWidth: 1, borderColor: Colors.b1, justifyContent: 'center' },
  dialText: { color: Colors.text1, fontSize: FontSizes.md },
  terms:    { fontSize: FontSizes.sm, color: Colors.text3, lineHeight: 19, marginBottom: Spacing.xl },
  switchRow:{ alignItems: 'center', marginTop: Spacing.xl },
  switchText:{ fontSize: FontSizes.md, color: Colors.text2 },
});
