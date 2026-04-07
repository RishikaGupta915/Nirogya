// src/screens/onboarding/ChooseLanguageScreen.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ProgressDots, GradientButton, GhostButton } from '../../components/UI';
import {
  LANGUAGES,
  COLORS,
  FONTS,
  SPACING,
  RADIUS
} from '../../constants/theme';
import { useApp } from '../../context/AppContext';

const MAIN_LANGS = LANGUAGES.slice(0, 8); // grid languages
const EXTRA_LANGS = LANGUAGES.slice(8); // chip strip

export default function ChooseLanguageScreen() {
  const nav = useNavigation<any>();
  const { setUserProfile } = useApp();
  const [selected, setSelected] = useState('en');

  const selectedLang = LANGUAGES.find((l) => l.code === selected);

  const handleContinue = (code: string) => {
    setUserProfile({ language: code });
    nav.navigate('SignUp', { language: code });
  };

  return (
    <ScreenWrapper>
      <ProgressDots total={4} current={1} />

      <Text style={styles.heading}>Choose your language</Text>
      <Text style={styles.sub}>
        Nirogya works fully in your preferred language — questions, results,
        everything.
      </Text>

      {/* Main 8 languages in 2-col grid */}
      <View style={styles.grid}>
        {MAIN_LANGS.map((lang) => {
          const isSel = selected === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langCard, isSel && styles.langCardSel]}
              onPress={() => setSelected(lang.code)}
              activeOpacity={0.8}
            >
              <View
                style={[styles.checkCircle, isSel && styles.checkCircleSel]}
              >
                {isSel && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={[styles.nativeText, isSel && styles.nativeTextSel]}>
                {lang.native}
              </Text>
              <Text style={[styles.engText, isSel && styles.engTextSel]}>
                {lang.english}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.divLine} />
        <Text style={styles.divText}>also available</Text>
        <View style={styles.divLine} />
      </View>

      {/* Extra languages as chips */}
      <View style={styles.extraRow}>
        {EXTRA_LANGS.map((lang) => {
          const isSel = selected === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.extraChip, isSel && styles.extraChipSel]}
              onPress={() => setSelected(lang.code)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.extraChipText, isSel && styles.extraChipTextSel]}
              >
                {lang.native} {lang.english}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <GradientButton
        label={`Continue in ${selectedLang?.english ?? 'English'} →`}
        onPress={() => handleContinue(selected)}
      />
      {selected !== 'en' && (
        <GhostButton
          label="Continue in English"
          onPress={() => handleContinue('en')}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm
  },
  sub: {
    fontSize: 12,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: SPACING.lg
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg
  },
  langCard: {
    width: '47%',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  langCardSel: {
    backgroundColor: COLORS.pinkBg,
    borderColor: COLORS.pinkBorder
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm
  },
  checkCircleSel: {
    backgroundColor: COLORS.gradStart,
    borderColor: 'transparent'
  },
  checkMark: { color: '#fff', fontSize: 9, fontWeight: '700' },
  nativeText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 3
  },
  nativeTextSel: { color: COLORS.pink },
  engText: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.sans },
  engTextSel: { color: 'rgba(249,168,201,0.6)' },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md
  },
  divLine: { flex: 1, height: 0.5, backgroundColor: COLORS.border },
  divText: { fontSize: 11, color: COLORS.textHint, fontFamily: FONTS.sans },

  extraRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl
  },
  extraChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard
  },
  extraChipSel: {
    backgroundColor: COLORS.pinkBg,
    borderColor: COLORS.pinkBorder
  },
  extraChipText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.sans
  },
  extraChipTextSel: { color: COLORS.pink, fontWeight: '500' }
});
