// app/app/topup.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real Flutterwave mobile money top-up.
// Three auth modes: ussd (most markets) | otp (Vodafone GH) | redirect
// State machine: idle → initiating → ussd_pending|otp_required|redirect
//                  → verifying → success | failed
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert, SafeAreaView,
  AppState, AppStateStatus, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/stores/authStore';
import api from '../../src/services/apiClient';
import { QK, useMarkets } from '../../src/hooks/useQueries';
import { carriersFor } from '../../src/config/markets';
import { Button, Input } from '../../src/components/ui';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../../src/utils/tokens';

// NOTE: the carrier list is no longer hardcoded here.
//
// This file used to own a PROVIDERS table that listed Côte d'Ivoire, Mali and
// Burkina Faso for Orange Money and Wave. The backend supported none of them,
// so every top-up started in those countries failed at the API. The supported
// markets and their carriers now come from GET /api/v1/config/markets via
// useMarkets(), with display metadata in src/config/markets.ts.
//
// Consequence: enabling a new market is a backend change, not an app release.

const QUICK_AMOUNTS = [500, 1000, 5000, 10000, 25000, 50000];
const MAX_POLLS     = 36; // 36 × 5 s = 3 minutes

type Stage = 'idle'|'initiating'|'ussd_pending'|'otp_required'|'redirect'|'verifying'|'success'|'failed';

