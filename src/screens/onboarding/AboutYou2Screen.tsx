// src/screens/onboarding/AboutYou2Screen.tsx  — Physical Activity

import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ProgressDots, ProgressBar, GradientButton, GhostButton, SectionLabel, Chip } from '../../components/UI';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
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

      <Text className="mb-2 text-[20px] text-textPrimary dark:text-slate-100" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
        Physical activity
      </Text>
      <Text className="mb-4 text-[12px] leading-[18px] text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
        Be honest — this shapes your health risk profile directly.
      </Text>

      <SectionLabel label="How active are you?" />
      <View className="mb-2 flex-row flex-wrap gap-2">
        {ACTIVITY_LEVELS.map(a => {
          const sel = activityLevel === a.id;
          return (
            <TouchableOpacity
              key={a.id}
              className="w-[47%] items-center rounded-xl border bg-card dark:bg-slate-900/72 p-3"
              style={sel ? { backgroundColor: COLORS.pinkBg, borderColor: COLORS.pinkBorder } : { borderColor: COLORS.border }}
              onPress={() => setActivityLevel(a.id)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={a.icon as any}
                size={22}
                color={sel ? COLORS.pink : COLORS.textMuted}
                style={{ marginBottom: SPACING.sm }}
              />
              <Text
                className="mb-[2px] text-center text-[12px] text-textSecondary dark:text-slate-200"
                style={{ color: sel ? COLORS.pink : COLORS.textSecondary, fontFamily: FONTS.sansBold }}
              >
                {a.label}
              </Text>
              <Text className="text-center text-[10px] text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
                {a.sub}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionLabel label="Type of exercise you do" />
      <View className="mb-2 flex-row flex-wrap">
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
      <View className="flex-row gap-1">
        {DAYS_OPTIONS.map(d => (
          <TouchableOpacity
            key={d}
            className="h-9 flex-1 items-center justify-center rounded-md border bg-card dark:bg-slate-900/72"
            style={exerciseDays === d ? { backgroundColor: COLORS.pinkBg, borderColor: COLORS.pinkBorder } : { borderColor: COLORS.border }}
            onPress={() => setExerciseDays(d)}
          >
            <Text
              className="text-[12px]"
              style={{
                color: exerciseDays === d ? COLORS.pink : COLORS.textMuted,
                fontFamily: exerciseDays === d ? FONTS.sansBold : FONTS.sans
              }}
            >
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <GradientButton label="Next →" onPress={handleNext} disabled={!activityLevel} style={{ marginTop: SPACING.lg }} />
      <GhostButton label="Back" onPress={() => nav.goBack()} />
    </ScreenWrapper>
  );
}


