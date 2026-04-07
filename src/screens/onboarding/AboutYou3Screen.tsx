// src/screens/onboarding/AboutYou3Screen.tsx — Diet & Nutrition

import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ProgressDots, ProgressBar, GradientButton, GhostButton, SectionLabel, Chip } from '../../components/UI';
import { FONTS, SPACING } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

const DIET_TYPES    = ['Vegetarian', 'Eggetarian', 'Non-veg', 'Vegan', 'Halal', 'No rules'];
const MEALS         = ['1', '2', '3', '4+'];
const DIET_HABITS   = ['Skip breakfast often', 'Late night eating', 'Low water intake', 'Crave sugar often', 'Irregular meal times', 'None'];
const SUPPLEMENTS   = ['Iron', 'Vitamin D', 'B12', 'Calcium', 'Folic acid', 'Omega-3', 'None'];

export default function AboutYou3Screen() {
  const nav = useNavigation<any>();
  const { setUserProfile, userProfile } = useApp();

  const [dietType,    setDietType]    = useState(userProfile.dietType ?? '');
  const [mealsPerDay, setMealsPerDay] = useState('');
  const [dietHabits,  setDietHabits]  = useState<string[]>(userProfile.dietHabits ?? []);
  const [supplements, setSupplements] = useState<string[]>(userProfile.supplements ?? []);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const handleNext = () => {
    setUserProfile({ dietType, mealsPerDay: parseInt(mealsPerDay) || 3, dietHabits, supplements });
    nav.navigate('AboutYou4');
  };

  return (
    <ScreenWrapper>
      <ProgressDots total={5} current={2} />
      <ProgressBar current={3} total={5} />

      <Text className="mb-2 text-[20px] text-textPrimary dark:text-slate-100" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
        Diet & nutrition
      </Text>
      <Text className="mb-4 text-[12px] leading-[18px] text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
        Common deficiencies in Indian women are tied directly to food habits.
      </Text>

      <SectionLabel label="Diet type" />
      <View className="mb-2 flex-row flex-wrap">
        {DIET_TYPES.map(d => (
          <Chip key={d} label={d} selected={dietType === d} color="amber" onPress={() => setDietType(d)} />
        ))}
      </View>

      <SectionLabel label="Meals per day" />
      <View className="mb-2 flex-row flex-wrap">
        {MEALS.map(m => (
          <Chip key={m} label={m} selected={mealsPerDay === m} color="teal" onPress={() => setMealsPerDay(m)} />
        ))}
      </View>

      <SectionLabel label="Do you experience any of these?" />
      <View className="mb-2 flex-row flex-wrap">
        {DIET_HABITS.map(h => (
          <Chip key={h} label={h} selected={dietHabits.includes(h)} color="amber" onPress={() => toggle(dietHabits, setDietHabits, h)} />
        ))}
      </View>

      <SectionLabel label="Do you take supplements?" />
      <View className="mb-2 flex-row flex-wrap">
        {SUPPLEMENTS.map(s => (
          <Chip key={s} label={s} selected={supplements.includes(s)} color="teal" onPress={() => toggle(supplements, setSupplements, s)} />
        ))}
      </View>

      <GradientButton label="Next →" onPress={handleNext} disabled={!dietType} style={{ marginTop: SPACING.lg }} />
      <GhostButton label="Back" onPress={() => nav.goBack()} />
    </ScreenWrapper>
  );
}


