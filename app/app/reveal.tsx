// app/app/reveal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRevealCard, CardDetails } from '../../src/hooks/useQueries';
import { PinInput, Button } from '../../src/components/ui';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../../src/utils/tokens';

const VISIBLE_SECONDS = 60;

export default function RevealScreen() {
  const router  = useRouter();
  const { t }   = useTranslation();
  const { cardId } = useLocalSearchParams<{ cardId: string }>();

  const mutation = useRevealCard();
  const [step,    setStep]    = useState<'pin' | 'details'>('pin');
  const [details, setDetails] = useState<CardDetails | null>(null);
  const [timer,   setTimer]   = useState(VISIBLE_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    if (step !== 'details') return;
    intervalRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          router.back();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [step]);

  const handlePin = async (pin: string) => {
    try {
      const data = await mutation.mutateAsync({ id: cardId ?? '', pin });
      setDetails(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('details');
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('PIN incorrect', 'Veuillez réessayer.');
    }
  };

  const copy = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Copié', `${label} copié dans le presse-papier.`);
  };

  // ── PIN entry ─────────────────────────────────────────────────────────────
  if (step === 'pin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: Colors.text1, fontSize: 20 }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('cards.revealTitle')}</Text>
        </View>

        <View style={styles.pinSection}>
          <View style={styles.lockIcon}>
            <Text style={{ fontSize: 36 }}>🔒</Text>
          </View>
          <Text style={styles.pinPrompt}>{t('cards.enterPin')}</Text>
          <View style={{ marginTop: Spacing.xxl }}>
            <PinInput onComplete={handlePin} />
          </View>
          {mutation.isPending && (
            <Text style={styles.loading}>Vérification…</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Details display ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: Colors.text1, fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('cards.revealTitle')}</Text>
        <View style={styles.timerBadge}>
          <Text style={[styles.timerText, timer <= 10 && { color: Colors.danger }]}>
            {timer}s
          </Text>
        </View>
      </View>

      <View style={{ padding: Spacing.xl }}>
        {/* Card visual */}
        <View style={styles.cardPreview}>
          <View style={styles.chip} />
          <Text style={styles.cardPan}>
            {details?.pan.replace(/(.{4})/g, '$1 ').trim()}
          </Text>
          <View style={styles.cardBot}>
            <View>
              <Text style={styles.cardLabel}>TITULAIRE</Text>
              <Text style={styles.cardVal}>{details?.nameOnCard}</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>EXPIRE</Text>
              <Text style={styles.cardVal}>{details?.expiryMonth}/{details?.expiryYear?.slice(-2)}</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>CVV</Text>
              <Text style={styles.cardVal}>{details?.cvv}</Text>
            </View>
          </View>
        </View>

        {/* Warning */}
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            ⚠ Ces données seront masquées dans <Text style={{ color: Colors.warning, fontWeight: FontWeights.semibold }}>{timer}s</Text>. Ne partagez jamais votre CVV.
          </Text>
        </View>

        {/* Copy buttons */}
        <View style={styles.copyGrid}>
          <TouchableOpacity style={styles.copyBtn} onPress={() => copy(details!.pan, 'Numéro')}>
            <Text style={styles.copyLabel}>Numéro de carte</Text>
            <Text style={styles.copyValue}>•••• •••• •••• {details?.pan.slice(-4)}</Text>
            <Text style={styles.copyAction}>📋 Copier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.copyBtn} onPress={() => copy(details!.cvv, 'CVV')}>
            <Text style={styles.copyLabel}>CVV</Text>
            <Text style={styles.copyValue}>{details?.cvv}</Text>
            <Text style={styles.copyAction}>📋 Copier</Text>
          </TouchableOpacity>
        </View>

        <Button label={t('common.done')} variant="secondary" onPress={() => router.back()} style={{ marginTop: Spacing.lg }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, gap: 14 },
  backBtn:     { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.s2, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.text1 },
  timerBadge:  { backgroundColor: Colors.s2, borderRadius: Radii.full, paddingHorizontal: 12, paddingVertical: 5 },
  timerText:   { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.warning },

  pinSection:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  lockIcon:    { width: 72, height: 72, borderRadius: 22, backgroundColor: Colors.brandLight, borderWidth: 0.5, borderColor: Colors.brandBorder, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  pinPrompt:   { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.text1, textAlign: 'center' },
  loading:     { color: Colors.text3, fontSize: FontSizes.sm, marginTop: Spacing.xl },

  cardPreview: { backgroundColor: '#141F33', borderRadius: Radii.xxl, padding: Spacing.xxl, borderWidth: 0.5, borderColor: Colors.b2, marginBottom: Spacing.md },
  chip:        { width: 38, height: 26, backgroundColor: 'rgba(255,200,50,0.28)', borderRadius: 5, marginBottom: Spacing.xl, borderWidth: 0.5, borderColor: 'rgba(255,200,50,0.4)' },
  cardPan:     { fontSize: FontSizes.lg, letterSpacing: 3, color: Colors.text1, marginBottom: Spacing.xl, fontWeight: FontWeights.medium },
  cardBot:     { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel:   { fontSize: 9.5, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  cardVal:     { fontSize: FontSizes.md, fontWeight: FontWeights.medium, color: Colors.text1 },

  warnBox:  { backgroundColor: Colors.warningBg, borderRadius: Radii.md, borderWidth: 0.5, borderColor: 'rgba(239,159,39,0.3)', padding: Spacing.md, marginBottom: Spacing.md },
  warnText: { fontSize: FontSizes.sm, color: Colors.text2, lineHeight: 20 },

  copyGrid: { flexDirection: 'row', gap: Spacing.md },
  copyBtn:  { flex: 1, backgroundColor: Colors.s1, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.b1, padding: Spacing.md },
  copyLabel: { fontSize: FontSizes.xs, color: Colors.text3, marginBottom: 4 },
  copyValue: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: Colors.text1, marginBottom: 6 },
  copyAction:{ fontSize: FontSizes.xs, color: Colors.brand },
});
