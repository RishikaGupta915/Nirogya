// src/screens/onboarding/AboutYou1Screen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ProgressDots, ProgressBar, GradientButton, SectionLabel, Chip } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

const AGE_GROUPS   = ['13–17', '18–25', '26–35', '36–45', '46–55', '56+'];
const LIFE_STAGES  = ['Student', 'Working', 'Homemaker', 'Pregnant', 'New mother', 'Retired'];

export default function AboutYou1Screen() {
  const nav = useNavigation<any>();
  const { setUserProfile, userProfile } = useApp();

  const [city,      setCity]      = useState(userProfile.city ?? '');
  const [ageGroup,  setAgeGroup]  = useState(userProfile.ageGroup ?? '');
  const [lifeStage, setLifeStage] = useState(userProfile.lifeStage ?? '');

  const canContinue = ageGroup && lifeStage;

  const handleNext = () => {
    setUserProfile({ city, ageGroup, lifeStage });
    nav.navigate('AboutYou2');
  };

  return (
    <ScreenWrapper>
      <ProgressDots total={5} current={0} />
      <ProgressBar current={1} total={5} />

      <Text style={styles.heading}>Tell us about yourself</Text>
      <Text style={styles.sub}>This helps us make your health assessment accurate and personal.</Text>

      {/* City */}
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>City / Town</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Chennai, Coimbatore…"
          placeholderTextColor={COLORS.textHint}
          value={city}
          onChangeText={setCity}
        />
      </View>

      {/* Age group */}
      <SectionLabel label="Age group" />
      <View style={styles.chipRow}>
        {AGE_GROUPS.map(a => (
          <Chip
            key={a} label={a}
            selected={ageGroup === a}
            color="pink"
            onPress={() => setAgeGroup(a)}
          />
        ))}
      </View>

      {/* Life stage */}
      <SectionLabel label="Current life stage" />
      <View style={styles.chipRow}>
        {LIFE_STAGES.map(s => (
          <Chip
            key={s} label={s}
            selected={lifeStage === s}
            color="purple"
            onPress={() => setLifeStage(s)}
          />
        ))}
      </View>

      {/* Privacy note */}
      <View style={styles.tip}>
        <Text style={styles.tipText}>
          Your information is private and never shared without permission.
        </Text>
      </View>

      <GradientButton label="Next →" onPress={handleNext} disabled={!canContinue} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heading:    { fontFamily: FONTS.serif, fontSize: 20, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  sub:        { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted, lineHeight: 18, marginBottom: SPACING.lg },
  fieldWrap:  { gap: SPACING.xs, marginBottom: SPACING.md },
  fieldLabel: { fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: COLORS.textHint, fontFamily: FONTS.sans },
  input: {
    backgroundColor: COLORS.bgCard, borderWidth: 0.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    color: COLORS.textPrimary, fontSize: 14, fontFamily: FONTS.sans,
  },
  chipRow:    { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.sm },
  tip: {
    backgroundColor: 'rgba(129,140,248,0.07)', borderWidth: 0.5,
    borderColor: 'rgba(129,140,248,0.18)', borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.lg, marginTop: SPACING.md,
  },
  tipText:    { fontSize: 11, color: 'rgba(165,180,252,0.7)', fontFamily: FONTS.sans, lineHeight: 17 },
});
