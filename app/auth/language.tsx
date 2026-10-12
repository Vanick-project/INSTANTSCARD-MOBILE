// app/auth/language.tsx — temporary startup language picker (see featureFlags.ts)
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BrandLogo } from '../../src/components/BrandLogo';
import {
  setLanguage,
  currentLanguage,
  SUPPORTED_LANGUAGES,
  type Language,
} from '../../src/i18n';
import { BrandGradient, Colors, Spacing, FontSizes, FontWeights, Radii } from '../../src/utils/tokens';

const LABELS: Record<Language, { native: string; hint: string }> = {
  fr: { native: 'Français', hint: 'Langue principale' },
  en: { native: 'English', hint: 'For testing & review' },
};

export default function LanguagePickerScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Language>(currentLanguage());
  const [busy, setBusy] = useState(false);

  const continueWith = useCallback(async (lang: Language) => {
    if (busy) return;
    setBusy(true);
    setSelected(lang);
    await setLanguage(lang);
    router.replace('/auth/splash');
  }, [busy, router]);

  return (
    <LinearGradient colors={[...BrandGradient.splash]} style={styles.container}>
      <View style={styles.header}>
        <BrandLogo width={200} />
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.titleSecondary}>Choisissez votre langue</Text>
        <Text style={styles.subtitle}>You can change this later in Profile.</Text>
      </View>

      <View style={styles.options}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const active = selected === lang;
          const { native, hint } = LABELS[lang];
          return (
            <Pressable
              key={lang}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => continueWith(lang)}
              disabled={busy}
            >
              <View style={styles.optionText}>
                <Text style={styles.optionNative}>{native}</Text>
                <Text style={styles.optionHint}>{hint}</Text>
              </View>
              <Text style={styles.chevron}>→</Text>
            </Pressable>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing['3xl'],
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    marginTop: Spacing.xl,
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    color: Colors.text1,
    textAlign: 'center',
  },
  titleSecondary: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.medium,
    color: Colors.text2,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.md,
    fontSize: FontSizes.sm,
    color: Colors.text3,
    textAlign: 'center',
    lineHeight: 20,
  },
  options: {
    gap: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.s2,
    borderWidth: 1,
    borderColor: Colors.b2,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  optionActive: {
    borderColor: Colors.brand,
    backgroundColor: 'rgba(26, 86, 56, 0.25)',
  },
  optionText: { flex: 1 },
  optionNative: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.text1,
  },
  optionHint: {
    marginTop: 4,
    fontSize: FontSizes.sm,
    color: Colors.text3,
  },
  chevron: {
    fontSize: FontSizes.xl,
    color: Colors.brandGold,
    marginLeft: Spacing.md,
  },
});
