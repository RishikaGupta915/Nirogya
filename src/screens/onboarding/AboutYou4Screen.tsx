// src/screens/onboarding/AboutYou4Screen.tsx — Sleep & Stress

import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ProgressDots, ProgressBar, GradientButton, GhostButton, SectionLabel, Chip } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

const SLEEP_QUALITY = ['Fall asleep easily', 'Wake up frequently', 'Always exhausted', 'Light sleeper', 'Snoring/apnea'];
const STRESS_LEVELS = ['Low', 'Medium', 'High', 'Very high'];

export default function AboutYou4Screen() {
  const nav = useNavigation<any>();
  const { setUserProfile, userProfile } = useApp();

  const [sleepHours,    setSleepHours]    = useState(userProfile.sleepHours ?? 7);
  const [sleepQuality,  setSleepQuality]  = useState<string[]>(userProfile.sleepQuality ?? []);
  const [stressLevel,   setStressLevel]   = useState(userProfile.stressLevel ?? '');
  const [moodSwings,    setMoodSwings]    = useState(userProfile.moodSwings ?? false);
  const [anxiety,       setAnxiety]       = useState(userProfile.anxiety ?? false);
  const [lowMotivation, setLowMotivation] = useState(userProfile.lowMotivation ?? false);

  const toggleQuality = (q: string) => {
    setSleepQuality(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q]);
  };

  const handleNext = () => {
    setUserProfile({ sleepHours, sleepQuality, stressLevel, moodSwings, anxiety, lowMotivation });
    nav.navigate('AboutYou5');
  };

  return (
    <ScreenWrapper>
      <ProgressDots total={5} current={3} />
      <ProgressBar current={4} total={5} />

      <Text style={styles.heading}>Sleep & mental wellbeing</Text>
      <Text style={styles.sub}>Stress and sleep affect nearly every health condition in women.</Text>

      <SectionLabel label="Average sleep per night" />
      <Text style={styles.sliderVal}>{sleepHours.toFixed(1)} hrs</Text>
      <Slider
        style={{ marginBottom: SPACING.sm }}
        minimumValue={3}
        maximumValue={12}
        step={0.5}
        value={sleepHours}
        onValueChange={v => setSleepHours(v)}
        minimumTrackTintColor={COLORS.gradStart}
        maximumTrackTintColor={COLORS.border}
        thumbTintColor={COLORS.gradStart}
      />
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLbl}>3 hrs</Text>
        <Text style={styles.sliderLbl}>7.5 hrs</Text>
        <Text style={styles.sliderLbl}>12 hrs</Text>
      </View>

      <SectionLabel label="Sleep quality" />
      <View style={styles.chipRow}>
        {SLEEP_QUALITY.map(q => (
          <Chip key={q} label={q} selected={sleepQuality.includes(q)} color="indigo" onPress={() => toggleQuality(q)} />
        ))}
      </View>

      <SectionLabel label="Current stress level" />
      <View style={styles.chipRow}>
        {STRESS_LEVELS.map(s => (
          <Chip key={s} label={s} selected={stressLevel === s} color="red" onPress={() => setStressLevel(s)} />
        ))}
      </View>

      <SectionLabel label="Mental health check-ins" />
      <View style={styles.toggleCard}>
        {[
          { label: 'Mood swings',    sub: 'Noticeable changes in mood',   val: moodSwings,    set: setMoodSwings },
          { label: 'Anxiety or worry', sub: 'Regular feelings of dread', val: anxiety,       set: setAnxiety },
          { label: 'Low motivation', sub: 'Struggle to start tasks',      val: lowMotivation, set: setLowMotivation },
        ].map((item, i, arr) => (
          <View key={item.label} style={[styles.toggleRow, i < arr.length - 1 && styles.toggleBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>{item.label}</Text>
              <Text style={styles.toggleSub}>{item.sub}</Text>
            </View>
            <Switch
              value={item.val}
              onValueChange={item.set}
              trackColor={{ true: COLORS.gradStart, false: COLORS.border }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>

      <GradientButton label="Next →" onPress={handleNext} style={{ marginTop: SPACING.lg }} />
      <GhostButton label="Back" onPress={() => nav.goBack()} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heading:      { fontFamily: FONTS.serif, fontSize: 20, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  sub:          { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted, lineHeight: 18, marginBottom: SPACING.lg },
  sliderVal:    { fontFamily: FONTS.serif, fontSize: 22, color: COLORS.pink, textAlign: 'center', marginBottom: 4 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md },
  sliderLbl:    { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.sans },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.sm },
  toggleCard: {
    backgroundColor: COLORS.bgCard, borderWidth: 0.5, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm,
  },
  toggleRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  toggleBorder: { borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  toggleLabel:  { fontSize: 13, fontFamily: FONTS.sans, color: COLORS.textSecondary, marginBottom: 2 },
  toggleSub:    { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted },
});
