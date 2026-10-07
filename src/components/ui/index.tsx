// src/components/ui/index.tsx
// ─────────────────────────────────────────────────────────────────────────────
// All base UI primitives. Import from here, never inline styles.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle, TextInputProps,
  TouchableOpacityProps, Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '../../utils/tokens';

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?:    'sm' | 'md' | 'lg';
  loading?: boolean;
  label:    string;
  icon?:    React.ReactNode;
}

export function Button({
  variant = 'primary', size = 'lg', loading, label, icon,
  onPress, style, disabled, ...rest
}: ButtonProps) {
  const heights  = { sm: 40, md: 48, lg: 56 };
  const fSizes   = { sm: FontSizes.sm, md: FontSizes.md, lg: FontSizes.base };

  const variantStyle: ViewStyle = {
    primary:   { backgroundColor: Colors.brand },
    secondary: { backgroundColor: Colors.s2, borderWidth: 0.5, borderColor: Colors.b2 },
    danger:    { backgroundColor: Colors.dangerBg, borderWidth: 0.5, borderColor: 'rgba(226,75,74,0.3)' },
    ghost:     { backgroundColor: 'transparent' },
  }[variant];

  const textColor: TextStyle = {
    primary:   { color: Colors.brandOnBrand },
    secondary: { color: Colors.text1 },
    danger:    { color: Colors.danger },
    ghost:     { color: Colors.text2 },
  }[variant];

  return (
    <TouchableOpacity
      style={[
        styles.btnBase,
        variantStyle,
        { height: heights[size], opacity: disabled ? 0.5 : 1 },
        style as ViewStyle,
      ]}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      disabled={disabled || loading}
      activeOpacity={0.82}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.brandOnBrand : Colors.brand} size="small" />
      ) : (
        <>
          {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
          <Text style={[styles.btnLabel, textColor, { fontSize: fSizes[size] }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?:   string;
  error?:   string;
  prefix?:  string;
  suffix?:  React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, prefix, suffix, containerStyle, style, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: Spacing.md }, containerStyle]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[
        styles.inputWrap,
        focused && { borderColor: Colors.brand },
        error  && { borderColor: Colors.danger },
      ]}>
        {prefix && <Text style={styles.inputPrefix}>{prefix}</Text>}
        <TextInput
          style={[styles.input, prefix && { paddingLeft: 4 }, style as TextStyle]}
          placeholderTextColor={Colors.text4}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {suffix && <View style={{ paddingRight: Spacing.md }}>{suffix}</View>}
      </View>
      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
}

// ── PIN Input (4-box) ─────────────────────────────────────────────────────────
interface PinInputProps {
  onComplete: (pin: string) => void;
  length?: number;
}

export function PinInput({ onComplete, length = 4 }: PinInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const refs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, idx: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...values];
    next[idx] = digit;
    setValues(next);

    if (digit && idx < length - 1) refs.current[idx + 1]?.focus();
    if (next.every(Boolean)) onComplete(next.join(''));
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !values[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  return (
    <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
      {values.map((v, i) => (
        <TextInput
          key={i}
          ref={(r) => { refs.current[i] = r; }}
          style={[styles.pinBox, v && { borderColor: Colors.brand }]}
          value={v ? '•' : ''}
          keyboardType="number-pad"
          maxLength={1}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
          secureTextEntry={false}
          caretHidden
        />
      ))}
    </View>
  );
}

// ── Surface card ──────────────────────────────────────────────────────────────
export function Surface({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.surface, style]}>{children}</View>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps {
  label: string;
  color?: 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

export function Badge({ label, color = 'success' }: BadgeProps) {
  const palette = {
    success: { bg: Colors.successBg, text: Colors.success },
    warning: { bg: Colors.warningBg, text: Colors.warning },
    danger:  { bg: Colors.dangerBg,  text: Colors.danger  },
    info:    { bg: Colors.infoBg,    text: Colors.info    },
    purple:  { bg: Colors.purpleBg,  text: Colors.purple  },
  }[color];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({
  title, action, onAction,
}: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHdr}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <Pressable onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Screen state primitives ───────────────────────────────────────────────────
// Added for handoff §14 (loading / error / empty / success states).
//
// Before these existed, every screen improvised: some showed a bare
// ActivityIndicator, some showed nothing at all while loading, and API failures
// were mostly silent — a failed query left an empty list that looked identical
// to "you have no transactions". These three components make the difference
// between "nothing here" and "we could not load it" visible and consistent.

/** Centred spinner with optional label. Use while first data is loading. */
export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.stateWrap} accessibilityRole="progressbar">
      <ActivityIndicator color={Colors.brand} size="large" />
      {label ? <Text style={styles.stateHint}>{label}</Text> : null}
    </View>
  );
}

