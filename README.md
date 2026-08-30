# instantcards Mobile — React Native App

> Mobile money → Virtual VISA/Mastercard for Africa

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | **Expo SDK 51** (bare workflow) | Fastest path to iOS + Android; OTA updates; no Xcode/Android Studio needed for dev |
| Navigation | **Expo Router v3** (file-based) | Zero-config deep links; typed routes; matches Next.js mental model |
| State | **Zustand** | Tiny bundle, no boilerplate, persistent slices |
| Server state | **TanStack Query v5** | Stale-while-revalidate, optimistic updates, auto-retry |
| HTTP | **Axios** + auto-refresh interceptor | Silent 401 → refresh → retry; typed API helpers |
| Auth storage | **expo-secure-store** | AES-256 on-device; never AsyncStorage for tokens |
| i18n | **i18next** (FR default, EN fallback) | West Africa is majority French-speaking |
| Haptics | **expo-haptics** | Every meaningful interaction has tactile feedback |
| Clipboard | **expo-clipboard** | Copy card PAN/CVV with one tap |

---

## Project Structure

```
instantcards-mobile/
├── app/
│   ├── _layout.tsx          # Root: QueryClient, i18n, auth hydration, nav guard
│   ├── auth/
│   │   ├── _layout.tsx
│   │   ├── splash.tsx        # Onboarding
│   │   ├── register.tsx      # Sign up (country picker, phone, PIN)
│   │   └── login.tsx         # Phone → PIN two-step login
│   └── app/
│       ├── _layout.tsx
│       ├── tabs/
│       │   ├── _layout.tsx   # Bottom tab bar
│       │   ├── home.tsx      # Wallet balance, quick actions, recent txns
│       │   ├── cards.tsx     # Card carousel, stats, freeze/terminate
│       │   ├── history.tsx   # Filterable transactions grouped by month
│       │   └── profile.tsx   # User info, KYC banner, settings
│       ├── topup.tsx         # Mobile money top-up flow (provider → amount → confirm)
│       ├── newcard.tsx       # Generate VISA/Mastercard (network, purpose, limit)
│       ├── reveal.tsx        # PIN-gated card detail reveal (60s timer)
│       └── kyc.tsx           # Identity verification
│
└── src/
    ├── components/
    │   ├── ui/index.tsx         # Button, Input, PinInput, Surface, Badge, Divider
    │   ├── cards/               # VirtualCardDisplay
    │   └── wallet/              # WalletBand, TransactionRow
    ├── hooks/useQueries.ts      # All React Query hooks + typed interfaces
    ├── services/apiClient.ts    # Axios instance + auto-refresh + typed API
    ├── stores/authStore.ts      # Zustand auth + SecureStore persistence
    ├── utils/tokens.ts          # Design tokens (colors, spacing, radii, fonts)
    └── i18n/
        ├── index.ts
        └── locales/
            ├── fr.json          # French (default)
            └── en.json          # English
```

---

## Quick Start

### 1. Install dependencies

```bash
cd instantcards-mobile
npm install
```

### 2. Configure API URL

Create `.env.local`:
```
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000/api/v1
```

> Use your machine's LAN IP (not `localhost`) so the phone/emulator can reach the dev server.

### 3. Start Expo

```bash
npx expo start
```

Scan the QR with **Expo Go** on your phone, or press `a` for Android emulator / `i` for iOS simulator.

---

## Key Architecture Decisions

### Auth flow
```
App opens
  └── hydrate() reads token from SecureStore
        ├── token exists → /app/(tabs)/home
        └── no token     → /auth/splash

Login → JWT stored in SecureStore (AES-256)
Token expires → Axios interceptor silently refreshes, retries original request
Refresh fails → logout(), redirect to splash
```

### Data flow
```
Screen mounts → useQuery hook (React Query)
  └── cache hit (< staleTime) → render cached data instantly
  └── cache miss / stale    → fetch from API, update cache
  └── mutation succeeds      → invalidate relevant query keys → refetch
```

### Card security
- PAN + CVV returned **once** at card creation → shown, never stored on device
- Subsequent reveals require **PIN re-entry** → backend decrypts from AES-256 encrypted DB field
- Reveal screen auto-closes after **60 seconds**

---

## Connecting to the Backend

Make sure the **instantcards-api** is running:

```bash
cd instantcards-api
cp .env.example .env   # Fill in your provider API keys
npm install
npm run dev            # Starts on port 3000
```

The mobile app's `EXPO_PUBLIC_API_URL` must point to this server.

---

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Configure builds
eas build:configure

# Build for Android (.apk / .aab)
eas build --platform android

# Build for iOS (.ipa)
eas build --platform ios

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## Provider Integration Checklist

| Provider | Purpose | Region | Sign-up |
|----------|---------|--------|---------|
| **Flutterwave** | MoMo collection (MTN, Airtel, Orange) | GH, NG, KE, UG, TZ, CM | flutterwave.com |
| **CinetPay** | MoMo collection (XOF countries) | CI, SN, ML, BF, TG, BJ | cinetpay.com |
| **Sudo Africa** | Virtual card issuance (VISA/MC) | NG, GH + pan-African | sudo.africa |
| **Union54** | Card issuance fallback | Pan-African | union54.com |
| **Smile Identity** | KYC / document verification | 30+ African countries | smileidentity.com |

---

## Roadmap (v2)

- [ ] Biometric auth (Face ID / fingerprint) via `expo-local-authentication`
- [ ] Push notifications for card spend alerts (Expo Notifications + FCM/APNS)
- [ ] Card-to-card transfers between instantcards users
- [ ] Virtual card top-up from wallet (add funds to specific card)
- [ ] Spending analytics dashboard
- [ ] Multi-currency wallet (XOF + GHS + NGN in one account)
- [ ] Agent network for cash in/out
