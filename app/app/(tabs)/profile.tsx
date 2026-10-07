// app/app/(tabs)/profile.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../src/stores/authStore';
import { useWallet, useCards } from '../../../src/hooks/useQueries';
import { Divider } from '../../../src/components/ui';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '../../../src/utils/tokens';
import { setLanguage, currentLanguage, Language } from '../../../src/i18n';

// ── Menu row ──────────────────────────────────────────────────────────────────
function MenuItem({
  icon, title, subtitle, onPress, danger, rightContent,
}: {
  icon: string; title: string; subtitle?: string;
  onPress?: () => void; danger?: boolean; rightContent?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.72}>
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={styles.menuInfo}>
        <Text style={[styles.menuTitle, danger && { color: Colors.danger }]}>{title}</Text>
        {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
      {rightContent ?? (
        !danger && <Text style={styles.menuArrow}>›</Text>
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router  = useRouter();
  const { t, i18n } = useTranslation();

  // Track the active language so the row's badge and subtitle re-render on change.
  // i18n.language is the source of truth; this state just mirrors it locally.
  const [lang, setLang] = useState<Language>(currentLanguage());

  const choose = useCallback(async (next: Language) => {
    await setLanguage(next);
    setLang(next);
  }, []);

  const pickLanguage = useCallback(() => {
    const mark = (code: Language, label: string) =>
      (currentLanguage() === code ? `\u2713 ${label}` : label);

    Alert.alert(
      t('profile.selectLanguage'),
      undefined,
      [
        { text: mark('fr', t('profile.languageFrench')), onPress: () => choose('fr') },
        { text: mark('en', t('profile.languageEnglish')), onPress: () => choose('en') },
        { text: t('common.cancel'), style: 'cancel' },
      ],
      { cancelable: true },
    );
  }, [t, choose, i18n.language]);
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);
  const { data: wallet } = useWallet();
  const { data: cards  } = useCards();

  const activeCards = cards?.filter(c => c.status === 'active').length ?? 0;
  const cardSubtitle = activeCards > 0
    ? `${activeCards} carte${activeCards > 1 ? 's' : ''} active${activeCards > 1 ? 's' : ''}`
    : 'Aucune carte';

  const initials = user
    ? (user.firstName[0] + user.lastName[0]).toUpperCase()
    : '??';

  const kycColor = {
    none:     Colors.warning,
    pending:  Colors.info,
    verified: Colors.brand,
    rejected: Colors.danger,
  }[user?.kycStatus ?? 'none'];

  const kycLabel = {
    none:     t('profile.kycNone'),
    pending:  t('profile.kycPending'),
    verified: t('profile.kycVerified'),
    rejected: 'Vérification refusée',
  }[user?.kycStatus ?? 'none'];

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.logout'), style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/auth/splash');
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.userPhone}>{user?.phone}</Text>
            <Text style={styles.userCountry}>
              {user?.country} · {wallet?.currency ?? user?.currency}
            </Text>
          </View>
        </View>

        {/* KYC banner */}
        <TouchableOpacity
          style={[styles.kycBanner, { borderColor: kycColor + '50', backgroundColor: kycColor + '14' }]}
          onPress={() => router.push('/app/kyc')}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 22 }}>
            {user?.kycStatus === 'verified' ? '✓' : user?.kycStatus === 'pending' ? '⏳' : '🛡'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kycTitle, { color: kycColor }]}>{kycLabel}</Text>
            <Text style={styles.kycSub}>
              {user?.kycStatus === 'none'
                ? t('profile.kycNoneHint')
                : user?.kycStatus === 'pending'
                ? 'En cours de vérification...'
                : 'Votre identité est vérifiée'}
            </Text>
          </View>
          {user?.kycStatus !== 'verified' && (
            <Text style={[styles.menuArrow, { color: kycColor }]}>›</Text>
          )}
        </TouchableOpacity>

        {/* Account section */}
        <Text style={styles.sectionLabel}>COMPTE</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="👤" title={t('profile.personalInfo')} subtitle="Nom, email, téléphone" onPress={() => {}} />
          <Divider />
          <MenuItem icon="🛡" title={t('profile.identity')} subtitle={`KYC : ${kycLabel}`} onPress={() => router.push('/app/kyc')} />
          <Divider />
          <MenuItem icon="💳" title="Mes cartes" subtitle={cardSubtitle} onPress={() => router.push('/app/(tabs)/cards')} />
        </View>

        {/* Preferences section */}
        <Text style={styles.sectionLabel}>PRÉFÉRENCES</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="📊" title={t('profile.spendingLimits')} subtitle="Mensuel : 50 000 XOF" onPress={() => {}} />
          <Divider />
          {/* Language picker. Before Milestone 1 this row rendered a static "FR"
              badge with an empty onPress — both locale files were complete but
              there was no way for a user to reach the English one. */}
          <MenuItem
            icon="🌐"
            title={t('profile.language')}
            subtitle={lang === 'fr' ? t('profile.languageFrench') : t('profile.languageEnglish')}
            onPress={pickLanguage}
            rightContent={
              <View style={styles.langToggle}>
                <Text style={styles.langText}>{lang.toUpperCase()}</Text>
              </View>
            }
          />
          <Divider />
          <MenuItem icon="🔔" title={t('profile.notifications')} subtitle="Push, SMS" onPress={() => {}} />
          <Divider />
          <MenuItem icon="🔒" title={t('profile.security')} subtitle="PIN, Biométrie" onPress={() => {}} />
        </View>

        {/* Support section */}
        <Text style={styles.sectionLabel}>AIDE</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="💬" title={t('profile.support')} subtitle="Chat, Email, Téléphone" onPress={() => {}} />
          <Divider />
          <MenuItem icon="ℹ" title={t('profile.about')} subtitle="InstantCards v1.0.0" onPress={() => {}} />
        </View>

        {/* Logout */}
        <View style={[styles.menuCard, { marginBottom: Spacing['3xl'] }]}>
          <MenuItem icon="🚪" title={t('auth.logout')} onPress={handleLogout} danger />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header:      { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.text1 },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    backgroundColor: Colors.s1, borderRadius: Radii.xl,
    borderWidth: 0.5, borderColor: Colors.b1, padding: Spacing.xl,
  },
  avatar:     { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.brandOnBrand },
  userName:   { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.text1, marginBottom: 3 },
  userPhone:  { fontSize: FontSizes.sm, color: Colors.text3, marginBottom: 2 },
  userCountry:{ fontSize: FontSizes.xs, color: Colors.text3 },

  kycBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.xl,
    borderRadius: Radii.lg, borderWidth: 0.5, padding: Spacing.md,
  },
  kycTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.semibold, marginBottom: 2 },
  kycSub:   { fontSize: FontSizes.sm, color: Colors.text3, lineHeight: 18 },

  sectionLabel: {
    fontSize: FontSizes.xs, color: Colors.text3, fontWeight: FontWeights.semibold,
    letterSpacing: 0.7, paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm, marginTop: Spacing.md,
  },
  menuCard: {
    marginHorizontal: Spacing.xl, marginBottom: Spacing.xs,
    backgroundColor: Colors.s1, borderRadius: Radii.xl,
    borderWidth: 0.5, borderColor: Colors.b1, overflow: 'hidden',
  },
  menuItem:    { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  menuIcon:    { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.s2, alignItems: 'center', justifyContent: 'center' },
  menuIconDanger: { backgroundColor: Colors.dangerBg },
  menuInfo:    { flex: 1 },
  menuTitle:   { fontSize: FontSizes.md, fontWeight: FontWeights.medium, color: Colors.text1, marginBottom: 1 },
  menuSub:     { fontSize: FontSizes.xs, color: Colors.text3 },
  menuArrow:   { fontSize: 22, color: Colors.text3 },
  langToggle:  { backgroundColor: Colors.brandLight, borderRadius: Radii.sm, paddingHorizontal: 10, paddingVertical: 4 },
  langText:    { fontSize: FontSizes.xs, color: Colors.brand, fontWeight: FontWeights.semibold },
});
