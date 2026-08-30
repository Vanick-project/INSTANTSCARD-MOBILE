// src/stores/authStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Auth state — persisted securely via expo-secure-store.
// Never use AsyncStorage for tokens (unencrypted).
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  country: string;
  currency: string;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  isActive: boolean;
}

interface AuthState {
  user:         User | null;
  token:        string | null;
  refreshToken: string | null;
  isLoading:    boolean;
  isHydrated:   boolean;

  // Actions
  setAuth:  (user: User, token: string, refreshToken: string) => Promise<void>;
  logout:   () => Promise<void>;
  hydrate:  () => Promise<void>;
  setUser:  (user: User) => void;
}

const TOKEN_KEY         = 'instantcards_token';
const REFRESH_TOKEN_KEY = 'instantcards_refresh';
const USER_KEY          = 'instantcards_user';

// Legacy keys from the PayCarte-branded build. Any user who already has the old
// app installed has their session stored under these. Renaming the keys without
// migrating would silently log every existing user out on upgrade, so hydrate()
// falls back to these once and copies the values across.
// Safe to delete this block after one release cycle has shipped.
const LEGACY_KEYS = {
  token:   'paycarte_token',
  refresh: 'paycarte_refresh',
  user:    'paycarte_user',
} as const;

// Web LocalStorage shim for Expo SecureStore
const isWeb = Platform.OS === 'web';
const storage = {
  getItem: async (key: string) => {
    return isWeb ? localStorage.getItem(key) : SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (isWeb) {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  deleteItem: async (key: string) => {
    if (isWeb) {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user:         null,
  token:        null,
  refreshToken: null,
  isLoading:    false,
  isHydrated:   false,

  setAuth: async (user, token, refreshToken) => {
    await Promise.all([
      storage.setItem(TOKEN_KEY, token),
      storage.setItem(REFRESH_TOKEN_KEY, refreshToken),
      storage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    set({ user, token, refreshToken });
  },

  logout: async () => {
    await Promise.all([
      storage.deleteItem(TOKEN_KEY),
      storage.deleteItem(REFRESH_TOKEN_KEY),
      storage.deleteItem(USER_KEY),
    ]);
    set({ user: null, token: null, refreshToken: null });
  },

  hydrate: async () => {
    try {
      let [token, refreshToken, userStr] = await Promise.all([
        storage.getItem(TOKEN_KEY),
        storage.getItem(REFRESH_TOKEN_KEY),
        storage.getItem(USER_KEY),
      ]);

      // ── One-time migration from the legacy PayCarte-branded keys ──────────
      // Only runs when the new keys are empty AND a legacy session exists,
      // so it costs one extra read on a fresh install and nothing thereafter.
      if (!token) {
        const [lToken, lRefresh, lUser] = await Promise.all([
          storage.getItem(LEGACY_KEYS.token),
          storage.getItem(LEGACY_KEYS.refresh),
          storage.getItem(LEGACY_KEYS.user),
        ]);

        if (lToken && lRefresh) {
          token        = lToken;
          refreshToken = lRefresh;
          userStr      = lUser;

          // Write under the new keys, then drop the old ones.
          await Promise.all([
            storage.setItem(TOKEN_KEY, lToken),
            storage.setItem(REFRESH_TOKEN_KEY, lRefresh),
            ...(lUser ? [storage.setItem(USER_KEY, lUser)] : []),
          ]);
          await Promise.all([
            storage.deleteItem(LEGACY_KEYS.token),
            storage.deleteItem(LEGACY_KEYS.refresh),
            storage.deleteItem(LEGACY_KEYS.user),
          ]);
        }
      }

      const user = userStr ? (JSON.parse(userStr) as User) : null;
      set({ token, refreshToken, user, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },

  setUser: (user) => {
    storage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));
