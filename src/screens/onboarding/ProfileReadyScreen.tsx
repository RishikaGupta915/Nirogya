// src/screens/onboarding/ProfileReadyScreen.tsx

import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { GradientButton } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import {
  COLORS,
  FONTS,
  GREETINGS,
  LANGUAGES
} from '../../constants/theme';

export default function ProfileReadyScreen() {
  const nav = useNavigation<any>();
  const { userProfile } = useApp();

  const langCode  = userProfile.language ?? 'en';
  const greeting  = GREETINGS[langCode] ?? 'Hello';
  const langLabel = LANGUAGES.find(l => l.code === langCode)?.english ?? 'English';
  const nativeLbl = LANGUAGES.find(l => l.code === langCode)?.native ?? 'English';

  const summaryRows = [
    { label: 'Language',   value: `${nativeLbl} ${langLabel}` },
    { label: 'Age group',  value: userProfile.ageGroup ?? '—' },
    { label: 'Life stage', value: userProfile.lifeStage ?? '—' },
    { label: 'Activity',   value: userProfile.activityLevel ?? '—' },
    { label: 'Diet',       value: userProfile.dietType ?? '—' },
  ];

  return (
    <ScreenWrapper>
      {/* Success circle */}
      <View
        className="mb-4 mt-6 h-[72px] w-[72px] self-center items-center justify-center rounded-full border"
        style={{ backgroundColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.3)' }}
      >
        <MaterialCommunityIcons name="check-circle-outline" size={32} color={COLORS.teal} />
      </View>

      <Text className="mb-2 text-center text-[24px] text-textPrimary dark:text-slate-100" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
        {greeting}, {userProfile.name ?? 'there'}!
      </Text>
      <Text className="mb-2 text-center text-[13px] leading-5 text-textSecondary dark:text-slate-200" style={{ fontFamily: FONTS.sans }}>
        You&apos;re all set. Nirogya is ready in{' '}
        <Text style={{ color: COLORS.pink, fontFamily: FONTS.sansBold }}>{langLabel}</Text> for you.
      </Text>
      <Text className="mb-6 text-center text-[11px] leading-[17px] text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
        You can update your language and profile anytime from settings.
      </Text>

      {/* Setup summary card */}
      <View className="mb-6 rounded-xl border border-borderSoft bg-card dark:bg-slate-900/72 px-4">
        <Text className="py-3 text-[9px] uppercase tracking-[1px] text-textHint dark:text-slate-400" style={{ fontFamily: FONTS.sansBold }}>
          YOUR SETUP
        </Text>
        {summaryRows.map((row) => (
          <View
            key={row.label}
            className="flex-row items-center justify-between py-3"
          >
            <Text className="text-[12px] text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
              {row.label}
            </Text>
            <Text className="text-[12px] text-textSecondary dark:text-slate-200" style={{ fontFamily: FONTS.sansBold }}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>

      <GradientButton
        label="Start using Nirogya →"
        onPress={() => nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
      />
    </ScreenWrapper>
  );
}


