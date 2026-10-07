// app/app/withdraw.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Cash-out: Main Wallet → external mobile money or bank account.
// Handoff §10.
//
// State machine: form → confirm → submitting → success | failed
//
// Two deliberate UX decisions, both driven by how payouts actually behave:
//
//  1. The screen NEVER claims a withdrawal succeeded just because the API
//     returned 202. A payout is confirmed out of band by the provider. The
//     success state says "on its way" and points at history, because telling a
//     user their money has arrived when it may still fail is worse than a
//     slightly vaguer message.
//
//  2. `outcome: 'processing'` — the provider gave an ambiguous answer and funds
//     are held pending reconciliation — gets its own message. It is not an
//     error and must not be shown as one, but the user must know the balance
//     has already moved.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '../../src/stores/authStore';
import {
  useWallet, useMarkets, usePayoutMethods, useRequestPayout,
} from '../../src/hooks/useQueries';
import { carriersFor } from '../../src/config/markets';
import { errorMessage } from '../../src/utils/apiError';
import {
  Button, Input, LoadingState, ErrorState, EmptyState, Notice,
} from '../../src/components/ui';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../../src/utils/tokens';

type Stage = 'form' | 'confirm' | 'submitting' | 'success' | 'failed';

export default function WithdrawScreen() {
  const router = useRouter();
  const { t }  = useTranslation();
  const user   = useAuthStore(s => s.user);

  const country = user?.country ?? 'GH';

  const { data: wallet, isLoading: walletLoading, isError: walletError, refetch: refetchWallet } = useWallet();
  const { data: marketsData } = useMarkets();
  const {
    data: methodsData, isLoading: methodsLoading,
    isError: methodsError, refetch: refetchMethods,
  } = usePayoutMethods(country);
  const mutation = useRequestPayout();

  const market   = marketsData?.markets.find(m => m.country === country);
  const carriers = carriersFor(market);
  const currency = wallet?.currency ?? user?.currency ?? 'XOF';

  const [amount,  setAmount]  = useState('');
  const [network, setNetwork] = useState<string | null>(null);
  const [phone,   setPhone]   = useState('');
  const [pin,     setPin]     = useState('');
  const [stage,   setStage]   = useState<Stage>('form');
  const [error,   setError]   = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  useEffect(() => {
    if (carriers.length && !carriers.some(c => c.network === network)) {
      setNetwork(carriers[0].network);
    }
  }, [carriers, network]);

  const amtNum  = parseFloat(amount || '0');
  const feeBps  = methodsData?.feeBps ?? 150;
  const feePct  = (feeBps / 100).toFixed(feeBps % 100 === 0 ? 0 : 1);
  const fee     = Number.isFinite(amtNum) ? Math.ceil((amtNum * feeBps) / 10_000) : 0;
  const total   = amtNum + fee;
  const balance = wallet?.balance ?? 0;
  const fmt     = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);

  // ── Client-side validation ────────────────────────────────────────────────
  // Mirrors the server's rules so the user gets immediate feedback, but the
  // SERVER remains authoritative — this is convenience, never enforcement.
  const validation = useMemo(() => {
    if (!amount.trim())                    return { ok: false, reason: null };
    if (!Number.isFinite(amtNum) || amtNum <= 0)
      return { ok: false, reason: t('withdraw.invalidAmount') };
    if (methodsData && amtNum < methodsData.minAmount)
      return { ok: false, reason: t('withdraw.belowMin', { min: fmt(methodsData.minAmount), currency }) };
    if (methodsData && amtNum > methodsData.maxAmount)
      return { ok: false, reason: t('withdraw.aboveMax', { max: fmt(methodsData.maxAmount), currency }) };
    if (total > balance)
      return { ok: false, reason: t('withdraw.insufficient', { total: fmt(total), currency, balance: fmt(balance) }) };
    if (!phone.trim())                     return { ok: false, reason: null };
    if (phone.replace(/\D/g, '').length < 8)
      return { ok: false, reason: t('withdraw.invalidPhone') };
    return { ok: true, reason: null };
  }, [amount, amtNum, total, balance, phone, methodsData, currency, t]);

  const submit = useCallback(async () => {
    setStage('submitting');
    setError(null);
    try {
      const res = await mutation.mutateAsync({
        amount: amtNum,
        method: 'mobile_money',
        pin: pin.trim(),
        destination: { country, network: network ?? undefined, phone: phone.trim() },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOutcome((res as any).outcome ?? 'sent');
      setStage('success');
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(errorMessage(e));
      setStage('failed');
    }
  }, [amtNum, pin, phone, network, country, mutation]);

  // ── Screen-level states ───────────────────────────────────────────────────
  if (walletLoading || methodsLoading) {
    return <Shell title={t('withdraw.title')} onBack={() => router.back()}>
      <LoadingState label={t('common.loading')} />
    </Shell>;
  }

  if (walletError || methodsError) {
    return <Shell title={t('withdraw.title')} onBack={() => router.back()}>
      <ErrorState
        title={t('errors.loadFailed')}
        message={t('errors.checkConnection')}
        retryLabel={t('common.retry')}
        onRetry={() => { refetchWallet(); refetchMethods(); }}
      />
    </Shell>;
  }

  // Cash-out not enabled for this market — hide the feature rather than let the
  // user fill in a form that the server will reject.
  if (!methodsData?.available) {
    return <Shell title={t('withdraw.title')} onBack={() => router.back()}>
      <EmptyState
        icon="🏦"
        title={t('withdraw.unavailableTitle')}
        hint={t('withdraw.unavailableHint', { country })}
        action={t('common.back')}
        onAction={() => router.back()}
      />
    </Shell>;
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (stage === 'success') {
    const held = outcome === 'processing';
    return <Shell title={t('withdraw.title')} onBack={() => router.replace('/app/(tabs)/home')}>
      <View style={s.center}>
        <Text style={s.bigIcon}>{held ? '⏳' : '✓'}</Text>
        <Text style={s.successTitle}>
          {held ? t('withdraw.processingTitle') : t('withdraw.sentTitle')}
        </Text>
        <Text style={s.successBody}>
          {held
            ? t('withdraw.processingBody')
            : t('withdraw.sentBody', { amount: fmt(amtNum), currency })}
        </Text>
        <Button
          label={t('withdraw.viewHistory')}
          variant="secondary"
          onPress={() => router.replace('/app/(tabs)/history')}
          style={{ marginTop: Spacing.xl, minWidth: 220 }}
        />
        <Button
          label={t('common.done')}
          variant="ghost"
          onPress={() => router.replace('/app/(tabs)/home')}
          style={{ marginTop: Spacing.sm, minWidth: 220 }}
        />
      </View>
    </Shell>;
  }

  // ── Failed ────────────────────────────────────────────────────────────────
  if (stage === 'failed') {
    return <Shell title={t('withdraw.title')} onBack={() => router.back()}>
      <ErrorState
        title={t('withdraw.failedTitle')}
        message={error ?? t('common.error')}
        retryLabel={t('common.retry')}
        onRetry={() => { setStage('form'); setError(null); setPin(''); }}
      />
    </Shell>;
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  if (stage === 'confirm' || stage === 'submitting') {
    const carrier = carriers.find(c => c.network === network);
    return <Shell title={t('withdraw.confirmTitle')} onBack={() => setStage('form')}>
      <ScrollView contentContainerStyle={{ padding: Spacing.xl }} keyboardShouldPersistTaps="handled">
        <View style={s.summary}>
          <Row label={t('withdraw.youReceive')} value={`${fmt(amtNum)} ${currency}`} strong />
          <Row label={t('withdraw.feeLabel', { pct: feePct })} value={`${fmt(fee)} ${currency}`} />
          <View style={s.sumDivider} />
          <Row label={t('withdraw.debited')} value={`${fmt(total)} ${currency}`} strong />
          <Row label={t('withdraw.destination')} value={carrier?.name ?? network ?? '—'} />
          <Row label={t('withdraw.number')} value={phone} />
        </View>

        <Notice tone="warning">{t('withdraw.confirmWarning')}</Notice>

        <Text style={s.label}>{t('withdraw.pinLabel').toUpperCase()}</Text>
        <Input
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          placeholder="••••"
          editable={stage !== 'submitting'}
        />

        <Button
          label={t('withdraw.confirmCta')}
          loading={stage === 'submitting'}
          disabled={pin.trim().length < 4 || stage === 'submitting'}
          onPress={submit}
          style={{ marginTop: Spacing.lg }}
        />
        <Button
          label={t('common.cancel')}
          variant="ghost"
          onPress={() => setStage('form')}
          disabled={stage === 'submitting'}
          style={{ marginTop: Spacing.sm }}
        />
      </ScrollView>
    </Shell>;
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Shell title={t('withdraw.title')} onBack={() => router.back()}>
        <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          <View style={s.balanceCard}>
            <Text style={s.balanceLabel}>{t('withdraw.available')}</Text>
            <Text style={s.balanceValue}>{fmt(balance)} {currency}</Text>
          </View>

          {carriers.length > 0 && (
            <>
              <Text style={s.label}>{t('withdraw.sendTo').toUpperCase()}</Text>
              <View style={s.grid}>
                {carriers.map(c => (
                  <TouchableOpacity
                    key={c.network}
                    style={[s.card, network === c.network && s.cardOn]}
                    onPress={() => setNetwork(c.network)}
                    activeOpacity={0.75}
                  >
                    <View style={[s.badge, { backgroundColor: c.color }]}>
                      <Text style={[s.badgeTxt, { color: c.text }]}>
                        {c.name.split(' ')[0].slice(0, 4).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={s.cardName}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={s.label}>{t('withdraw.amountLabel').toUpperCase()}</Text>
          <View style={s.amtRow}>
            <Text style={s.amtPfx}>{currency === 'XOF' ? 'Fr' : currency}</Text>
            <Input
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              containerStyle={{ flex: 1, marginBottom: 0 }}
              style={{ fontSize: 28, fontWeight: FontWeights.black, paddingLeft: 4 }}
            />
          </View>

          <Text style={s.label}>{t('withdraw.numberLabel').toUpperCase()}</Text>
          <Input
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder={`+${market?.dialCode ?? ''} …`}
          />

          {amtNum > 0 && (
            <View style={s.feeBox}>
              <Text style={s.feeText}>
                {t('withdraw.feeSummary', {
                  fee: fmt(fee), currency, pct: feePct, total: fmt(total),
                })}
              </Text>
            </View>
          )}

          {validation.reason && <Notice tone="danger">{validation.reason}</Notice>}

          <Button
            label={t('common.continue')}
            disabled={!validation.ok}
            onPress={() => { setStage('confirm'); setPin(''); }}
            style={{ marginTop: Spacing.md }}
          />
        </ScrollView>
      </Shell>
    </KeyboardAvoidingView>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────
function Shell({
  title, onBack, children,
}: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.back} accessibilityLabel="Back">
          <Text style={{ color: Colors.text1, fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{title}</Text>
      </View>
      {children}
    </SafeAreaView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, strong && { color: Colors.text1, fontWeight: FontWeights.bold }]}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.text1, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  bigIcon: { fontSize: 56, marginBottom: Spacing.lg },
  successTitle: {
    color: Colors.text1, fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold, textAlign: 'center',
  },
  successBody: {
    color: Colors.text3, fontSize: FontSizes.sm, textAlign: 'center',
    marginTop: Spacing.sm, lineHeight: 20, maxWidth: 300,
  },

  balanceCard: {
    backgroundColor: Colors.s2, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.xl,
  },
  balanceLabel: { color: Colors.text3, fontSize: FontSizes.xs, letterSpacing: 0.6 },
  balanceValue: {
    color: Colors.text1, fontSize: 26,
    fontWeight: FontWeights.black, marginTop: 4,
  },

  label: {
    color: Colors.text3, fontSize: FontSizes.xs,
    letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  card: {
    borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.b2,
    padding: Spacing.md, alignItems: 'center', minWidth: 104, gap: 6,
  },
  cardOn: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  badgeTxt: { fontSize: 10, fontWeight: FontWeights.bold },
  cardName: { color: Colors.text2, fontSize: FontSizes.xs },

  amtRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  amtPfx: { color: Colors.text3, fontSize: FontSizes.base, fontWeight: FontWeights.semibold },

  feeBox: {
    backgroundColor: Colors.warningBg, borderRadius: Radii.md,
    padding: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.md,
  },
  feeText: { color: Colors.warning, fontSize: FontSizes.sm, lineHeight: 19 },

  summary: {
    backgroundColor: Colors.s2, borderRadius: Radii.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  sumDivider: { height: 1, backgroundColor: Colors.b2, marginVertical: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: Spacing.md },
  rowLabel: { color: Colors.text3, fontSize: FontSizes.sm },
  rowValue: { color: Colors.text2, fontSize: FontSizes.sm, flexShrink: 1, textAlign: 'right' },
});
