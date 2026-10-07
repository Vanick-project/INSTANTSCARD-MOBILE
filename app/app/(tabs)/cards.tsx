// app/app/(tabs)/cards.tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCards, useFreezeCard, useTerminateCard, VirtualCard } from '../../../src/hooks/useQueries';
import { VirtualCardDisplay } from '../../../src/components/cards/VirtualCardDisplay';
import { Button, Badge, SectionHeader, Divider } from '../../../src/components/ui';
import { TransactionRow } from '../../../src/components/wallet/WalletBand';
import { useTransactions } from '../../../src/hooks/useQueries';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../../../src/utils/tokens';

export default function CardsScreen() {
  const router = useRouter();
  const { t }  = useTranslation();

  const { data: cards, isLoading } = useCards();
  const { data: txns } = useTransactions('card_debit');
  const freezeMutation    = useFreezeCard();
  const terminateMutation = useTerminateCard();

  const [activeIdx, setActiveIdx] = useState(0);
  const activeCard: VirtualCard | undefined = cards?.[activeIdx];

  const handleFreeze = () => {
    if (!activeCard) return;
    const isFrozen = activeCard.status === 'frozen';
    Alert.alert(
      isFrozen ? t('cards.unfreeze') : t('cards.freeze'),
      isFrozen ? 'Réactiver cette carte ?' : 'Geler temporairement cette carte ?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => freezeMutation.mutate({ id: activeCard._id, frozen: !isFrozen }),
        },
      ]
    );
  };

  const handleTerminate = () => {
    if (!activeCard) return;
    Alert.alert(
      t('cards.terminate'),
      t('cards.terminateConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('cards.terminate'),
          style: 'destructive',
          onPress: async () => {
            try {
              await terminateMutation.mutateAsync(activeCard._id);
            } catch {
              Alert.alert(t('common.error'));
            }
          },
        },
      ]
    );
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!isLoading && (!cards || cards.length === 0)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('cards.title')}</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyTitle}>{t('cards.noCards')}</Text>
          <Text style={styles.emptyHint}>{t('cards.noCardsHint')}</Text>
          <Button
            label={t('cards.generate')}
            onPress={() => router.push('/app/newcard')}
            style={{ marginTop: Spacing.xl, paddingHorizontal: 32 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('cards.title')}</Text>
        <TouchableOpacity onPress={() => router.push('/app/newcard')} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ {t('cards.generate')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Loading skeleton */}
        {isLoading ? (
          <View style={styles.skeleton} />
        ) : (
          <>
            {/* Card carousel */}
            <ScrollView
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (e.nativeEvent.layoutMeasurement.width - Spacing.xl * 2));
                setActiveIdx(Math.max(0, Math.min(idx, (cards?.length ?? 1) - 1)));
              }}
              style={{ paddingLeft: Spacing.xl }}
              contentContainerStyle={{ gap: Spacing.md }}
            >
              {cards?.map((card) => (
                <View key={card._id} style={{ width: 320 }}>
                  <VirtualCardDisplay card={card} onPress={() => router.push('/app/reveal')} />
                </View>
              ))}
            </ScrollView>

            {/* Pagination dots */}
            {(cards?.length ?? 0) > 1 && (
              <View style={styles.dots}>
                {cards?.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeIdx && styles.dotActive]} />
                ))}
              </View>
            )}

            {/* Stats row */}
            {activeCard && (
              <View style={styles.statsRow}>
                <StatCard label={t('common.balance')} value={
                  new Intl.NumberFormat('fr-FR').format(activeCard.balance) + ' ' + activeCard.currency
                } accent />
                <StatCard label={t('cards.spent')} value={
                  new Intl.NumberFormat('fr-FR').format(activeCard.totalSpent) + ' ' + activeCard.currency
                } />
                <StatCard label={t('common.status')} value={
                  activeCard.status === 'active' ? t('common.active') :
                  activeCard.status === 'frozen' ? t('common.frozen') : 'Résiliée'
                } accent={activeCard.status === 'active'} />
              </View>
            )}

            {/* Action row */}
            {activeCard && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push({ pathname: '/app/reveal', params: { cardId: activeCard._id } })}
                >
                  <Text style={styles.actionBtnText}>{t('cards.reveal')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  onPress={() => router.push('/app/newcard')}
                >
                  <Text style={[styles.actionBtnText, { color: Colors.brandOnBrand, fontWeight: FontWeights.semibold }]}>
                    + Nouvelle
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                  onPress={handleFreeze}
                >
                  {freezeMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.danger} />
                  ) : (
                    <Text style={[styles.actionBtnText, { color: Colors.danger }]}>
                      {activeCard.status === 'frozen' ? t('cards.unfreeze') : t('cards.freeze')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Card transactions */}
        <SectionHeader title={t('cards.activity')} />
        <View style={{ paddingHorizontal: Spacing.xl }}>
          {txns?.slice(0, 8).map(txn => (
            <TransactionRow key={txn._id} txn={txn} />
          ))}
          {(!txns || txns.length === 0) && (
            <Text style={{ color: Colors.text3, fontSize: FontSizes.sm, textAlign: 'center', paddingVertical: Spacing.xl }}>
              Aucune activité carte
            </Text>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, accent && { color: Colors.brand }]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card:  { flex: 1, backgroundColor: Colors.s1, borderRadius: Radii.lg, padding: Spacing.md, borderWidth: 0.5, borderColor: Colors.b1 },
  label: { fontSize: FontSizes.xs, color: Colors.text3, marginBottom: 5 },
  value: { fontSize: FontSizes.lg, fontWeight: FontWeights.semibold, color: Colors.text1 },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
  },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.text1 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.full, backgroundColor: Colors.brandLight, borderWidth: 0.5, borderColor: Colors.brandBorder },
  addBtnText: { fontSize: FontSizes.sm, color: Colors.brand, fontWeight: FontWeights.medium },
  skeleton: { height: 200, marginHorizontal: Spacing.xl, borderRadius: Radii.xxl, backgroundColor: Colors.s2 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: Spacing.md, marginBottom: Spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.b2 },
  dotActive: { width: 18, backgroundColor: Colors.brand },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.xl, marginBottom: Spacing.md },
  actions: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.xxl },
  actionBtn: { flex: 1, paddingVertical: 13, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.b2, backgroundColor: Colors.s1, alignItems: 'center' },
  actionBtnPrimary: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  actionBtnDanger:  { borderColor: 'rgba(226,75,74,0.3)', backgroundColor: Colors.dangerBg },
  actionBtnText:    { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, color: Colors.text2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['3xl'] },
  emptyIcon:  { fontSize: 56, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.text1, marginBottom: Spacing.sm },
  emptyHint:  { fontSize: FontSizes.md, color: Colors.text2, textAlign: 'center', lineHeight: 22 },
});