export default function TopUpScreen() {
  const router  = useRouter();
  const { t }   = useTranslation();
  const qc      = useQueryClient();
  const user    = useAuthStore((s) => s.user);

  const [amount,   setAmount]   = useState('');
  const [phone,    setPhone]    = useState('');
  const [step,     setStep]     = useState<'form'|'confirm'>('form');
  const [stage,    setStage]    = useState<Stage>('idle');
  const [otp,      setOtp]      = useState('');
  const [error,    setError]    = useState<string|null>(null);
  const [result,   setResult]   = useState<{
    reference: string; flwRef: string|null;
    paymentUrl?: string; message?: string;
  }|null>(null);

  const pollRef      = useRef<ReturnType<typeof setInterval>|null>(null);
  const appStateRef  = useRef<AppStateStatus>(AppState.currentState);
  const pollCount    = useRef(0);

  const country  = user?.country  ?? 'GH';
  const currency = user?.currency ?? 'GHS';
  const amtNum   = parseFloat(amount || '0');

  // ── Server-driven market config ───────────────────────────────────────────
  const { data: marketsData } = useMarkets();
  const market    = marketsData?.markets.find(m => m.country === country);
  const available = carriersFor(market);

  // Fee rate comes from the server so the figure shown here always matches what
  // the backend actually charges. It used to be a hardcoded 150 bps in this file
  // and a separate TOPUP_FEE_BPS env var on the backend — two numbers that could
  // silently disagree and mislead the user at the confirmation step.
  const feeBps   = marketsData?.feeBps ?? 150;
  const feePct   = (feeBps / 100).toFixed(feeBps % 100 === 0 ? 0 : 1);
  const fee      = Math.ceil((amtNum * feeBps) / 10_000);
  const total    = amtNum + fee;
  const fmt      = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);

  // Selected carrier, held as a code rather than an object so it survives the
  // markets list arriving asynchronously.
  const [networkCode, setNetworkCode] = useState<string | null>(null);
  const provider = available.find(c => c.network === networkCode) ?? available[0];

  // Nigeria (and any future USSD market) returns no carriers — Flutterwave
  // detects the network from the phone number, so we must not show a picker.
  const needsCarrierChoice = available.length > 0;

  // Keep the selection valid when the markets list resolves or the user's
  // country changes underneath us.
  useEffect(() => {
    if (available.length === 0) { setNetworkCode(null); return; }
    if (!available.some(c => c.network === networkCode)) {
      setNetworkCode(available[0].network);
    }
  }, [available, networkCode]);

  // Cleanup
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Re-check when returning from background (after USSD)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev === 'background' && next === 'active'
          && (stage === 'ussd_pending' || stage === 'verifying')
          && result?.reference) {
        checkStatus(result.reference);
      }
    });
    return () => sub.remove();
  }, [stage, result]);

  // Deep-link handler for redirect auth mode
  useEffect(() => {
    const handle = ({ url }: { url: string }) => {
      if (!url.includes('topup/result')) return;
      const p = new URLSearchParams(url.split('?')[1] ?? '');
      const ref = p.get('ref'), st = p.get('status');
      if (ref && st === 'successful') { setStage('verifying'); checkStatus(ref); }
      else if (ref) fail('Payment was cancelled or failed.');
    };
    const sub = Linking.addEventListener('url', handle);
    return () => sub.remove();
  }, []);

  // ── Initiate ──────────────────────────────────────────────────────────────
  const initiate = useCallback(async () => {
    setStage('initiating'); setError(null);
    try {
      const res  = await api.initiateTopup({
        amount: amtNum, country, phone: phone.trim(),
        // Omit `network` entirely for USSD markets (Nigeria) — the backend
        // payload for those must not carry a carrier field.
        ...(provider ? { network: provider.network } : {}),
      });
      const data = res.data.data;
      setResult(data);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (data.nextStep === 'otp') {
        setStage('otp_required');
      } else if (data.paymentUrl) {
        setStage('redirect');
        await Linking.openURL(data.paymentUrl);
      } else {
        setStage('ussd_pending');
        startPolling(data.reference);
      }
    } catch (e: any) { fail(e?.response?.data?.message ?? t('common.error')); }
  }, [amtNum, country, phone, provider]);

  // ── OTP submit ────────────────────────────────────────────────────────────
  const submitOtp = useCallback(async () => {
    if (!result || !otp.trim()) return;
    setStage('verifying');
    try {
      const res = await api.validateOtp({ flwRef: result.flwRef ?? '', otp: otp.trim(), reference: result.reference });
      const { status } = res.data.data;
      if (status === 'success') succeed();
      else if (status === 'failed') fail('OTP invalid. Please try again.');
      else startPolling(result.reference);
    } catch (e: any) { fail(e?.response?.data?.message ?? 'OTP failed.'); }
  }, [result, otp]);

  // ── Polling ───────────────────────────────────────────────────────────────
  function startPolling(ref: string) {
    pollCount.current = 0;
    pollRef.current = setInterval(async () => {
      if (++pollCount.current > MAX_POLLS) {
        stopPolling();
        fail('Payment timed out. Contact support if funds were deducted.');
        return;
      }
      await checkStatus(ref);
    }, 5_000);
  }
  function stopPolling() { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }
  async function checkStatus(ref: string) {
    try {
      const res = await api.verifyTopup(ref);
      const { status } = res.data.data;
      if (status === 'success') { stopPolling(); succeed(); }
      else if (status === 'failed') { stopPolling(); fail('Payment failed at provider.'); }
    } catch { /* keep polling */ }
  }

  function succeed() {
    setStage('success');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    qc.invalidateQueries({ queryKey: QK.wallet });
    qc.invalidateQueries({ queryKey: QK.transactions() });
  }
  function fail(msg: string) {
    setStage('failed'); setError(msg);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
  function reset() { stopPolling(); setStage('idle'); setResult(null); setOtp(''); setError(null); setStep('form'); }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE SCREENS
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === 'initiating') return (
    <SafeAreaView style={[s.c, s.mid]}>
      <View style={s.ring}><Text style={s.ico}>⏳</Text></View>
      <Text style={s.title}>Initialisation…</Text>
      <Text style={s.sub}>Connexion à {provider?.name ?? t('topup.provider')}</Text>
    </SafeAreaView>
  );

  if (stage === 'ussd_pending' || (stage === 'verifying' && !otp)) return (
    <SafeAreaView style={[s.c, s.mid]}>
      <View style={s.ring}><Text style={s.ico}>📲</Text></View>
      <Text style={s.title}>Vérifiez votre téléphone</Text>
      <Text style={s.sub}>{result?.message ?? `Invite USSD envoyée au ${phone}.`}</Text>
      <View style={s.ibox}><Text style={s.itxt}>Acceptez et entrez votre PIN {provider?.name ?? ''}.{'\n'}Cette fenêtre se met à jour automatiquement.</Text></View>
      <Text style={s.ref}>Réf : {result?.reference}</Text>
      <Text style={s.poll}>Vérification toutes les 5 s…</Text>
      <TouchableOpacity onPress={reset} style={{ marginTop: Spacing['3xl'] }}><Text style={s.cancel}>Annuler</Text></TouchableOpacity>
    </SafeAreaView>
  );

  if (stage === 'otp_required') return (
    <SafeAreaView style={[s.c, s.mid]}>
      <View style={s.ring}><Text style={s.ico}>💬</Text></View>
      <Text style={s.title}>Code OTP reçu ?</Text>
      <Text style={s.sub}>Vodafone vous a envoyé un SMS. Entrez le code ci-dessous.</Text>
      <Input value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6}
        placeholder="_ _ _ _ _ _" autoFocus
        style={{ fontSize: 28, textAlign: 'center', letterSpacing: 8 }}
        containerStyle={{ width: 220, marginTop: Spacing.xxl, marginBottom: Spacing.xxl }}
      />
      <Button label="Confirmer le code OTP" onPress={submitOtp} style={{ paddingHorizontal: 40 }} />
      <TouchableOpacity onPress={reset} style={{ marginTop: Spacing.lg }}><Text style={s.cancel}>Annuler</Text></TouchableOpacity>
    </SafeAreaView>
  );

  if (stage === 'verifying') return (
    <SafeAreaView style={[s.c, s.mid]}>
      <View style={s.ring}><Text style={s.ico}>⏳</Text></View>
      <Text style={s.title}>Vérification…</Text>
      <Text style={s.sub}>Confirmation auprès de {provider?.name ?? t('topup.provider')}.</Text>
    </SafeAreaView>
  );

  if (stage === 'success') return (
    <SafeAreaView style={[s.c, s.mid]}>
      <View style={[s.ring, s.rOk]}><Text style={s.ico}>✓</Text></View>
      <Text style={s.title}>{t('topup.successTitle')}</Text>
      <Text style={s.sub}>{fmt(amtNum)} {currency} crédité sur votre portefeuille.</Text>
      <Text style={s.ref}>Réf : {result?.reference}</Text>
      <Button label={t('common.done')} onPress={() => { reset(); router.back(); }}
        style={{ marginTop: Spacing.xxl, paddingHorizontal: 48 }} />
    </SafeAreaView>
  );

  if (stage === 'failed') return (
    <SafeAreaView style={[s.c, s.mid]}>
      <View style={[s.ring, s.rFail]}><Text style={s.ico}>✕</Text></View>
      <Text style={s.title}>{t('topup.failTitle')}</Text>
      <Text style={s.sub}>{error}</Text>
      <Button label="Réessayer" onPress={reset} style={{ marginTop: Spacing.xxl, paddingHorizontal: 40 }} />
      <Button label={t('common.cancel')} variant="ghost" onPress={() => { reset(); router.back(); }} style={{ marginTop: Spacing.sm }} />
    </SafeAreaView>
  );

  // Confirm step
  if (step === 'confirm') return (
    <SafeAreaView style={s.c}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => setStep('form')} style={s.back}><Text style={{ color: Colors.text1, fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={s.hdrTxt}>Confirmer</Text>
      </View>
      <View style={{ padding: Spacing.xl, flex: 1 }}>
        <View style={s.sum}>
          <Row l="Opérateur"    v={provider?.name ?? "—"} />
          <Row l="Numéro"       v={phone} />
          <Row l="Montant"      v={`${fmt(amtNum)} ${currency}`} />
          <Row l={`Frais (${feePct}%)`} v={`${fmt(fee)} ${currency}`} />
          <View style={s.tot}><Text style={s.totL}>Total débité</Text><Text style={s.totV}>{fmt(total)} {currency}</Text></View>
        </View>
        <View style={s.ibox}><Text style={s.itxt}>📱 Invite USSD envoyée au <Text style={{ color: Colors.text1 }}>{phone}</Text>.</Text></View>
        <View style={{ flex: 1 }} />
        <Button label={`Confirmer · ${fmt(total)} ${currency}`} onPress={initiate} />
        <Button label={t('common.cancel')} variant="ghost" onPress={() => setStep('form')} style={{ marginTop: Spacing.sm }} />
      </View>
    </SafeAreaView>
  );

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <SafeAreaView style={s.c}>
        <View style={s.hdr}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={{ color: Colors.text1, fontSize: 20 }}>←</Text></TouchableOpacity>
          <Text style={s.hdrTxt}>{t('topup.title')}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* Carrier picker is hidden entirely for USSD markets such as Nigeria,
              where the provider resolves the network from the phone number and
              a picker would be a meaningless choice. */}
          {needsCarrierChoice && (
            <>
              <Text style={s.lbl}>{t('topup.operator').toUpperCase()}</Text>
              <View style={s.pgrid}>
                {available.map(p => (
                  <TouchableOpacity key={p.network} style={[s.pcard, provider?.network === p.network && s.pcardOn]} onPress={() => setNetworkCode(p.network)} activeOpacity={0.75}>
                    <View style={[s.pbadge, { backgroundColor: p.color }]}><Text style={[s.pbadgeTxt, { color: p.text }]}>{p.name.split(' ')[0].slice(0,4).toUpperCase()}</Text></View>
                    <Text style={s.pname}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* The markets list could not be fetched and we are showing the
              cold-start snapshot. Say so rather than presenting a truncated
              country list as if it were complete. */}
          {marketsData?.isFallback && (
            <View style={s.warnbox}>
              <Text style={s.warntxt}>{t('topup.marketsUnavailable')}</Text>
            </View>
          )}

          <Text style={s.lbl}>{t('topup.amount').toUpperCase()}</Text>
          <View style={s.amtrow}>
            <Text style={s.amtpfx}>{currency === 'XOF' ? 'Fr' : currency}</Text>
            <Input value={amount} onChangeText={setAmount} keyboardType="numeric"
              containerStyle={{ flex: 1, marginBottom: 0 }}
              style={{ fontSize: 28, fontWeight: FontWeights.black, paddingLeft: 4 }} placeholder="0" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.xl }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {QUICK_AMOUNTS.map(a => (
                <TouchableOpacity key={a} style={[s.pill, amount === String(a) && s.pillOn]} onPress={() => setAmount(String(a))}>
                  <Text style={[s.pillTxt, amount === String(a) && { color: Colors.brand }]}>{fmt(a)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={s.lbl}>{t('topup.phoneLabel').toUpperCase()}</Text>
          <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+233 20 000 0000" />

          <View style={s.feebox}>
            <Text style={s.feetxt}>
              <Text style={{ color: Colors.warning, fontWeight: FontWeights.semibold }}>Frais : {fmt(fee)} {currency} ({feePct}%)</Text>
              {'  ·  '}Total : {fmt(total)} {currency}
            </Text>
          </View>

          <Button label={`Continuer · ${fmt(amtNum)} ${currency}`}
            onPress={() => {
              if (!amtNum || amtNum < 1) return Alert.alert('Montant invalide', 'Entrez un montant valide.');
              if (!phone.trim())          return Alert.alert('Numéro requis', 'Entrez votre numéro Mobile Money.');
              setStep('confirm');
            }} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm }}>
      <Text style={{ fontSize: FontSizes.sm, color: Colors.text3 }}>{l}</Text>
      <Text style={{ fontSize: FontSizes.sm, color: Colors.text1, fontWeight: FontWeights.medium }}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  c:    { flex: 1, backgroundColor: Colors.bg },
  mid:  { alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  hdr:  { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, gap: 14 },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.s2, alignItems: 'center', justifyContent: 'center' },
  hdrTxt: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.text1 },
  lbl:  { fontSize: FontSizes.xs, color: Colors.text3, fontWeight: FontWeights.semibold, letterSpacing: 0.7, marginBottom: Spacing.sm },

  pgrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xxl },
  pcard:   { width: '47%', borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.b1, padding: Spacing.md, backgroundColor: Colors.s1 },
  pcardOn: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  pbadge:  { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  pbadgeTxt: { fontSize: FontSizes.xs, fontWeight: FontWeights.black },
  pname:   { fontSize: FontSizes.sm, color: Colors.text1, fontWeight: FontWeights.medium },

  amtrow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  amtpfx: { fontSize: FontSizes.xl, color: Colors.text3, marginRight: Spacing.sm },
  pill:   { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radii.full, borderWidth: 0.5, borderColor: Colors.b2 },
  pillOn: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  pillTxt:{ fontSize: FontSizes.sm, color: Colors.text2 },

  warnbox: { backgroundColor: 'rgba(255,176,32,0.12)', borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,176,32,0.35)' },
  warntxt: { color: Colors.warning, fontSize: FontSizes.sm, lineHeight: 18 },
  feebox: { backgroundColor: Colors.warningBg, borderRadius: Radii.md, borderWidth: 0.5, borderColor: 'rgba(239,159,39,0.25)', padding: Spacing.md, marginBottom: Spacing.xl },
  feetxt: { fontSize: FontSizes.sm, color: Colors.text2, lineHeight: 20 },

  sum:  { backgroundColor: Colors.s1, borderRadius: Radii.xl, borderWidth: 0.5, borderColor: Colors.b1, padding: Spacing.xl, marginBottom: Spacing.md },
  tot:  { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.md, marginTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: Colors.b1 },
  totL: { fontSize: FontSizes.base, fontWeight: FontWeights.semibold, color: Colors.text1 },
  totV: { fontSize: FontSizes.base, fontWeight: FontWeights.black, color: Colors.brand },

  ibox: { backgroundColor: Colors.infoBg, borderRadius: Radii.md, borderWidth: 0.5, borderColor: `${Colors.info}40`, padding: Spacing.md, marginBottom: Spacing.lg },
  itxt: { fontSize: FontSizes.sm, color: Colors.text2, lineHeight: 20, textAlign: 'center' },

  ring:  { width: 110, height: 110, borderRadius: 55, backgroundColor: Colors.s2, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xxl },
  rOk:  { backgroundColor: Colors.successBg, borderWidth: 1.5, borderColor: Colors.brand },
  rFail:{ backgroundColor: Colors.dangerBg,  borderWidth: 1.5, borderColor: Colors.danger },
  ico:  { fontSize: 44 },
  title:{ fontSize: FontSizes['2xl'], fontWeight: FontWeights.bold, color: Colors.text1, marginBottom: Spacing.sm, textAlign: 'center' },
  sub:  { fontSize: FontSizes.md, color: Colors.text2, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg, maxWidth: 300 },
  ref:  { fontSize: FontSizes.xs, color: Colors.text3, marginBottom: Spacing.xs },
  poll: { fontSize: FontSizes.xs, color: Colors.text3 },
  cancel: { fontSize: FontSizes.md, color: Colors.text3 },
});
