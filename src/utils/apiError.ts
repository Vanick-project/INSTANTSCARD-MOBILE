// src/utils/apiError.ts
// ─────────────────────────────────────────────────────────────────────────────
// One place that turns any thrown value into a message worth showing a user.
//
// WHY (handoff §14 — "API response handling", "error states", "user feedback"):
// Screens previously did `e?.response?.data?.message ?? t('common.error')`
// inline, each slightly differently, and several swallowed failures entirely.
// That produced two bad outcomes: a network drop looked identical to an empty
// list, and backend error CODES — which are stable and translatable — were
// thrown away in favour of whatever English prose the server happened to send.
//
// This module prefers, in order:
//   1. a translation for the backend's error `code`   (stable, localised)
//   2. the backend's own `message`                     (specific, English)
//   3. a category message from the HTTP status         (generic, localised)
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '../i18n';

export interface NormalisedError {
  message:    string;
  code:       string | null;
  status:     number | null;
  /** True when retrying the same request could plausibly succeed. */
  retryable:  boolean;
  /** True when the failure is a lost/blocked connection rather than a server answer. */
  offline:    boolean;
}

/** Backend error codes that have a dedicated, translated message. */
const TRANSLATED_CODES = new Set([
  'UNSUPPORTED_COUNTRY',
  'MARKET_NOT_ENABLED',
  'PROVIDER_NOT_CONFIGURED',
  'CURRENCY_MISMATCH',
  'BELOW_MINIMUM',
  'ABOVE_MAXIMUM',
  'INSUFFICIENT_FUNDS',
  'WALLET_LOCKED',
  'WALLET_NOT_FOUND',
  'INVALID_PIN',
  'INVALID_NETWORK',
  'INVALID_DESTINATION',
  'PAYOUT_NOT_AVAILABLE',
  'PAYOUT_METHOD_UNAVAILABLE',
]);

export function normaliseError(err: any): NormalisedError {
  const status: number | null = err?.response?.status ?? null;
  const body = err?.response?.data;
  const code: string | null = body?.code ?? null;

  // No response at all → the request never reached the server.
  const offline = Boolean(err?.request) && !err?.response;

  let message: string;

  if (code && TRANSLATED_CODES.has(code)) {
    // i18n falls back to the key itself when missing, so check explicitly.
    const key = `errors.${code}`;
    const translated = i18n.t(key);
    message = translated === key ? (body?.message ?? i18n.t('common.error')) : translated;
  } else if (typeof body?.message === 'string' && body.message.trim()) {
    message = body.message;
  } else if (offline) {
    message = i18n.t('errors.offline');
  } else if (status && status >= 500) {
    message = i18n.t('errors.server');
  } else if (status === 401) {
    message = i18n.t('errors.unauthorised');
  } else if (status === 422 && Array.isArray(body?.errors) && body.errors.length) {
    // express-validator returns a list; the first one is the actionable one.
    message = body.errors[0]?.msg ?? i18n.t('common.error');
  } else {
    message = i18n.t('common.error');
  }

  // A 4xx is the server saying "no" — retrying unchanged will say no again.
  // Offline and 5xx are worth another attempt.
  const retryable = offline || (status != null && status >= 500) || status === null;

  return { message, code, status, retryable, offline };
}

/** Convenience for screens that only need the string. */
export function errorMessage(err: any): string {
  return normaliseError(err).message;
}
