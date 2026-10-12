// Temporary QA flag — set false (or delete this file + language screen) before client handoff.
export const SHOW_STARTUP_LANGUAGE_PICKER = true;

export type AuthEntryRoute = '/auth/language' | '/auth/splash';

export function authEntryPath(): AuthEntryRoute {
  return SHOW_STARTUP_LANGUAGE_PICKER ? '/auth/language' : '/auth/splash';
}