/**
 * Something went wrong. ALWAYS give the user a way forward — an error state
 * without a retry is a dead end.
 */
export function ErrorState({
  title, message, onRetry, retryLabel,
}: {
  title: string; message?: string; onRetry?: () => void; retryLabel?: string;
}) {
  return (
    <View style={styles.stateWrap}>
      <Text style={styles.stateIcon}>⚠️</Text>
      <Text style={[styles.stateTitle, { color: Colors.danger }]}>{title}</Text>
      {message ? <Text style={styles.stateHint}>{message}</Text> : null}
      {onRetry && (
        <Button
          label={retryLabel ?? 'Retry'}
          variant="secondary"
          size="md"
          onPress={onRetry}
          style={{ marginTop: Spacing.xl, minWidth: 160 }}
        />
      )}
    </View>
  );
}

/** Genuinely nothing to show. Distinct from ErrorState on purpose. */
export function EmptyState({
  icon, title, hint, action, onAction,
}: {
  icon?: string; title: string; hint?: string; action?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.stateWrap}>
      {icon ? <Text style={styles.stateIcon}>{icon}</Text> : null}
      <Text style={styles.stateTitle}>{title}</Text>
      {hint ? <Text style={styles.stateHint}>{hint}</Text> : null}
      {action && onAction && (
        <Button
          label={action}
          variant="secondary"
          size="md"
          onPress={onAction}
          style={{ marginTop: Spacing.xl, minWidth: 180 }}
        />
      )}
    </View>
  );
}

/** Inline notice for non-blocking warnings and info. */
export function Notice({
  tone = 'info', children,
}: { tone?: 'info' | 'warning' | 'danger' | 'success'; children: React.ReactNode }) {
  const palette = {
    info:    { bg: Colors.infoBg,    fg: Colors.info },
    warning: { bg: Colors.warningBg, fg: Colors.warning },
    danger:  { bg: Colors.dangerBg,  fg: Colors.danger },
    success: { bg: Colors.successBg, fg: Colors.brand },
  }[tone];

  return (
    <View style={[styles.notice, { backgroundColor: palette.bg, borderColor: palette.fg + '40' }]}>
      <Text style={[styles.noticeText, { color: palette.fg }]}>{children}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'] ?? 32,
    gap: Spacing.sm,
  },
  stateIcon:  { fontSize: 48, marginBottom: Spacing.md },
  stateTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.text1,
    textAlign: 'center',
  },
  stateHint: {
    fontSize: FontSizes.sm,
    color: Colors.text3,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.xs,
    maxWidth: 300,
  },
  notice: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  noticeText: { fontSize: FontSizes.sm, lineHeight: 19 },
  btnBase: {
    borderRadius: Radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  btnLabel: {
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.1,
  },
  inputLabel: {
    fontSize: FontSizes.xs,
    color: Colors.text3,
    fontWeight: FontWeights.medium,
    marginBottom: 7,
    letterSpacing: 0.3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.s2,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.b1,
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    color: Colors.text1,
    fontSize: FontSizes.base,
  },
  inputPrefix: {
    color: Colors.text3,
    fontSize: FontSizes.base,
    marginRight: Spacing.xs,
  },
  inputError: {
    color: Colors.danger,
    fontSize: FontSizes.xs,
    marginTop: 5,
  },
  pinBox: {
    width: 56,
    height: 64,
    borderRadius: Radii.md,
    backgroundColor: Colors.s2,
    borderWidth: 1.5,
    borderColor: Colors.b2,
    fontSize: 26,
    color: Colors.text1,
    textAlign: 'center',
    fontWeight: FontWeights.bold,
  },
  surface: {
    backgroundColor: Colors.s1,
    borderRadius: Radii.xl,
    borderWidth: 0.5,
    borderColor: Colors.b1,
    padding: Spacing.xl,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.b1,
    marginVertical: Spacing.sm,
  },
  sectionHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.xs,
    color: Colors.text3,
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionAction: {
    fontSize: FontSizes.sm,
    color: Colors.brand,
    fontWeight: FontWeights.medium,
  },
});
