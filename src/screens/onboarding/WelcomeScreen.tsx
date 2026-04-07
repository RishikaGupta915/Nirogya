// src/screens/onboarding/WelcomeScreen.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { GradientButton, GhostButton } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

const FEATURES = [
  {
    icon:  'clock-outline',
    color: COLORS.pink,
    bg:    COLORS.pinkBg,
    title: 'Smart symptom analysis',
    sub:   'Adapts to your answers in real time',
  },
  {
    icon:  'clipboard-check-outline',
    color: COLORS.purple,
    bg:    COLORS.purpleBg,
    title: 'Risk score & next steps',
    sub:   'Know exactly when to see a doctor',
  },
  {
    icon:  'chat-outline',
    color: COLORS.teal,
    bg:    COLORS.tealBg,
    title: 'Your language, your comfort',
    sub:   'Tamil, Hindi, Telugu & 8 more',
  },
];

export default function WelcomeScreen() {
  const nav = useNavigation<any>();

  return (
    <ScreenWrapper>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroCircle}>
          <MaterialCommunityIcons name="heart-pulse" size={28} color={COLORS.pink} />
        </View>
        <Text style={styles.appName}>Nirogya</Text>
        <Text style={styles.heroTitle}>Your health, finally{'\n'}understood</Text>
        <Text style={styles.heroSub}>
          Not generic advice. Personalised symptom care,{'\n'}built for Indian women.
        </Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featRow}>
            <View style={[styles.featIcon, { backgroundColor: f.bg }]}>
              <MaterialCommunityIcons name={f.icon as any} size={16} color={f.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featTitle}>{f.title}</Text>
              <Text style={styles.featSub}>{f.sub}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <GradientButton
        label="Get started"
        onPress={() => nav.navigate('ChooseLanguage')}
        style={{ marginBottom: 0 }}
      />
      <GhostButton
        label="I already have an account"
        onPress={() => nav.navigate('SignIn')}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  heroCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.pinkBg,
    borderWidth: 1.5, borderColor: COLORS.pinkBorder,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  appName: {
    fontFamily: FONTS.serif,
    fontSize: 28, fontWeight: '600',
    color: COLORS.pink,
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  heroTitle: {
    fontFamily: FONTS.serif,
    fontSize: 26, fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: SPACING.sm,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  features: {
    marginBottom: SPACING.xl,
    gap: 2,
  },
  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  featIcon: {
    width: 34, height: 34, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  featTitle: {
    fontSize: 13, fontFamily: FONTS.sansBold,
    color: COLORS.textPrimary, marginBottom: 2,
  },
  featSub: {
    fontSize: 11, fontFamily: FONTS.sans,
    color: COLORS.textMuted,
  },
});
