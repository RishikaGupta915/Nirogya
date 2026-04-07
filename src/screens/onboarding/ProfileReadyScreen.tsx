// src/screens/onboarding/ProfileReadyScreen.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { GradientButton } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  GREETINGS,
  LANGUAGES
} from '../../constants/theme';

export default function ProfileReadyScreen() {
  const nav = useNavigation<any>();
  const { userProfile } = useApp();

  const langCode  = userProfile.language ?? 'en';
  const greeting  = GREETINGS[langCode] ?? 'Hello';
  const langLabel = LANGUAGES.find(l => l.code === langCode)?.english ?? 'English';
  const nativeLbl = LANGUAGES.find(l => l.code === langCode)?.native ?? 'English';

  const summaryRows = [
    { label: 'Language',   value: `${nativeLbl} ${langLabel}` },
    { label: 'Age group',  value: userProfile.ageGroup ?? '—' },
    { label: 'Life stage', value: userProfile.lifeStage ?? '—' },
    { label: 'Activity',   value: userProfile.activityLevel ?? '—' },
    { label: 'Diet',       value: userProfile.dietType ?? '—' },
  ];

  return (
    <ScreenWrapper>
      {/* Success circle */}
      <View style={styles.heroCircle}>
        <MaterialCommunityIcons name="check-circle-outline" size={32} color={COLORS.teal} />
      </View>

      <Text style={styles.greeting}>{greeting}, {userProfile.name ?? 'there'}!</Text>
      <Text style={styles.sub}>
        You&apos;re all set. Nirogya is ready in{' '}
        <Text style={{ color: COLORS.pink, fontFamily: FONTS.sansBold }}>{langLabel}</Text> for you.
      </Text>
      <Text style={styles.hint}>You can update your language and profile anytime from settings.</Text>

      {/* Setup summary card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>YOUR SETUP</Text>
        {summaryRows.map((row, i) => (
          <View key={row.label} style={[styles.cardRow, i < summaryRows.length - 1 && styles.cardBorder]}>
            <Text style={styles.cardLabel}>{row.label}</Text>
            <Text style={styles.cardValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <GradientButton
        label="Start using Nirogya →"
        onPress={() => nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heroCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(52,211,153,0.3)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginTop: SPACING.xl, marginBottom: SPACING.lg,
  },
  greeting: {
    fontFamily: FONTS.serif, fontSize: 24, fontWeight: '600',
    color: COLORS.textPrimary, textAlign: 'center', marginBottom: SPACING.sm,
  },
  sub: {
    fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 20, marginBottom: SPACING.sm,
  },
  hint: {
    fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 17, marginBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.bgCard, borderWidth: 0.5, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
    color: COLORS.textHint, fontFamily: FONTS.sansBold,
    paddingVertical: SPACING.md,
  },
  cardRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: SPACING.md,
  },
  cardBorder:  { borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  cardLabel:   { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted },
  cardValue:   { fontSize: 12, fontFamily: FONTS.sansBold, color: COLORS.textSecondary },
});
