// src/i18n/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// i18n setup — French primary, English secondary.
//
// MILESTONE 1 FIX: the previous version hardcoded `lng: 'fr'` and nothing in the
// entire app ever called `i18n.changeLanguage`. Both translation files were
// complete and every screen used t(), but there was no way for a user to reach
// the English one — the app was effectively French-only. The handoff (§13) asks
// for both languages with language selection, so this module now:
//
//   1. picks an initial language from the device locale on first launch,
//   2. lets the user override it (see setLanguage below),
//   3. persists that choice so it survives a restart.
//
// Persistence uses AsyncStorage-style secure storage already present in the app
// rather than adding a dependency. The stored value is a UI preference, not a
// secret, but it lives alongside the other stored preferences for consistency.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform, NativeModules } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import en from './locales/en.json';
import fr from './locales/fr.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'fr';   // primary market language

const LANGUAGE_KEY = 'instantcards_language';

const isWeb = Platform.OS === 'web';

async function readStored(): Promise<string | null> {
  try {
    return isWeb
      ? localStorage.getItem(LANGUAGE_KEY)
      : await SecureStore.getItemAsync(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

async function writeStored(lang: Language): Promise<void> {
  try {
    if (isWeb) localStorage.setItem(LANGUAGE_KEY, lang);
    else await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
  } catch {
    // A failed preference write must never break the app — the user simply
    // gets the default language again next launch.
  }
}

/**
 * Best-effort read of the device locale, used only on first launch.
 * Falls back to French, which is the primary market language: a user whose
 * device is set to anything other than English gets the language most of the
 * user base speaks, rather than English.
 */
function deviceLanguage(): Language {
  try {
    const locale: string =
      (isWeb
        ? (typeof navigator !== 'undefined' ? navigator.language : '')
        : NativeModules?.SettingsManager?.settings?.AppleLocale
          ?? NativeModules?.SettingsManager?.settings?.AppleLanguages?.[0]
          ?? NativeModules?.I18nManager?.localeIdentifier
      ) ?? '';

    return locale.toLowerCase().startsWith('en') ? 'en' : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function isSupported(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr } },
  compatibilityJSON: 'v3',
  lng: DEFAULT_LANGUAGE,     // replaced by initLanguage() once storage is read
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
});

/**
 * Resolve and apply the startup language.
 * Call once during app bootstrap, before the first screen renders.
 * Order of preference: stored user choice → device locale → French.
 */
export async function initLanguage(): Promise<Language> {
  const stored = await readStored();
  const lang: Language = isSupported(stored) ? stored : deviceLanguage();
  if (i18n.language !== lang) await i18n.changeLanguage(lang);
  return lang;
}

/**
 * Switch language and remember the choice.
 * This is the function the Profile screen's language picker calls — before
 * Milestone 1 no equivalent existed anywhere in the app.
 */
export async function setLanguage(lang: Language): Promise<void> {
  if (!isSupported(lang)) return;
  await i18n.changeLanguage(lang);
  await writeStored(lang);
}

/** The language currently in effect, normalised to a supported code. */
export function currentLanguage(): Language {
  const base = (i18n.language ?? DEFAULT_LANGUAGE).split('-')[0];
  return isSupported(base) ? base : DEFAULT_LANGUAGE;
}

export default i18n;
