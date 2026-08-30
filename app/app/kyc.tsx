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

  const handleSubmit = async () => {
    if (!docNumber.trim()) {
      Alert.alert('Requis', 'Veuillez entrer le numéro du document.');
      return;
    }
    try {
      await kycMutation.mutateAsync({ docType, docNumber: docNumber.trim() });
      if (user) setUser({ ...user, kycStatus: 'pending' });
      setDone(true);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message ?? t('common.error'));
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

        <Button label={t('kyc.submit')} onPress={handleSubmit} loading={kycMutation.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
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
