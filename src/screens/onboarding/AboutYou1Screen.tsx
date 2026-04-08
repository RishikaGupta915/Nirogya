// src/screens/onboarding/AboutYou1Screen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ProgressDots, ProgressBar, GradientButton, SectionLabel, Chip } from '../../components/UI';
import { COLORS, FONTS } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

const AGE_GROUPS   = ['13–17', '18–25', '26–35', '36–45', '46–55', '56+'];
const LIFE_STAGES  = ['Student', 'Working', 'Homemaker', 'Pregnant', 'New mother', 'Retired'];

export default function AboutYou1Screen() {
  const nav = useNavigation<any>();
  const { setUserProfile, userProfile } = useApp();

  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState(
    typeof userProfile.monthlyIncome === 'number' &&
      Number.isFinite(userProfile.monthlyIncome) &&
      userProfile.monthlyIncome > 0
      ? String(Math.round(userProfile.monthlyIncome))
      : ''
  );
  const [preferNoIncome, setPreferNoIncome] = useState(
    Boolean(userProfile.incomeNotShared)
  );
  const [city,      setCity]      = useState(userProfile.city ?? '');
  const [ageGroup,  setAgeGroup]  = useState(userProfile.ageGroup ?? '');
  const [lifeStage, setLifeStage] = useState(userProfile.lifeStage ?? '');

  const normalizedIncome = Number(monthlyIncomeInput.replace(/[^\d]/g, ''));
  const hasIncome = Number.isFinite(normalizedIncome) && normalizedIncome > 0;
  const canContinue = Boolean(ageGroup && lifeStage && (hasIncome || preferNoIncome));

  const handleIncomeChange = (value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, '');
    setMonthlyIncomeInput(digitsOnly);
    if (digitsOnly.length > 0) {
      setPreferNoIncome(false);
    }
  };

  const handleToggleIncomePrivacy = () => {
    setPreferNoIncome((prev) => {
      const next = !prev;
      if (next) {
        setMonthlyIncomeInput('');
      }
      return next;
    });
  };

  const handleNext = () => {
    setUserProfile({
      city,
      ageGroup,
      lifeStage,
      monthlyIncome: preferNoIncome ? null : normalizedIncome,
      incomeNotShared: preferNoIncome
    });
    nav.navigate('AboutYou2');
  };

  return (
    <ScreenWrapper>
      <ProgressDots total={5} current={0} />
      <ProgressBar current={1} total={5} />

      <Text className="mb-2 text-[20px] text-textPrimary dark:text-slate-100" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
        Tell us about yourself
      </Text>
      <Text className="mb-4 text-[12px] leading-[18px] text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
        This helps us make your health assessment accurate and personal.
      </Text>

      <SectionLabel label="Monthly household income (INR)" />
      <View className="mb-3 gap-2">
        <TextInput
          className="rounded-lg border border-borderSoft bg-card dark:bg-slate-900/72 px-3 py-3 text-[14px] text-textPrimary dark:text-slate-100"
          style={{ fontFamily: FONTS.sans }}
          placeholder="e.g. 35000"
          placeholderTextColor={COLORS.textHint}
          keyboardType="number-pad"
          editable={!preferNoIncome}
          value={monthlyIncomeInput}
          onChangeText={handleIncomeChange}
        />
        <TouchableOpacity
          className="self-start rounded-full border px-3 py-2"
          style={{
            borderColor: preferNoIncome ? COLORS.pinkBorder : COLORS.border,
            backgroundColor: preferNoIncome ? COLORS.pinkBg : COLORS.bgCard
          }}
          onPress={handleToggleIncomePrivacy}
          activeOpacity={0.85}
        >
          <Text
            className="text-[11px]"
            style={{
              color: preferNoIncome ? COLORS.pink : COLORS.textSecondary,
              fontFamily: preferNoIncome ? FONTS.sansBold : FONTS.sans
            }}
          >
            {preferNoIncome ? 'Income marked as private' : 'Prefer not to say'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* City */}
      <View className="mb-3 gap-1">
        <Text
          className="text-[10px] uppercase tracking-[0.8px] text-textHint dark:text-slate-400"
          style={{ fontFamily: FONTS.sans }}
        >
          City / Town
        </Text>
        <TextInput
          className="rounded-lg border border-borderSoft bg-card dark:bg-slate-900/72 px-3 py-3 text-[14px] text-textPrimary dark:text-slate-100"
          style={{ fontFamily: FONTS.sans }}
          placeholder="e.g. Chennai, Coimbatore…"
          placeholderTextColor={COLORS.textHint}
          value={city}
          onChangeText={setCity}
        />
      </View>

      {/* Age group */}
      <SectionLabel label="Age group" />
      <View className="mb-2 flex-row flex-wrap">
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
      <View className="mb-2 flex-row flex-wrap">
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
      <View
        className="mb-4 mt-3 rounded-lg border px-3 py-3"
        style={{
          backgroundColor: 'rgba(129,140,248,0.07)',
          borderColor: 'rgba(129,140,248,0.18)'
        }}
      >
        <Text
          className="text-[11px] leading-[17px]"
          style={{ color: 'rgba(165,180,252,0.7)', fontFamily: FONTS.sans }}
        >
          Your information is private and never shared without permission.
        </Text>
      </View>

      <GradientButton label="Next →" onPress={handleNext} disabled={!canContinue} />
    </ScreenWrapper>
  );
}


