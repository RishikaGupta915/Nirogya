// src/components/UI.tsx

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BRAND_GRADIENT,
  CATEGORY_COLORS,
  COLORS,
  FONTS
} from '../constants/theme';
import { UI_SHADOWS } from '../constants/ui';

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
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      speed: 28,
      bounciness: 3,
      useNativeDriver: true
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => animateTo(0.985)}
        onPressOut={() => animateTo(1)}
        disabled={disabled || loading}
        activeOpacity={0.9}
        className="overflow-hidden rounded-xl2"
        style={[
          UI_SHADOWS.brandGlow,
          disabled || loading ? { opacity: 0.5 } : null,
          style
        ]}
      >
        <LinearGradient
          colors={BRAND_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="items-center px-6 py-4"
        >
          <View
            className="absolute left-3 right-3 top-[2px] h-3 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
          />
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              className="text-[14px] tracking-[0.25px] text-white"
              style={{ fontFamily: FONTS.sansBold }}
            >
              {label}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── GhostButton ───────────────────────────────────────────────
interface GhostButtonProps {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function GhostButton({ label, onPress, style }: GhostButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      speed: 28,
      bounciness: 3,
      useNativeDriver: true
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => animateTo(0.99)}
        onPressOut={() => animateTo(1)}
        className="mt-3 items-center rounded-xl2 bg-white/70 dark:bg-slate-900/62 py-[13px]"
        style={style}
        activeOpacity={0.85}
      >
        <Text className="text-[12px] tracking-[0.15px] text-textSecondary dark:text-slate-200" style={{ fontFamily: FONTS.sans }}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
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
  pink: CATEGORY_COLORS.pink,
  purple: CATEGORY_COLORS.purple,
  teal: CATEGORY_COLORS.teal,
  amber: CATEGORY_COLORS.amber,
  indigo: CATEGORY_COLORS.indigo,
  red: CATEGORY_COLORS.red,
  blue: CATEGORY_COLORS.blue,
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
      className="m-[3px] rounded-full px-[13px] py-[9px]"
      style={[
        { backgroundColor: c.bg },
        style
      ]}
    >
      <Text className="text-[12px]" style={[{ fontFamily: FONTS.sans }, { color: c.text }]}>
        {label}
      </Text>
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
  return (
    <Text
      className="mb-[10px] mt-3 text-[10px] uppercase tracking-[1.1px] text-textHint dark:text-slate-400"
      style={[{ fontFamily: FONTS.sansBold }, style]}
    >
      {label}
    </Text>
  );
}

// ── InputWrap ─────────────────────────────────────────────────
interface InputWrapProps {
  label: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function InputWrap({ label, children, style }: InputWrapProps) {
  return (
    <View
      className="mb-3 rounded-xl bg-card dark:bg-slate-900/72 px-[14px] py-[12px]"
      style={[
        UI_SHADOWS.soft,
        style
      ]}
    >
      <Text
        className="mb-[6px] text-[10px] uppercase tracking-[0.8px] text-textHint dark:text-slate-400"
        style={{ fontFamily: FONTS.sans }}
      >
        {label}
      </Text>
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
    <View className="mb-5 flex-row justify-center gap-[5px] pt-1">
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <View
            key={i}
            className="h-[6px] w-[6px] rounded-[3px]"
            style={[
              { backgroundColor: 'rgba(95,115,152,0.25)' },
              isActive && { width: 18, borderRadius: 3, backgroundColor: COLORS.gradStart },
              isDone && { backgroundColor: 'rgba(255,107,138,0.45)' }
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
    <View className="mb-4 h-[5px] overflow-hidden rounded bg-borderSoft">
      <LinearGradient
        colors={BRAND_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="h-full rounded"
        style={{ width: `${pct}%` as any }}
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
      className="mb-2 self-start rounded-full px-3 py-[5px]"
      style={{ backgroundColor: c.bg }}
    >
      <Text
        className="text-[10px] tracking-[0.3px]"
        style={{ color: c.text, fontFamily: FONTS.sansBold }}
      >
        {c.label}
      </Text>
    </View>
  );
}


