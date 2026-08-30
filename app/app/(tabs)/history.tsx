// app/app/(tabs)/history.tsx
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, RefreshControl,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTransactions, QK, Transaction } from '../../../src/hooks/useQueries';
import { TransactionRow } from '../../../src/components/wallet/WalletBand';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../../../src/utils/tokens';

type FilterType = 'all' | 'topup' | 'card_debit' | 'card_generation_fee';

const FILTERS: { key: FilterType; labelKey: string }[] = [
  { key: 'all',                  labelKey: 'history.all'       },
  { key: 'topup',                labelKey: 'history.topups'    },
  { key: 'card_debit',           labelKey: 'history.cardSpend' },
  { key: 'card_generation_fee',  labelKey: 'history.fees'      },
];

export default function HistoryScreen() {
  const { t }  = useTranslation();
  const qc     = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: txns, isLoading, isError, refetch } = useTransactions(
    filter === 'all' ? undefined : filter
  );

  // Group by month ─────────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    if (!txns) return [];
    const map = new Map<string, Transaction[]>();
    for (const txn of txns) {
      const key = format(new Date(txn.createdAt), 'MMMM yyyy', { locale: fr });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(txn);
    }
    return Array.from(map.entries());
  }, [txns]);

  // Monthly totals ─────────────────────────────────────────────────────────────
  const totalIn = txns
    ?.filter(t => t.type === 'topup')
    .reduce((s, t) => s + t.amount, 0) ?? 0;

  const totalOut = txns
    ?.filter(t => t.type === 'card_debit' || t.type === 'card_generation_fee')
    .reduce((s, t) => s + t.amount, 0) ?? 0;

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('history.title')}</Text>
      </View>

      {/* Summary strip */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Crédits</Text>
          <Text style={[styles.summaryValue, { color: Colors.brand }]}>+{fmt(totalIn)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Débits</Text>
          <Text style={[styles.summaryValue, { color: Colors.danger }]}>-{fmt(totalOut)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text style={[styles.summaryValue, { color: totalIn - totalOut >= 0 ? Colors.brand : Colors.danger }]}>
            {totalIn - totalOut >= 0 ? '+' : ''}{fmt(totalIn - totalOut)}
          </Text>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={{ flexGrow: 0 }}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {t(f.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => {
            qc.invalidateQueries({ queryKey: QK.transactions() });
          }} tintColor={Colors.brand} />
        }
      >
        {isLoading ? (
          <View style={{ padding: Spacing.xl }}>
            {[1,2,3,4,5].map(i => (
              <View key={i} style={styles.skeleton} />
            ))}
          </View>
        ) : isError ? (
          /* Distinguish a failed load from a genuinely empty history — these
             rendered identically before, so a network drop looked like "no
             transactions yet" and the user had no way to retry. */
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyText}>{t('errors.loadFailed')}</Text>
            <Text style={styles.emptyHint}>{t('errors.checkConnection')}</Text>
            <TouchableOpacity onPress={() => refetch()} style={{ marginTop: Spacing.lg }}>
              <Text style={{ color: Colors.brand, fontWeight: FontWeights.semibold }}>
                {t('common.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : grouped.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>{t('history.empty')}</Text>
            <Text style={styles.emptyHint}>{t('history.emptyHint')}</Text>
          </View>
        ) : (
          grouped.map(([month, items]) => (
            <View key={month}>
              <View style={styles.monthSep}>
                <Text style={styles.monthText}>{month.toUpperCase()}</Text>
                <Text style={styles.monthCount}>{items.length} opérations</Text>
              </View>
              <View style={styles.txnGroup}>
                {items.map(txn => (
                  <TransactionRow key={txn._id} txn={txn} />
                ))}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:    { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  title:     { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.text1 },

  summary:   {
    flexDirection: 'row', marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    backgroundColor: Colors.s1, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.b1,
    padding: Spacing.md,
  },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryLabel:   { fontSize: FontSizes.xs, color: Colors.text3, marginBottom: 4 },
  summaryValue:   { fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  summaryDivider: { width: 0.5, backgroundColor: Colors.b1, marginVertical: 4 },

  filters: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, paddingBottom: Spacing.md },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radii.full, borderWidth: 0.5, borderColor: Colors.b2,
    backgroundColor: 'transparent',
  },
  filterChipActive: { borderColor: Colors.brand, backgroundColor: Colors.brandLight },
  filterText:       { fontSize: FontSizes.sm, color: Colors.text2 },
  filterTextActive: { color: Colors.brand, fontWeight: FontWeights.medium },

  monthSep:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  monthText:  { fontSize: FontSizes.xs, color: Colors.text3, fontWeight: FontWeights.semibold, letterSpacing: 0.7 },
  monthCount: { fontSize: FontSizes.xs, color: Colors.text3 },
  txnGroup:   { paddingHorizontal: Spacing.xl },

  skeleton: { height: 58, borderRadius: Radii.md, backgroundColor: Colors.s2, marginBottom: Spacing.sm },

  empty:     { alignItems: 'center', paddingVertical: Spacing['5xl'] },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
  emptyText: { fontSize: FontSizes.lg, fontWeight: FontWeights.medium, color: Colors.text2, marginBottom: 6 },
  emptyHint: { fontSize: FontSizes.sm, color: Colors.text3 },
});
