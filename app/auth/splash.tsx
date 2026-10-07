// app/auth/splash.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../src/components/ui';
import { BrandLogo } from '../../src/components/BrandLogo';
import { BrandGradient, Colors, Spacing, FontSizes, FontWeights, Radii } from '../../src/utils/tokens';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { t }  = useTranslation();

  return (
    <LinearGradient
      colors={[...BrandGradient.splash]}
      style={styles.container}
    >
      {/* Visual */}
      <View style={styles.visual}>
        {[280, 220, 160].map((size, i) => (
          <View key={i} style={[styles.ring, { width: size, height: size, borderRadius: size / 2, opacity: 0.15 + i * 0.1 }]} />
        ))}
        <BrandLogo width={Math.min(width * 0.72, 280)} style={styles.logoWrap} />

        {/* Floating badges */}
        <View style={[styles.floatBadge, { top: 58, right: width * 0.08 }]}>
          <Text style={styles.floatLabel}>MTN → VISA</Text>
          <View style={styles.floatRow}>
            <View style={styles.greenDot} />
            <Text style={styles.floatValue}>Instantané</Text>
          </View>
        </View>
        <View style={[styles.floatBadge, { bottom: 56, left: width * 0.04 }]}>
          <Text style={styles.floatLabel}>Solde</Text>
          <Text style={styles.floatValue}>XAF 25 000</Text>
        </View>
      </View>

      {/* Copy */}
      <View style={styles.body}>
        <View style={styles.dots}>
          {[0,1,2].map(i => (
            <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.headline}>
          Mobile money,{'\n'}
          <Text style={styles.accent}>prêt en ligne.</Text>
        </Text>
        <Text style={styles.sub}>
          Transformez votre mobile money en carte virtuelle VISA ou Mastercard — achetez partout dans le monde, instantanément.
        </Text>

        <Button
          label={t('auth.createAccount')}
          onPress={() => router.push('/auth/register')}
          style={{ marginBottom: Spacing.md }}
        />
        <Button
          label={t('auth.signIn')}
          variant="secondary"
          onPress={() => router.push('/auth/login')}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  visual: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: Colors.brand,
  },
  logoWrap: { zIndex: 2 },
  floatBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(16,31,24,0.92)',
    borderWidth: 0.5,
    borderColor: Colors.b2,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    zIndex: 3,
  },
  floatLabel: { fontSize: FontSizes.xs, color: Colors.text3, marginBottom: 3 },
  floatRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greenDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.brand },
  floatValue:{ fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: Colors.text1 },

  body: { padding: Spacing.xxl, paddingBottom: Spacing['3xl'] },
  dots: { flexDirection: 'row', gap: 6, marginBottom: Spacing.xl },
  dot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.b2 },
  dotActive: { width: 18, backgroundColor: Colors.brand },

  headline: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.black,
    color: Colors.text1,
    lineHeight: 36,
    marginBottom: Spacing.md,
  },
  accent: { color: Colors.brandGold },
  sub: {
    fontSize: FontSizes.md,
    color: Colors.text2,
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
});
