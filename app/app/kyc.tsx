// app/app/kyc.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import api from '../../src/services/apiClient';
import { useSubmitKyc } from '../../src/hooks/useQueries';
import { errorMessage } from '../../src/utils/apiError';
import { currentLanguage } from '../../src/i18n';
import { useAuthStore } from '../../src/stores/authStore';
import { Button, Input } from '../../src/components/ui';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../../src/utils/tokens';

const DOC_TYPES = [
  { key: 'national_id',     icon: '🪪', titleKey: 'kyc.nationalId',      hintKey: 'kyc.nationalIdHint'      },
  { key: 'passport',        icon: '📘', titleKey: 'kyc.passport',         hintKey: 'kyc.passportHint'        },
  { key: 'drivers_license', icon: '🚗', titleKey: 'kyc.driversLicense',   hintKey: 'kyc.driversLicenseHint'  },
] as const;

type DocKey = typeof DOC_TYPES[number]['key'];

export default function KYCScreen() {
  const router      = useRouter();
  const { t }       = useTranslation();
  const setUser     = useAuthStore((s) => s.setUser);
  const user        = useAuthStore((s) => s.user);
  const kycMutation = useSubmitKyc();

  const [docType,   setDocType]   = useState<DocKey>('national_id');
  const [docNumber, setDocNumber] = useState('');
  const [done, setDone] = useState(false);

  // ── Consent (ISO 27560) ──────────────────────────────────────────────────
  // Smile Identity's v3 token accepts a consent record, and identity
  // verification should not run without the user having actually agreed. The
  // checkbox is the record: unticked, we do not submit.
  const [consented, setConsented] = useState(false);

  const handleSubmit = async () => {
    if (!docNumber.trim()) {
      Alert.alert(t('kyc.requiredTitle'), t('kyc.requiredBody'));
      return;
    }
    if (!consented) {
      Alert.alert(t('kyc.consentRequiredTitle'), t('kyc.consentRequiredBody'));
      return;
    }
    try {
      await kycMutation.mutateAsync({
        docType,
        docNumber: docNumber.trim(),
        // Stamped from the device at the moment the user submits. The server
        // rejects a timestamp more than a minute in the future, and a value
        // without a timezone would be read as UTC — toISOString gives both.
        consent: {
          granted: true,
          granted_at: new Date().toISOString(),
          notice_language: currentLanguage().toUpperCase(),
          notice_privacy_policy_url: PRIVACY_POLICY_URL,
        },
      });
      if (user) setUser({ ...user, kycStatus: 'pending' });
      setDone(true);
    } catch (err: any) {
      Alert.alert(t('common.error'), errorMessage(err));
    }
  };

  if (done) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl }]}>
        <Text style={{ fontSize: 64, marginBottom: Spacing.xl }}>✅</Text>
        <Text style={styles.doneTitle}>{t('kyc.submitted')}</Text>
        <Text style={styles.doneSub}>{t('kyc.submittedBody')}</Text>
        <Button label={t('common.done')} onPress={() => router.back()} style={{ marginTop: Spacing.xxl, paddingHorizontal: 48 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: Colors.text1, fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('kyc.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {/* Steps */}
        <View style={styles.steps}>
          {[t('kyc.step1'), t('kyc.step2'), t('kyc.step3')].map((label, i) => (
            <React.Fragment key={i}>
              <View style={styles.stepCell}>
                <View style={[styles.stepNum, i === 0 && styles.stepNumDone, i === 1 && styles.stepNumActive]}>
                  <Text style={[styles.stepNumText, i === 0 && { color: Colors.bg }, i === 1 && { color: Colors.brand }]}>
                    {i < 0 ? '✓' : i + 1}
                  </Text>
                </View>
                <Text style={styles.stepLabel}>{label}</Text>
              </View>
              {i < 2 && <View style={styles.stepLine} />}
            </React.Fragment>
          ))}
        </View>

        {/* Document type */}
        <Text style={styles.sectionLabel}>{t('kyc.chooseDoc').toUpperCase()}</Text>
        <View style={{ gap: Spacing.sm, marginBottom: Spacing.xxl }}>
          {DOC_TYPES.map(doc => (
            <TouchableOpacity
              key={doc.key}
              style={[styles.docOpt, docType === doc.key && styles.docOptActive]}
              onPress={() => setDocType(doc.key)}
              activeOpacity={0.78}
            >
              <View style={styles.docIcon}><Text style={{ fontSize: 22 }}>{doc.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>{t(doc.titleKey)}</Text>
                <Text style={styles.docHint}>{t(doc.hintKey)}</Text>
              </View>
              <View style={[styles.radio, docType === doc.key && styles.radioActive]}>
                {docType === doc.key && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Doc number */}
        <Input
          label={t('kyc.docNumber')}
          value={docNumber}
          onChangeText={setDocNumber}
          placeholder="Ex: CI-1234567890"
          autoCapitalize="characters"
        />

        {/* Upload placeholder */}
        <TouchableOpacity style={styles.uploadBox} activeOpacity={0.75}>
          <Text style={{ fontSize: 32, marginBottom: Spacing.sm }}>📷</Text>
          <Text style={styles.uploadTitle}>{t('kyc.uploadPhoto')}</Text>
          <Text style={styles.uploadHint}>{t('kyc.uploadHint')}</Text>
        </TouchableOpacity>

        {/* Consent — required before any identity data is sent */}
        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => setConsented(v => !v)}
          activeOpacity={0.75}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consented }}
        >
          <View style={[styles.checkbox, consented && styles.checkboxOn]}>
            {consented && <Text style={styles.checkboxTick}>✓</Text>}
          </View>
          <Text style={styles.consentText}>{t('kyc.consentLabel')}</Text>
        </TouchableOpacity>

        <Button
          label={t('kyc.submit')}
          onPress={handleSubmit}
          loading={kycMutation.isPending}
          disabled={!consented || !docNumber.trim() || kycMutation.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// Shown to the user with the consent checkbox and recorded in the consent
// record sent to the identity provider.
const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? 'https://instantcards.app/privacy';

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  consentRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.lg },
  checkbox:    { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.b2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn:  { backgroundColor: Colors.brand, borderColor: Colors.brand },
  checkboxTick:{ color: Colors.bg, fontSize: 13, fontWeight: FontWeights.bold },
  consentText: { flex: 1, color: Colors.text2, fontSize: FontSizes.sm, lineHeight: 19 },
  header:      { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, gap: 14 },
  backBtn:     { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.s2, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.text1 },
  sectionLabel:{ fontSize: FontSizes.xs, color: Colors.text3, fontWeight: FontWeights.semibold, letterSpacing: 0.7, marginBottom: Spacing.sm },

  steps: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xxl },
  stepCell: { alignItems: 'center', gap: 6 },
  stepLine: { flex: 1, height: 0.5, backgroundColor: Colors.b2, marginBottom: 20 },
  stepNum:  { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.s2, borderWidth: 1.5, borderColor: Colors.b2, alignItems: 'center', justifyContent: 'center' },
  stepNumDone:   { backgroundColor: Colors.brand, borderColor: Colors.brand },
  stepNumActive: { borderColor: Colors.brand },
  stepNumText:   { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.text3 },
  stepLabel: { fontSize: FontSizes.xs, color: Colors.text3, textAlign: 'center' },

  docOpt: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.b1, backgroundColor: Colors.s1 },
  docOptActive: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  docIcon:  { width: 44, height: 44, borderRadius: 13, backgroundColor: Colors.s2, alignItems: 'center', justifyContent: 'center' },
  docTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.medium, color: Colors.text1, marginBottom: 2 },
  docHint:  { fontSize: FontSizes.xs, color: Colors.text3 },
  radio:    { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Colors.b2, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: Colors.brand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.brand },

  uploadBox: {
    alignItems: 'center', borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.b2, borderStyle: 'dashed',
    padding: Spacing['3xl'], backgroundColor: Colors.s1, marginBottom: Spacing.xl,
  },
  uploadTitle: { fontSize: FontSizes.md, color: Colors.text2, fontWeight: FontWeights.medium, marginBottom: 4 },
  uploadHint:  { fontSize: FontSizes.sm, color: Colors.text3 },

  doneTitle: { fontSize: FontSizes['2xl'], fontWeight: FontWeights.bold, color: Colors.text1, textAlign: 'center', marginBottom: Spacing.sm },
  doneSub:   { fontSize: FontSizes.md, color: Colors.text2, textAlign: 'center', lineHeight: 22, maxWidth: 300 },
});
