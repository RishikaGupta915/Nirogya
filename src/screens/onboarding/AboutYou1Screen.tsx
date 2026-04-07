// src/screens/onboarding/AboutYou1Screen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
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

      <Text className="mb-2 text-[20px] text-textPrimary" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
        Tell us about yourself
      </Text>
      <Text className="mb-4 text-[12px] leading-[18px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
        This helps us make your health assessment accurate and personal.
      </Text>

      {/* City */}
      <View className="mb-3 gap-1">
        <Text
          className="text-[10px] uppercase tracking-[0.8px] text-textHint"
          style={{ fontFamily: FONTS.sans }}
        >
          City / Town
        </Text>
        <TextInput
          className="rounded-lg border border-borderSoft bg-card px-3 py-3 text-[14px] text-textPrimary"
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