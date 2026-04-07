// src/screens/onboarding/AboutYou4Screen.tsx — Sleep & Stress

import React, { useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ProgressDots, ProgressBar, GradientButton, GhostButton, SectionLabel, Chip } from '../../components/UI';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
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

      <Text className="mb-2 text-[20px] text-textPrimary" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
        Sleep & mental wellbeing
      </Text>
      <Text className="mb-4 text-[12px] leading-[18px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
        Stress and sleep affect nearly every health condition in women.
      </Text>

      <SectionLabel label="Average sleep per night" />
      <Text className="mb-1 text-center text-[22px] text-brandStart" style={{ fontFamily: FONTS.serif }}>
        {sleepHours.toFixed(1)} hrs
      </Text>
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
      <View className="mb-3 flex-row justify-between">
        <Text className="text-[10px] text-textMuted" style={{ fontFamily: FONTS.sans }}>3 hrs</Text>
        <Text className="text-[10px] text-textMuted" style={{ fontFamily: FONTS.sans }}>7.5 hrs</Text>
        <Text className="text-[10px] text-textMuted" style={{ fontFamily: FONTS.sans }}>12 hrs</Text>
      </View>

      <SectionLabel label="Sleep quality" />
      <View className="mb-2 flex-row flex-wrap">
        {SLEEP_QUALITY.map(q => (
          <Chip key={q} label={q} selected={sleepQuality.includes(q)} color="indigo" onPress={() => toggleQuality(q)} />
        ))}
      </View>

      <SectionLabel label="Current stress level" />
      <View className="mb-2 flex-row flex-wrap">
        {STRESS_LEVELS.map(s => (
          <Chip key={s} label={s} selected={stressLevel === s} color="red" onPress={() => setStressLevel(s)} />
        ))}
      </View>

      <SectionLabel label="Mental health check-ins" />
      <View className="mb-2 rounded-xl border border-borderSoft bg-card px-3">
        {[
          { label: 'Mood swings',    sub: 'Noticeable changes in mood',   val: moodSwings,    set: setMoodSwings },
          { label: 'Anxiety or worry', sub: 'Regular feelings of dread', val: anxiety,       set: setAnxiety },
          { label: 'Low motivation', sub: 'Struggle to start tasks',      val: lowMotivation, set: setLowMotivation },
        ].map((item, i, arr) => (
          <View
            key={item.label}
            className="flex-row items-center gap-3 py-3"
            style={i < arr.length - 1 ? { borderBottomWidth: 0.5, borderBottomColor: COLORS.border } : undefined}
          >
            <View style={{ flex: 1 }}>
              <Text className="mb-[2px] text-[13px] text-textSecondary" style={{ fontFamily: FONTS.sans }}>
                {item.label}
              </Text>
              <Text className="text-[10px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
                {item.sub}
              </Text>
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