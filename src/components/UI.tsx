// src/components/UI.tsx

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

// ── GradientButton ────────────────────────────────────────────
interface GradButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function GradientButton({
  label,
  onPress,
  loading,
  disabled,
  style
}: GradButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[{ borderRadius: RADIUS.lg, overflow: 'hidden' }, style]}
    >
      <LinearGradient
        colors={['#e879a0', '#9d4edd']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradBtn}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.gradBtnText}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── GhostButton ───────────────────────────────────────────────
interface GhostButtonProps {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function GhostButton({ label, onPress, style }: GhostButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.ghostBtn, style]}
      activeOpacity={0.7}
    >
      <Text style={styles.ghostBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Chip ──────────────────────────────────────────────────────
type ChipColor =
  | 'pink'
  | 'purple'
  | 'teal'
  | 'amber'
  | 'indigo'
  | 'red'
  | 'blue'
  | 'default';

const chipColors: Record<
  ChipColor,
  { bg: string; border: string; text: string }
> = {
  pink: { bg: COLORS.pinkBg, border: COLORS.pinkBorder, text: COLORS.pink },
  purple: {
    bg: COLORS.purpleBg,
    border: COLORS.purpleBorder,
    text: COLORS.purple
  },
  teal: { bg: COLORS.tealBg, border: COLORS.tealBorder, text: COLORS.teal },
  amber: { bg: COLORS.amberBg, border: COLORS.amberBorder, text: COLORS.amber },
  indigo: {
    bg: COLORS.indigoBg,
    border: COLORS.indigoBorder,
    text: COLORS.indigo
  },
  red: { bg: COLORS.redBg, border: COLORS.redBorder, text: COLORS.red },
  blue: { bg: COLORS.blueBg, border: COLORS.blueBorder, text: COLORS.blue },
  default: {
    bg: COLORS.bgCard,
    border: COLORS.border,
    text: COLORS.textSecondary
  }
};

interface ChipProps {
  label: string;
  selected?: boolean;
  color?: ChipColor;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({
  label,
  selected,
  color = 'pink',
  onPress,
  style
}: ChipProps) {
  const c = selected ? chipColors[color] : chipColors.default;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.chip,
        { backgroundColor: c.bg, borderColor: c.border },
        style
      ]}
    >
      <Text style={[styles.chipText, { color: c.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── SectionLabel ──────────────────────────────────────────────
export function SectionLabel({
  label,
  style
}: {
  label: string;
  style?: TextStyle;
}) {
  return <Text style={[styles.sectionLabel, style]}>{label}</Text>;
}

// ── InputWrap ─────────────────────────────────────────────────
interface InputWrapProps {
  label: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function InputWrap({ label, children, style }: InputWrapProps) {
  return (
    <View style={[styles.inputWrap, style]}>
      <Text style={styles.inputLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ── ProgressDots ──────────────────────────────────────────────
interface ProgressDotsProps {
  total: number;
  current: number;
}

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isActive && styles.dotActive,
              isDone && styles.dotDone
            ]}
          />
        );
      })}
    </View>
  );
}

// ── ProgressBar ───────────────────────────────────────────────
interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <View style={styles.progTrack}>
      <LinearGradient
        colors={['#e879a0', '#9d4edd']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.progFill, { width: `${pct}%` as any }]}
      />
    </View>
  );
}

// ── RiskBadge ─────────────────────────────────────────────────
export function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const map = {
    low: {
      bg: 'rgba(52,211,153,0.12)',
      border: 'rgba(52,211,153,0.3)',
      text: '#6ee7b7',
      label: 'Generally manageable'
    },
    medium: {
      bg: 'rgba(251,191,36,0.12)',
      border: 'rgba(251,191,36,0.3)',
      text: '#fde68a',
      label: 'Worth investigating'
    },
    high: {
      bg: 'rgba(251,113,133,0.12)',
      border: 'rgba(251,113,133,0.3)',
      text: '#fca5a5',
      label: 'Needs prompt attention'
    }
  };
  const c = map[level];
  return (
    <View
      style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}
    >
      <Text style={[styles.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradBtn: { paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center' },
  gradBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONTS.sansBold,
    letterSpacing: 0.3
  },

  ghostBtn: {
    paddingVertical: 11,
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    borderColor: COLORS.borderMed,
    alignItems: 'center',
    marginTop: SPACING.sm
  },
  ghostBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.sans
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 0.5,
    margin: 3
  },
  chipText: { fontSize: 12, fontFamily: FONTS.sans },

  sectionLabel: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.textHint,
    fontFamily: FONTS.sansBold,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md
  },

  inputWrap: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: SPACING.sm
  },
  inputLabel: {
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: COLORS.textHint,
    marginBottom: 4,
    fontFamily: FONTS.sans
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginBottom: SPACING.lg,
    paddingTop: 4
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.bgCardHover
  },
  dotActive: { width: 18, borderRadius: 3, backgroundColor: COLORS.gradStart },
  dotDone: { backgroundColor: 'rgba(232,121,160,0.45)' },

  progTrack: {
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.lg
  },
  progFill: { height: '100%', borderRadius: 2 },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 0.5,
    marginBottom: SPACING.sm
  },
  badgeText: { fontSize: 10, fontFamily: FONTS.sansBold, letterSpacing: 0.3 }
});
