// app/app/(tabs)/home.tsx
import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/stores/authStore';
import { useWallet, useTransactions, usePayoutMethods, QK } from '../../../src/hooks/useQueries';
import { WalletBand, TransactionRow } from '../../../src/components/wallet/WalletBand';
import { SectionHeader } from '../../../src/components/ui';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../../../src/utils/tokens';

// ── Quick action button ───────────────────────────────────────────────────────
function QuickAction({
  icon, label, color, onPress,
}: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.qaCell} onPress={onPress} activeOpacity={0.72}>
      <View style={[styles.qaIcon, { backgroundColor: color + '18' }]}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <Text style={styles.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Greeting by time-of-day ───────────────────────────────────────────────────
function greeting(t: (k: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return t('home.goodMorning');
  if (h < 18) return t('home.goodAfternoon');
  return t('home.goodEvening');
}

export default function HomeScreen() {
  const router  = useRouter();
  const { t }   = useTranslation();
  const qc      = useQueryClient();
  const user    = useAuthStore((s) => s.user);

  const { data: wallet,  isLoading: walletLoading  } = useWallet();
  const { data: txns, isLoading: txnsLoading, isError: txnsError, refetch: refetchTxns } = useTransactions();

  // Cash-out entry point only appears where the backend says it is actually
  // available — hiding a dead action beats showing one that always errors.
  const { data: payoutMethods } = usePayoutMethods(user?.country);

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: QK.wallet });
    qc.invalidateQueries({ queryKey: QK.transactions() });
  }, [qc]);

  const initials = user
    ? (user.firstName[0] + user.lastName[0]).toUpperCase()
    : '??';

  const recent = txns?.slice(0, 5) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={walletLoading || txnsLoading}
            onRefresh={onRefresh}
            tintColor={Colors.brand}
          />
        }
      >
        {/* Header */}
        <View style={styles.hdr}>
          <View>
            <Text style={styles.greetSub}>{greeting(t)},</Text>
            <Text style={styles.greetName}>{user?.firstName} {user?.lastName} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.push('/app/(tabs)/profile')}
          >
            <Text style={styles.avatarText}>{initials}</Text>
            {/* KYC warning dot */}
            {user?.kycStatus === 'none' && <View style={styles.kycDot} />}
          </TouchableOpacity>
        </View>

        {/* Wallet band */}
        <WalletBand
          wallet={wallet}
          loading={walletLoading}
          onTopUp={() => router.push('/app/topup')}
          onNewCard={() => router.push('/app/newcard')}
        />

        {/* Quick actions */}
        <SectionHeader title={t('home.quickActions')} />
        <View style={styles.qaGrid}>
          <QuickAction icon="↑"  label={t('home.topUp')}    color={Colors.brand}   onPress={() => router.push('/app/topup')} />
          <QuickAction icon="▭"  label={t('home.myCards')}  color={Colors.purple}  onPress={() => router.push('/app/(tabs)/cards')} />
          {payoutMethods?.available
            ? <QuickAction icon="↓" label={t('home.withdraw')} color={Colors.warning} onPress={() => router.push('/app/withdraw')} />
            : <QuickAction icon="⊕" label={t('cards.generate')} color={Colors.warning} onPress={() => router.push('/app/newcard')} />}
          <QuickAction icon="≡"  label={t('home.history')}  color={Colors.info}    onPress={() => router.push('/app/(tabs)/history')} />
        </View>

        {/* Recent transactions */}
        <SectionHeader
          title={t('home.recentActivity')}
          action={t('home.seeAll')}
          onAction={() => router.push('/app/(tabs)/history')}
        />

        <View style={styles.txnList}>
          {txnsLoading ? (
            [1,2,3].map(i => <View key={i} style={styles.skeletonRow} />)
          ) : txnsError ? (
            /* A failed request used to render as an empty list, which read as
               "you have no transactions". Those two states are now distinct. */
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('errors.loadFailed')}</Text>
              <Text style={styles.emptyHint}>{t('errors.checkConnection')}</Text>
              <TouchableOpacity onPress={() => refetchTxns()} style={{ marginTop: 12 }}>
                <Text style={{ color: Colors.brand, fontWeight: '600' }}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : recent.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('history.empty')}</Text>
              <Text style={styles.emptyHint}>{t('history.emptyHint')}</Text>
            </View>
          ) : (
            recent.map(txn => (
              <TransactionRow key={txn._id} txn={txn} />
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hdr: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  greetSub:  { fontSize: FontSizes.sm, color: Colors.text3, marginBottom: 2 },
  greetName: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.text1 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: Colors.brandOnBrand },
  kycDot: {
    position: 'absolute', top: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.danger, borderWidth: 2, borderColor: Colors.bg,
  },
  qaGrid: {
    flexDirection: 'row', paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between', marginBottom: Spacing.xxl,
  },
  qaCell: { alignItems: 'center', gap: 8 },
  qaIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: FontSizes.xs, color: Colors.text2, textAlign: 'center' },
  txnList: { paddingHorizontal: Spacing.xl },
  skeletonRow: {
    height: 56, borderRadius: Radii.md,
    backgroundColor: Colors.s2, marginBottom: Spacing.sm,
  },
  empty: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  emptyText: { fontSize: FontSizes.base, color: Colors.text2, fontWeight: FontWeights.medium, marginBottom: 6 },
  emptyHint: { fontSize: FontSizes.sm, color: Colors.text3 },
});
