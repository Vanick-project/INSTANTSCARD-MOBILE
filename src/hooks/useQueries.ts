// src/hooks/useQueries.ts
// All React Query hooks. Every mutationFn matches the real backend exactly.
import {
  useQuery, useMutation, useQueryClient, UseQueryOptions,
} from '@tanstack/react-query';
import api from '../services/apiClient';
import { Market, FALLBACK_MARKETS, FALLBACK_FEE_BPS } from '../config/markets';

export const QK = {
  wallet:       ['wallet']                    as const,
  transactions: (type?: string) => ['transactions', type] as const,
  cards:        ['cards']                     as const,
  card:         (id: string) => ['card', id]  as const,
  me:           ['me']                        as const,
  markets:      ['markets']                   as const,
  payoutMethods:(country?: string) => ['payoutMethods', country] as const,
  payouts:      ['payouts']                   as const,
  payout:       (ref: string) => ['payout', ref] as const,
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Wallet       { _id: string; balance: number; currency: string; isLocked: boolean; }
export interface Transaction  { _id: string; type: string; status: string; amount: number; fee: number; currency: string; description: string; reference: string; externalRef?: string; createdAt: string; cardId?: string; }
export interface VirtualCard  { _id: string; network: 'visa'|'mastercard'; maskedPan: string; expiryMonth: string; expiryYear: string; nameOnCard: string; currency: string; balance: number; totalSpent: number; spendingLimit: number; status: 'active'|'frozen'|'terminated'; purpose: string[]; createdAt: string; }
export interface UserProfile  { _id: string; firstName: string; lastName: string; phone: string; email?: string; country: string; currency: string; kycStatus: 'none'|'pending'|'verified'|'rejected'; isActive: boolean; }
export interface GeneratedCardSecret { cardId: string; pan: string; cvv: string; maskedPan: string; expiryMonth: string; expiryYear: string; nameOnCard: string; network: string; currency: string; status: string; }
export interface CardDetails  { pan: string; cvv: string; expiryMonth: string; expiryYear: string; nameOnCard: string; }

// ── Queries ───────────────────────────────────────────────────────────────────
export function useWallet(options?: UseQueryOptions<Wallet>) {
  return useQuery({ queryKey: QK.wallet, queryFn: async () => (await api.getWallet()).data.data as Wallet, staleTime: 30_000, ...options });
}

export function useTransactions(type?: string) {
  return useQuery({ queryKey: QK.transactions(type), queryFn: async () => { const res = await api.getTransactions({ limit: 50, type }); return res.data.data as Transaction[]; }, staleTime: 20_000 });
}

export function useCards() {
  return useQuery({ queryKey: QK.cards, queryFn: async () => (await api.getCards()).data.data as VirtualCard[], staleTime: 60_000 });
}

export function useMe(options?: UseQueryOptions<UserProfile>) {
  return useQuery({ queryKey: QK.me, queryFn: async () => (await api.getMe()).data.data as UserProfile, staleTime: 5 * 60_000, ...options });
}

// ── Supported markets ─────────────────────────────────────────────────────────
// Server-driven country + carrier list. Replaces the hardcoded PROVIDERS table
// that used to live in topup.tsx and disagreed with the backend.
//
// Long staleTime: this changes on backend deploy, not per session. `isFallback`
// tells the UI it is showing the cold-start snapshot rather than the real list,
// so it can warn instead of silently offering a truncated set of markets.
export interface MarketsResult {
  markets:    Market[];
  feeBps:     number;
  isFallback: boolean;
}

export function useMarkets() {
  return useQuery<MarketsResult>({
    queryKey: QK.markets,
    queryFn: async () => {
      const res = await api.getMarkets();
      return {
        markets:    res.data.data as Market[],
        feeBps:     res.data.meta?.topupFeeBps ?? FALLBACK_FEE_BPS,
        isFallback: false,
      };
    },
    staleTime: 60 * 60_000,   // 1 hour
    gcTime:    24 * 60 * 60_000,
    retry: 2,
    placeholderData: {
      markets:    FALLBACK_MARKETS,
      feeBps:     FALLBACK_FEE_BPS,
      isFallback: true,
    },
  });
}

// ── Cash-out ─────────────────────────────────────────────────────────────────
export interface PayoutMethods {
  country: string;
  methods: ('mobile_money' | 'bank')[];
  available: boolean;
  minAmount: number;
  maxAmount: number;
  feeBps: number;
}

export interface Payout {
  _id: string;
  reference: string;
  status: 'pending'|'processing'|'sent'|'success'|'failed'|'reversed'|'rejected';
  amount: number; fee: number; total: number; currency: string;
  method: 'mobile_money'|'bank';
  destination: { country: string; network?: string; phone?: string; accountNumber?: string; accountName?: string };
  failureReason?: string;
  createdAt: string;
}

/**
 * Whether cash-out is offered at all for this user's country.
 * Returns available:false until the backend has the market enabled AND the
 * payout provider is configured, so the app hides the entry point rather than
 * offering an action that is guaranteed to fail.
 */
export function usePayoutMethods(country?: string) {
  return useQuery<PayoutMethods>({
    queryKey: QK.payoutMethods(country),
    queryFn: async () => (await api.getPayoutMethods(country)).data.data as PayoutMethods,
    staleTime: 10 * 60_000,
  });
}

export function usePayouts() {
  return useQuery<Payout[]>({
    queryKey: QK.payouts,
    queryFn: async () => (await api.getPayouts({ limit: 50 })).data.data as Payout[],
    staleTime: 20_000,
  });
}

export function useRequestPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.requestPayout>[0]) =>
      api.requestPayout(body).then(r => r.data.data as Payout & { outcome: string; message: string }),
    onSuccess: () => {
      // A payout changes the balance and adds ledger rows — refresh both.
      qc.invalidateQueries({ queryKey: QK.wallet });
      qc.invalidateQueries({ queryKey: QK.transactions() });
      qc.invalidateQueries({ queryKey: QK.payouts });
    },
  });
}

