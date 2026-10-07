// src/components/wallet/WalletBand.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { BrandGradient, Colors, Radii, Spacing, FontSizes, FontWeights } from '../../utils/tokens';
import type { Wallet } from '../../hooks/useQueries';

interface Props {
  wallet:   Wallet | undefined;
  loading?: boolean;
  onTopUp:  () => void;
  onNewCard: () => void;
}

export function WalletBand({ wallet, loading, onTopUp, onNewCard }: Props) {
  const { t } = useTranslation();

  const formatBalance = (amount: number, currency: string) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' ' + currency;

  return (
    <LinearGradient
      colors={[...BrandGradient.wallet]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.band}
    >
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <Text style={styles.label}>{t('home.walletBalance')}</Text>
      {loading ? (
        <View style={styles.skeleton} />
      ) : (
        <>
          <Text style={styles.balance}>
            {wallet ? formatBalance(wallet.balance, wallet.currency) : '—'}
          </Text>
          <Text style={styles.currency}>
            {wallet?.currency === 'XAF' ? 'Franc CFA (XAF)' :
             wallet?.currency === 'XOF' ? 'Franc CFA (XOF)' :
             wallet?.currency === 'GHS' ? 'Ghana Cedi (GHS)' :
             wallet?.currency === 'NGN' ? 'Naira (NGN)' :
             wallet?.currency === 'KES' ? 'Kenyan Shilling (KES)' :
             wallet?.currency ?? ''}
          </Text>
        </>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnLight} onPress={onTopUp} activeOpacity={0.8}>
          <Text style={styles.btnLightText}>＋ {t('home.topUp')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnDark} onPress={onNewCard} activeOpacity={0.8}>
          <Text style={styles.btnDarkText}>{t('home.newCard')}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// TransactionRow
// ─────────────────────────────────────────────────────────────────────────────
import type { Transaction } from '../../hooks/useQueries';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TxnRowProps {
  txn: Transaction;
  onPress?: () => void;
}

const TXN_META: Record<string, { color: string; icon: string }> = {
  topup:               { color: Colors.brand,   icon: '↑' },
  card_debit:          { color: Colors.purple,  icon: '💳' },
  card_credit:         { color: Colors.brand,   icon: '↑' },
  fee:                 { color: Colors.warning, icon: '⚙' },
  card_generation_fee: { color: Colors.warning, icon: '⚙' },
};

export function TransactionRow({ txn, onPress }: TxnRowProps) {
  const meta      = TXN_META[txn.type] ?? { color: Colors.text3, icon: '·' };
  const isCredit  = txn.type === 'topup' || txn.type === 'card_credit';
  const dateStr   = format(new Date(txn.createdAt), 'd MMM · HH:mm', { locale: fr });
  const amtStr    = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(txn.amount);

  return (
    <TouchableOpacity style={styles.txnRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.txnIcon, { backgroundColor: meta.color + '20' }]}>
        <Text style={{ fontSize: 15 }}>{meta.icon}</Text>
      </View>
      <View style={styles.txnInfo}>
        <Text style={styles.txnName} numberOfLines={1}>{txn.description}</Text>
        <Text style={styles.txnDate}>{dateStr}</Text>
      </View>
      <View style={styles.txnRight}>
        <Text style={[styles.txnAmount, isCredit ? styles.credit : styles.debit]}>
          {isCredit ? '+' : '-'}{amtStr}
        </Text>
        {txn.status === 'pending' && (
          <Text style={styles.txnPending}>en attente</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // WalletBand
  band: {
    margin: Spacing.xl,
    borderRadius: Radii.xxl,
    padding: Spacing.xxl,
    position: 'relative',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', width: 170, height: 170, borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.07)', right: -30, top: -30,
  },
  circle2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)', right: 50, bottom: -45,
  },
  label:   { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 5 },
  skeleton:{ height: 38, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, marginBottom: 6, width: 180 },
  balance: { fontSize: 34, fontWeight: FontWeights.black, color: '#fff', marginBottom: 3, position: 'relative', zIndex: 1 },
  currency:{ fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.65)', marginBottom: 20, position: 'relative', zIndex: 1 },
  actions: { flexDirection: 'row', gap: 10, position: 'relative', zIndex: 2 },
  btnLight:{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radii.md, paddingVertical: 12, alignItems: 'center' },
  btnLightText: { color: '#fff', fontWeight: FontWeights.semibold, fontSize: FontSizes.md },
  btnDark: { flex: 1, backgroundColor: 'rgba(15,61,36,0.55)', borderRadius: Radii.md, paddingVertical: 12, alignItems: 'center' },
  btnDarkText:  { color: '#fff', fontWeight: FontWeights.semibold, fontSize: FontSizes.md },

  // TransactionRow
  txnRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 13, borderBottomWidth: 0.5, borderBottomColor: Colors.b1 },
  txnIcon:  { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txnInfo:  { flex: 1 },
  txnName:  { fontSize: FontSizes.md, fontWeight: FontWeights.medium, color: Colors.text1, marginBottom: 3 },
  txnDate:  { fontSize: FontSizes.xs, color: Colors.text3 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount:{ fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
  credit:   { color: Colors.brand },
  debit:    { color: Colors.text2 },
  txnPending: { fontSize: FontSizes.xs, color: Colors.warning, marginTop: 2 },
});
