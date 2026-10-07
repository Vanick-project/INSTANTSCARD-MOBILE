// src/config/markets.ts
// ─────────────────────────────────────────────────────────────────────────────
// Client-side view of the supported-markets list.
//
// The authoritative list lives on the backend (backend/src/config/markets.js)
// and is served by GET /api/v1/config/markets. This module fetches it and maps
// carrier codes onto the display metadata (brand name, colours) that only the
// app cares about.
//
// WHY: topup.tsx used to hardcode its own PROVIDERS table listing countries the
// backend did not support (CI, ML, BF). Users in those markets could start a
// top-up that the API rejected every time. The country list is now server-driven,
// so enabling a market is a backend deploy rather than an app store release.
//
// The FALLBACK_MARKETS constant below is a last-resort snapshot for the case
// where the config call fails on a cold start with no cache. It is intentionally
// conservative — Ghana only — because showing a market we cannot serve is the
// exact bug this file exists to prevent.
// ─────────────────────────────────────────────────────────────────────────────

export interface Market {
  country:   string;   // ISO 3166-1 alpha-2
  currency:  string;   // ISO 4217
  dialCode:  string;   // international prefix, no '+'
  minAmount: number;   // provider minimum, local currency units
  networks:  string[]; // carrier codes, e.g. ['MTN','VODAFONE']
}

export interface CarrierDisplay {
  network: string;     // carrier code, matches Market.networks entries
  name:    string;     // brand name shown to the user
  color:   string;     // brand background
  text:    string;     // readable foreground on that background
}

// Display metadata per carrier code. Purely cosmetic — the set of carriers
// actually offered comes from the server, never from this table. A carrier the
// server returns that is missing here still renders, with a neutral fallback.
const CARRIER_DISPLAY: Record<string, Omit<CarrierDisplay, 'network'>> = {
  MTN:        { name: 'MTN MoMo',      color: '#FFCC00', text: '#333333' },
  VODAFONE:   { name: 'Vodafone Cash', color: '#E60026', text: '#FFFFFF' },
  AIRTELTIGO: { name: 'AirtelTigo',    color: '#009CDE', text: '#FFFFFF' },
  AIRTEL:     { name: 'Airtel Money',  color: '#E60000', text: '#FFFFFF' },
  MPESA:      { name: 'M-Pesa',        color: '#00A550', text: '#FFFFFF' },
  TIGO:       { name: 'Tigo Pesa',     color: '#00539F', text: '#FFFFFF' },
  ORANGE:     { name: 'Orange Money',  color: '#FF6600', text: '#FFFFFF' },
  WAVE:       { name: 'Wave',          color: '#1E90FF', text: '#FFFFFF' },
  MOOV:       { name: 'Moov Money',    color: '#0066B3', text: '#FFFFFF' },
  FREE:       { name: 'Free Money',    color: '#CD1719', text: '#FFFFFF' },
};

const NEUTRAL_DISPLAY = { name: '', color: '#2A3441', text: '#FFFFFF' };

/** Display metadata for a carrier code, with a safe fallback for unknown codes. */
export function carrierDisplay(network: string): CarrierDisplay {
  const meta = CARRIER_DISPLAY[network] ?? { ...NEUTRAL_DISPLAY, name: network };
  return { network, ...meta };
}

/**
 * The carriers to offer for a market, ready to render.
 * Returns [] for a country with no carrier picker (Nigeria is USSD-based —
 * Flutterwave detects the network from the phone number, so the app must not
 * ask the user to choose one).
 */
export function carriersFor(market: Market | undefined): CarrierDisplay[] {
  if (!market) return [];
  return market.networks.map(carrierDisplay);
}

/**
 * Cold-start fallback. Deliberately minimal: one market we are certain works.
 * If this is ever what the user sees, the config request failed — the UI should
 * surface that rather than silently pretending this is the full list.
 */
export const FALLBACK_MARKETS: Market[] = [
  { country: 'CM', currency: 'XAF', dialCode: '237', minAmount: 100,
    networks: ['MTN', 'ORANGE'] },
];

/** Default top-up fee in basis points, used only until the server responds. */
export const FALLBACK_FEE_BPS = 150;

export const FALLBACK_CARD_GENERATION_FEE_XAF = 2000;
