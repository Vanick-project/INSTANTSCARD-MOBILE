// app/app/newcard.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useGenerateCard, GeneratedCardSecret } from '../../src/hooks/useQueries';
import { useWallet } from '../../src/hooks/useQueries';
import { Button } from '../../src/components/ui';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../../src/utils/tokens';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

const PURPOSES = ['shopping','subscriptions','travel','freelance','gaming','other'] as const;
type Purpose = typeof PURPOSES[number];

const SPENDING_LIMITS = [5000, 10000, 25000, 50000, 100000, 200000];

export default function NewCardScreen() {
  const router    = useRouter();
  const { t }     = useTranslation();
  const { data: wallet } = useWallet();
  const mutation  = useGenerateCard();

  const [network, setNetwork]   = useState<'visa' | 'mastercard'>('visa');
  const [purposes, setPurposes] = useState<Set<Purpose>>(new Set(['shopping']));
  const [limitIdx, setLimitIdx] = useState(3);      // 50,000 default
  const [step, setStep]         = useState<'form' | 'generating' | 'done'>('form');
  const [generated, setGenerated] = useState<GeneratedCardSecret | null>(null);

  const spendingLimit = SPENDING_LIMITS[limitIdx];
  const GEN_FEE = 500;
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);

  const togglePurpose = (p: Purpose) => {
    const next = new Set(purposes);
    if (next.has(p)) { if (next.size > 1) next.delete(p); }
    else next.add(p);
    setPurposes(next);
  };

  const handleGenerate = async () => {
    if ((wallet?.balance ?? 0) < GEN_FEE) {
      Alert.alert('Solde insuffisant', `Frais de génération : ${GEN_FEE} ${wallet?.currency ?? 'XOF'}. Rechargez votre portefeuille.`);
      return;
    }
    setStep('generating');
    try {
      const card = await mutation.mutateAsync({
        network,
        spendingLimit,
        purpose: Array.from(purposes),
      });
      setGenerated(card);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('done');
    } catch (err: any) {
      setStep('form');
      Alert.alert(t('common.error'), err?.response?.data?.message ?? t('common.error'));
    }
  };

  // ── Generating ───────────────────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <View style={styles.procRing}>
          <Text style={{ fontSize: 44 }}>⚙</Text>
        </View>
        <Text style={styles.procTitle}>{t('cards.generatingCard')}</Text>
        <Text style={styles.procSub}>Émission de votre carte {network === 'visa' ? 'VISA' : 'Mastercard'} virtuelle…</Text>
      </SafeAreaView>
    );
  }

  // ── Done — show card details ONCE ─────────────────────────────────────────
  if (step === 'done' && generated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('cards.cardReady')}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 48 }}>
          {/* Card preview */}
          <View style={styles.revealCard}>
            <View style={styles.revealChip} />
            <Text style={styles.revealPan}>{generated.maskedPan}</Text>
            <View style={styles.revealRow}>
              <View>
                <Text style={styles.revealLabel}>TITULAIRE</Text>
                <Text style={styles.revealValue}>{generated.nameOnCard}</Text>
              </View>
              <View>
                <Text style={styles.revealLabel}>EXPIRE</Text>
                <Text style={styles.revealValue}>{generated.expiryMonth}/{generated.expiryYear.slice(-2)}</Text>
              </View>
              <Text style={[styles.networkText, { fontStyle: generated.network === 'visa' ? 'italic' : 'normal' }]}>
                {generated.network === 'visa' ? 'VISA' : 'MC'}
              </Text>
            </View>
          </View>

          {/* Sensitive details */}
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠ Ces informations ne seront plus affichées. Copiez-les maintenant si nécessaire.</Text>
          </View>

          <View style={styles.detailsCard}>
            <DetailRow label="Numéro complet" value={generated.pan} copyable />
            <View style={styles.detailDivider} />
            <DetailRow label="CVV" value={generated.cvv} copyable />
            <View style={styles.detailDivider} />
            <DetailRow label="Expiration" value={`${generated.expiryMonth} / ${generated.expiryYear}`} />
          </View>

          <Button label={t('common.done')} onPress={() => router.replace('/app/(tabs)/cards')} style={{ marginTop: Spacing.xl }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: Colors.text1, fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('cards.generateTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 48 }}>
        {/* Network */}
        <Text style={styles.sectionLabel}>{t('cards.selectNetwork').toUpperCase()}</Text>
        <View style={styles.networkRow}>
          <NetworkOption
            selected={network === 'visa'}
            onPress={() => setNetwork('visa')}
            label="Visa Virtual"
            badge="VISA"
            badgeStyle={{ backgroundColor: 'white', color: '#1A1F71', fontStyle: 'italic' }}
          />
          <NetworkOption
            selected={network === 'mastercard'}
            onPress={() => setNetwork('mastercard')}
            label="Mastercard Virtual"
            isMC
          />
        </View>

        {/* Purpose */}
        <Text style={styles.sectionLabel}>{t('cards.selectPurpose').toUpperCase()}</Text>
        <View style={styles.purposeWrap}>
          {PURPOSES.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.purposeChip, purposes.has(p) && styles.purposeChipActive]}
              onPress={() => togglePurpose(p)}
            >
              <Text style={[styles.purposeText, purposes.has(p) && styles.purposeTextActive]}>
                {t(`cards.${p}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Spending limit */}
        <Text style={styles.sectionLabel}>{t('cards.spendingLimit').toUpperCase()}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
          <Text style={styles.limitLabel}>Plafond mensuel</Text>
          <Text style={styles.limitValue}>{fmt(spendingLimit)} {wallet?.currency ?? 'XOF'}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.xxl }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SPENDING_LIMITS.map((l, i) => (
              <TouchableOpacity
                key={l}
                style={[styles.limitChip, limitIdx === i && styles.limitChipActive]}
                onPress={() => setLimitIdx(i)}
              >
                <Text style={[styles.limitChipText, limitIdx === i && { color: Colors.brand }]}>{fmt(l)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Fee notice */}
        <View style={styles.feeBox}>
          <Text style={styles.feeText}>
            <Text style={{ color: Colors.brand, fontWeight: FontWeights.semibold }}>Frais de génération : {GEN_FEE} {wallet?.currency ?? 'XOF'}</Text>
            {'\n'}Solde actuel : {fmt(wallet?.balance ?? 0)} {wallet?.currency ?? 'XOF'} · La carte sera active immédiatement.
          </Text>
        </View>

        <Button
          label={`Générer · ${GEN_FEE} ${wallet?.currency ?? 'XOF'}`}
          onPress={handleGenerate}
          loading={mutation.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function NetworkOption({ selected, onPress, label, badge, badgeStyle, isMC }: any) {
  return (
    <TouchableOpacity
      style={[styles.networkOption, selected && styles.networkOptionActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {isMC ? (
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#EB001B' }} />
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#F79E1B', marginLeft: -10, opacity: 0.88 }} />
        </View>
      ) : (
        <View style={[styles.networkBadge, badgeStyle]}>
          <Text style={[styles.networkBadgeText, badgeStyle]}>{badge}</Text>
        </View>
      )}
      <Text style={styles.networkLabel}>{label}</Text>
      <Text style={styles.networkFee}>Frais : 500 XOF</Text>
    </TouchableOpacity>
  );
}

function DetailRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md }}>
      <View>
        <Text style={{ fontSize: FontSizes.xs, color: Colors.text3, marginBottom: 3 }}>{label}</Text>
        <Text style={{ fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.text1, letterSpacing: label === 'Numéro complet' ? 2 : 0 }}>{value}</Text>
      </View>
      {copyable && (
        <TouchableOpacity onPress={handleCopy} style={{ backgroundColor: Colors.s2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 }}>
          <Text style={{ fontSize: FontSizes.xs, color: Colors.brand }}>Copier</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered:  { alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  header:    { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, gap: 14 },
  backBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.s2, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.text1 },
  sectionLabel: { fontSize: FontSizes.xs, color: Colors.text3, fontWeight: FontWeights.semibold, letterSpacing: 0.7, marginBottom: Spacing.sm },

  networkRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xxl },
  networkOption: { flex: 1, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.b1, padding: Spacing.md, backgroundColor: Colors.s1, alignItems: 'center' },
  networkOptionActive: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  networkBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5, marginBottom: 10 },
  networkBadgeText: { fontSize: FontSizes.lg, fontWeight: FontWeights.black },
  networkLabel: { fontSize: FontSizes.sm, color: Colors.text1, fontWeight: FontWeights.medium, marginBottom: 3 },
  networkFee:   { fontSize: FontSizes.xs, color: Colors.text3 },

  purposeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.xxl },
  purposeChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radii.full, borderWidth: 0.5, borderColor: Colors.b2, backgroundColor: 'transparent' },
  purposeChipActive: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  purposeText:       { fontSize: FontSizes.sm, color: Colors.text2 },
  purposeTextActive: { color: Colors.brand, fontWeight: FontWeights.medium },

  limitLabel: { fontSize: FontSizes.sm, color: Colors.text2 },
  limitValue: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.brand },
  limitChip:  { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radii.full, borderWidth: 0.5, borderColor: Colors.b2 },
  limitChipActive: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  limitChipText: { fontSize: FontSizes.sm, color: Colors.text2 },

  feeBox: { backgroundColor: Colors.brandLight, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.brandBorder, padding: Spacing.md, marginBottom: Spacing.xl },
  feeText: { fontSize: FontSizes.sm, color: Colors.text2, lineHeight: 20 },

  procRing:  { width: 110, height: 110, borderRadius: 55, backgroundColor: Colors.s2, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xxl },
  procTitle: { fontSize: FontSizes['2xl'], fontWeight: FontWeights.bold, color: Colors.text1, marginBottom: Spacing.sm, textAlign: 'center' },
  procSub:   { fontSize: FontSizes.md, color: Colors.text2, textAlign: 'center', lineHeight: 22 },

  revealCard: { backgroundColor: '#141F33', borderRadius: Radii.xxl, padding: Spacing.xxl, borderWidth: 0.5, borderColor: Colors.b2, marginBottom: Spacing.md },
  revealChip: { width: 38, height: 26, backgroundColor: 'rgba(255,200,50,0.28)', borderRadius: 5, marginBottom: Spacing.xl, borderWidth: 0.5, borderColor: 'rgba(255,200,50,0.4)' },
  revealPan:  { fontSize: FontSizes.lg, letterSpacing: 3, color: Colors.text1, marginBottom: Spacing.xl, fontWeight: FontWeights.medium },
  revealRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  revealLabel:{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  revealValue:{ fontSize: FontSizes.md, fontWeight: FontWeights.medium },
  networkText:{ fontSize: FontSizes.xl, fontWeight: FontWeights.black, color: Colors.text1 },

  warningBox: { backgroundColor: Colors.warningBg, borderRadius: Radii.md, borderWidth: 0.5, borderColor: 'rgba(239,159,39,0.3)', padding: Spacing.md, marginBottom: Spacing.md },
  warningText:{ fontSize: FontSizes.sm, color: Colors.warning, lineHeight: 20 },

  detailsCard: { backgroundColor: Colors.s1, borderRadius: Radii.xl, borderWidth: 0.5, borderColor: Colors.b1, paddingHorizontal: Spacing.xl },
  detailDivider: { height: 0.5, backgroundColor: Colors.b1 },
});
