// src/services/apiClient.ts
// ─────────────────────────────────────────────────────────────────────────────
// Axios instance wired to the InstantCards backend.
//   - JWT injected on every request
//   - Silent token refresh on 401 (one retry, queued parallel requests)
//   - Dev-mode request/response logging
//   - Typed API surface — every backend endpoint has a typed helper here
// ─────────────────────────────────────────────────────────────────────────────
import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../stores/authStore';

// Set EXPO_PUBLIC_API_URL in .env.local (gitignored).
// Sandbox: EXPO_PUBLIC_API_URL=https://YOUR-NGROK-URL.ngrok-free.app/api/v1
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Dev logging ───────────────────────────────────────────────────────────────
if (__DEV__) {
  apiClient.interceptors.request.use((config) => {
    console.log(`→ ${config.method?.toUpperCase()} ${config.url}`, config.data ?? '');
    return config;
  });
  apiClient.interceptors.response.use(
    (res) => {
      console.log(`← ${res.status} ${res.config.url}`);
      return res;
    },
    (err) => {
      console.warn(`✗ ${err.response?.status ?? 'NET'} ${err.config?.url}`, err.response?.data);
      return Promise.reject(err);
    }
  );
}

// ── JWT injection ─────────────────────────────────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Silent 401 refresh ────────────────────────────────────────────────────────
// When any request returns 401:
//   1. Pause all in-flight requests into a queue
//   2. Fetch a new token pair using the stored refresh token
//   3. Retry the original + all queued requests with the new token
//   4. If refresh fails → logout and redirect to splash
let isRefreshing = false;
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

const flushQueue = (err: unknown, token: string | null) => {
  failedQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
            resolve(apiClient(original));
          },
          reject,
        });
      });
    }
    original._retry = true;
    isRefreshing    = true;
    try {
      const { refreshToken, setAuth, user } = useAuthStore.getState();
      if (!refreshToken) throw new Error('No refresh token stored');
      const { data } = await apiClient.post('/auth/refresh', { refreshToken });
      const { token: newToken, refreshToken: newRefresh } = data.data;
      await setAuth(user!, newToken, newRefresh);
      flushQueue(null, newToken);
      original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
      return apiClient(original);
    } catch (refreshErr) {
      flushQueue(refreshErr, null);
      await useAuthStore.getState().logout();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Typed API surface — every backend route is represented here.
// Screens never construct URLs themselves.
// ─────────────────────────────────────────────────────────────────────────────
export const api = {

  // ── Config ──────────────────────────────────────────────────────────────────
  // Supported markets + carriers, server-driven. Unauthenticated: the register
  // screen needs the country list before a user exists.
  getMarkets: () =>
    apiClient.get('/config/markets'),

  getAppFees: (country?: string) =>
    apiClient.get('/config/fees', { params: country ? { country } : undefined }),

  // ── Auth ────────────────────────────────────────────────────────────────────
  register: (body: {
    firstName: string; lastName: string; phone: string;
    pin: string; country: string; email?: string;
  }) => apiClient.post('/auth/register', body),

  login: (phone: string, pin: string) =>
    apiClient.post('/auth/login', { phone, pin }),

  refreshTokens: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),

  changePin: (currentPin: string, newPin: string) =>
    apiClient.post('/auth/change-pin', { currentPin, newPin }),

  registerDeviceToken: (token: string) =>
    apiClient.post('/auth/device-token', { token }),

  // ── User ────────────────────────────────────────────────────────────────────
  getMe: () =>
    apiClient.get('/users/me'),

  updateMe: (body: { firstName?: string; lastName?: string; email?: string }) =>
    apiClient.patch('/users/me', body),

  // Consent is optional at the API boundary but the server validates it
  // strictly when present: all four fields required, granted must be true,
  // granted_at not more than a minute in the future.
  submitKyc: (body: {
    docType: string;
    docNumber: string;
    consent?: {
      granted: true;
      granted_at: string;
      notice_language: string;
      notice_privacy_policy_url: string;
    };
  }) => apiClient.post('/users/kyc', body),

  getKycStatus: () => apiClient.get('/users/kyc'),

  // ── Wallet ──────────────────────────────────────────────────────────────────
  getWallet: () =>
    apiClient.get('/wallet'),

  getTransactions: (params?: { page?: number; limit?: number; type?: string }) =>
    apiClient.get('/wallet/transactions', { params }),

  // ── Top-up ──────────────────────────────────────────────────────────────────
  // Step 1 — initiate charge (API 1 → Flutterwave POST /charges)
  initiateTopup: (body: {
    amount: number; country: string; phone: string; network?: string;
  }) => apiClient.post('/topup/initiate', body),

  // Step 1b — OTP sub-step (Vodafone Ghana only)
  validateOtp: (body: { flwRef: string; otp: string; reference: string }) =>
    apiClient.post('/topup/validate-otp', body),

  // Polling fallback — GET /topup/verify/:ref (API 2 → FLW verify)
  verifyTopup: (reference: string) =>
    apiClient.get(`/topup/verify/${reference}`),

  getTopupHistory: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/topup/history', { params }),

  // ── Cash-out (payouts) ──────────────────────────────────────────────────────
  // Handoff §10: Main Wallet → External Cash-Out Method.
  getPayoutMethods: (country?: string) =>
    apiClient.get('/payouts/methods', { params: country ? { country } : undefined }),

  quotePayout: (body: { amount: number; country?: string }) =>
    apiClient.post('/payouts/quote', body),

  // PIN-confirmed: a withdrawal cannot be undone by the user, so a live access
  // token alone is not sufficient authorisation.
  requestPayout: (body: {
    amount: number;
    method: 'mobile_money' | 'bank';
    pin: string;
    destination: {
      country?: string; network?: string; phone?: string;
      bankCode?: string; accountNumber?: string; accountName?: string;
    };
  }) => apiClient.post('/payouts', body),

  getPayouts: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/payouts', { params }),

  getPayout: (reference: string) =>
    apiClient.get(`/payouts/${reference}`),

  // ── Cards ───────────────────────────────────────────────────────────────────
  generateCard: (body: {
    network: 'visa' | 'mastercard'; spendingLimit: number; purpose?: string[];
  }) => apiClient.post('/cards/generate', body),

  getCards:   () => apiClient.get('/cards'),
  getCard:    (id: string) => apiClient.get(`/cards/${id}`),
  revealCard: (id: string, pin: string) => apiClient.post(`/cards/${id}/reveal`, { pin }),
  freezeCard:    (id: string) => apiClient.patch(`/cards/${id}/freeze`),
  unfreezeCard:  (id: string) => apiClient.patch(`/cards/${id}/unfreeze`),
  terminateCard: (id: string) => apiClient.delete(`/cards/${id}`),
};

export default api;
