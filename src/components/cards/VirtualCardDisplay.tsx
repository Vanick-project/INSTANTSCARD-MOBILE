// src/components/cards/VirtualCardDisplay.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii, FontSizes, FontWeights, Spacing } from '../../utils/tokens';
import type { VirtualCard } from '../../hooks/useQueries';

interface Props {
  card: VirtualCard;
  onPress?: () => void;
}

export function VirtualCardDisplay({ card, onPress }: Props) {
  const isVisa = card.network === 'visa';
  const isFrozen = card.status === 'frozen';

  const gradientColors: [string, string, string] = isVisa
    ? ['#141F33', '#0D1828', '#0A1628']
    : ['#00C896', '#009970', '#006B4A'];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, isFrozen && styles.frozen]}
      >
        {/* Decorative circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        {/* Frozen overlay */}
        {isFrozen && (
          <View style={styles.frozenBadge}>
            <Text style={styles.frozenText}>❄ GELÉE</Text>
          </View>
        )}

        {/* Chip */}
        <View style={[styles.chip, !isVisa && styles.chipLight]} />

        {/* Card number */}
        <Text style={styles.pan}>{card.maskedPan}</Text>

        {/* Bottom row */}
        <View style={styles.bottom}>
          <View>
            <Text style={styles.label}>TITULAIRE</Text>
            <Text style={styles.value}>{card.nameOnCard}</Text>
          </View>
          <View>
            <Text style={styles.label}>EXPIRE</Text>
            <Text style={styles.value}>{card.expiryMonth}/{card.expiryYear.slice(-2)}</Text>
          </View>
          <View style={styles.networkLogo}>
            {isVisa ? (
              <View style={styles.visaWrap}>
                <Text style={styles.visaText}>VISA</Text>
              </View>
            ) : (
              <View style={styles.mcWrap}>
                <View style={[styles.mcCircle, { backgroundColor: '#EB001B' }]} />
                <View style={[styles.mcCircle, styles.mcOverlap, { backgroundColor: '#F79E1B' }]} />
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.xxl,
    padding: Spacing.xxl,
    minHeight: 190,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.b2,
  },
  frozen: {
    opacity: 0.75,
  },
  circle1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
    right: -30,
    top: -30,
  },
  circle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
    right: 55,
    bottom: -40,
  },
  frozenBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(55,138,221,0.2)',
    borderRadius: Radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: Colors.info,
  },
  frozenText: {
    fontSize: FontSizes.xs,
    color: Colors.info,
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.5,
  },
  chip: {
    width: 38,
    height: 28,
    borderRadius: 5,
    backgroundColor: 'rgba(255,200,50,0.28)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,200,50,0.4)',
    marginBottom: Spacing.xl,
  },
  chipLight: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  pan: {
    fontFamily: 'SpaceMono',   // monospace fallback
    fontSize: FontSizes.lg,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 3,
    marginBottom: Spacing.xl,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  value: {
    fontSize: FontSizes.md,
    color: Colors.text1,
    fontWeight: FontWeights.medium,
  },
  networkLogo: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  visaWrap: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  visaText: {
    fontSize: 18,
    fontWeight: FontWeights.black,
    fontStyle: 'italic',
    color: Colors.text1,
  },
  mcWrap: {
    flexDirection: 'row',
  },
  mcCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  mcOverlap: {
    marginLeft: -12,
    opacity: 0.88,
  },
});
