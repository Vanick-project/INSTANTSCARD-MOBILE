// src/utils/tokens.ts
// ─────────────────────────────────────────────────────────────────────────────
// InstantCards Design Tokens
// Single source of truth — import from here everywhere, never hardcode values.
// ─────────────────────────────────────────────────────────────────────────────

export const Colors = {
  // Brand — Instantcards logo (forest green + gold accent)
  brand:       '#1B5E38',
  brandGold:   '#C9A227',
  brandDark:   '#0F3D24',
  brandDeep:   '#0A2A18',
  brandLight:  'rgba(27,94,56,0.14)',
  brandBorder: 'rgba(27,94,56,0.45)',

  // Backgrounds
  bg:       '#0A1628',   // app background
  bgCard:   '#111E33',   // elevated surfaces
  bgInput:  '#162236',   // input fields
  bgSheet:  '#0F1A2E',   // bottom sheets

  // Surface overlays (use on bg)
  s1: 'rgba(255,255,255,0.04)',
  s2: 'rgba(255,255,255,0.08)',
  s3: 'rgba(255,255,255,0.14)',

  // Borders
  b1: 'rgba(255,255,255,0.06)',
  b2: 'rgba(255,255,255,0.12)',
  b3: 'rgba(255,255,255,0.22)',

  // Text
  text1: '#FFFFFF',
  text2: 'rgba(255,255,255,0.65)',
  text3: 'rgba(255,255,255,0.38)',
  text4: 'rgba(255,255,255,0.22)',

  // Semantic
  success:     '#1B5E38',
  successBg:   'rgba(27,94,56,0.14)',
  danger:      '#E24B4A',
  dangerBg:    'rgba(226,75,74,0.12)',
  warning:     '#EF9F27',
  warningBg:   'rgba(239,159,39,0.12)',
  info:        '#378ADD',
  infoBg:      'rgba(55,138,221,0.12)',
  purple:      '#7F77DD',
  purpleBg:    'rgba(127,119,221,0.12)',

  // Network brand colors (providers)
  mtn:    '#FFCC00',
  orange: '#FF6600',
  wave:   '#1E90FF',
  airtel: '#E60000',
  mpesa:  '#00A550',
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const Radii = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 9999,
} as const;

export const FontSizes = {
  xs:   11,
  sm:   12,
  md:   14,
  base: 15,
  lg:   17,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,
} as const;

export const FontWeights = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
  black:   '800' as const,
};

// Shadows (Android elevation + iOS shadow)
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;