/** The current user's market, or undefined while markets are loading. */
export function useCurrentMarket(country: string | undefined) {
  const { data } = useMarkets();
  return data?.markets.find(m => m.country === country);
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useGenerateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { network: 'visa'|'mastercard'; spendingLimit: number; purpose?: string[] }) =>
      api.generateCard(body).then(r => r.data.data as GeneratedCardSecret),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.cards }); qc.invalidateQueries({ queryKey: QK.wallet }); qc.invalidateQueries({ queryKey: QK.transactions() }); },
  });
}

export function useFreezeCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, frozen }: { id: string; frozen: boolean }) => frozen ? api.freezeCard(id) : api.unfreezeCard(id),
    onMutate: async ({ id, frozen }) => {
      await qc.cancelQueries({ queryKey: QK.cards });
      const prev = qc.getQueryData<VirtualCard[]>(QK.cards);
      qc.setQueryData<VirtualCard[]>(QK.cards, old => old?.map(c => c._id === id ? { ...c, status: frozen ? 'frozen' : 'active' } : c));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(QK.cards, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: QK.cards }),
  });
}

export function useTerminateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.terminateCard(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QK.cards });
      const prev = qc.getQueryData<VirtualCard[]>(QK.cards);
      qc.setQueryData<VirtualCard[]>(QK.cards, old => old?.map(c => c._id === id ? { ...c, status: 'terminated' as const } : c));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(QK.cards, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: QK.cards }),
  });
}

export function useRevealCard() {
  return useMutation({ mutationFn: ({ id, pin }: { id: string; pin: string }) => api.revealCard(id, pin).then(r => r.data.data as CardDetails) });
}

export function useSubmitKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.submitKyc>[0]) => api.submitKyc(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.me }),
  });
}
