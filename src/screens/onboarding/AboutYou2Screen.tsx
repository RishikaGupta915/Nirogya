// src/screens/onboarding/AboutYou2Screen.tsx  — Physical Activity

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ProgressDots, ProgressBar, GradientButton, GhostButton, SectionLabel, Chip } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

const ACTIVITY_LEVELS = [
  { id: 'sedentary',  icon: 'sofa',            label: 'Mostly sedentary', sub: 'Desk job, little movement' },
  { id: 'light',      icon: 'walk',             label: 'Lightly active',   sub: 'Walk occasionally' },
  { id: 'moderate',   icon: 'run',              label: 'Moderately active',sub: 'Exercise 2–4x/week' },
  { id: 'very',       icon: 'weight-lifter',    label: 'Very active',      sub: 'Daily intense workout' },
];

const EXERCISE_TYPES = ['Walking', 'Yoga', 'Running', 'Dance', 'Gym', 'Swimming', 'Cycling', 'None'];
const DAYS_OPTIONS   = ['0', '1', '2', '3', '4', '5', '6–7'];

export default function AboutYou2Screen() {
  const nav = useNavigation<any>();
  const { setUserProfile, userProfile } = useApp();

  const [activityLevel,  setActivityLevel]  = useState(userProfile.activityLevel ?? '');
  const [exerciseTypes,  setExerciseTypes]  = useState<string[]>(userProfile.exerciseTypes ?? []);
  const [exerciseDays,   setExerciseDays]   = useState<string>('');

  const toggleExercise = (type: string) => {
    setExerciseTypes(prev =>
      prev.includes(type) ? prev.filter(e => e !== type) : [...prev, type],
    );
  };

  const handleNext = () => {
    setUserProfile({ activityLevel, exerciseTypes, exerciseDays: parseInt(exerciseDays) || 0 });
    nav.navigate('AboutYou3');
  };

  return (
    <ScreenWrapper>
      <ProgressDots total={5} current={1} />
      <ProgressBar current={2} total={5} />

      <Text style={styles.heading}>Physical activity</Text>
      <Text style={styles.sub}>Be honest — this shapes your health risk profile directly.</Text>

      <SectionLabel label="How active are you?" />
      <View style={styles.actGrid}>
        {ACTIVITY_LEVELS.map(a => {
          const sel = activityLevel === a.id;
          return (
            <TouchableOpacity
              key={a.id}
              style={[styles.actCard, sel && styles.actCardSel]}
              onPress={() => setActivityLevel(a.id)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={a.icon as any}
                size={22}
                color={sel ? COLORS.pink : COLORS.textMuted}
                style={{ marginBottom: SPACING.sm }}
              />
              <Text style={[styles.actLabel, sel && styles.actLabelSel]}>{a.label}</Text>
              <Text style={styles.actSub}>{a.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionLabel label="Type of exercise you do" />
      <View style={styles.chipRow}>
        {EXERCISE_TYPES.map(t => (
          <Chip
            key={t} label={t}
            selected={exerciseTypes.includes(t)}
            color="teal"
            onPress={() => toggleExercise(t)}
          />
        ))}
      </View>

      <SectionLabel label="How many days per week?" />
      <View style={styles.scaleRow}>
        {DAYS_OPTIONS.map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.scaleBtn, exerciseDays === d && styles.scaleBtnSel]}
            onPress={() => setExerciseDays(d)}
          >
            <Text style={[styles.scaleTxt, exerciseDays === d && styles.scaleTxtSel]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <GradientButton label="Next →" onPress={handleNext} disabled={!activityLevel} style={{ marginTop: SPACING.lg }} />
      <GhostButton label="Back" onPress={() => nav.goBack()} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heading:     { fontFamily: FONTS.serif, fontSize: 20, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  sub:         { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted, lineHeight: 18, marginBottom: SPACING.lg },
  actGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  actCard: {
    width: '47%', borderRadius: RADIUS.lg, padding: SPACING.md,
    backgroundColor: COLORS.bgCard, borderWidth: 0.5, borderColor: COLORS.border,
    alignItems: 'center',
  },
  actCardSel:  { backgroundColor: COLORS.pinkBg, borderColor: COLORS.pinkBorder },
  actLabel:    { fontSize: 12, fontFamily: FONTS.sansBold, color: COLORS.textSecondary, marginBottom: 2, textAlign: 'center' },
  actLabelSel: { color: COLORS.pink },
  actSub:      { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted, textAlign: 'center' },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.sm },
  scaleRow:    { flexDirection: 'row', gap: SPACING.xs },
  scaleBtn: {
    flex: 1, height: 36, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard, borderWidth: 0.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scaleBtnSel: { backgroundColor: COLORS.pinkBg, borderColor: COLORS.pinkBorder },
  scaleTxt:    { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.sans },
  scaleTxtSel: { color: COLORS.pink, fontFamily: FONTS.sansBold },
});
