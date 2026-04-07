// src/screens/onboarding/ChooseLanguageScreen.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ProgressDots, GradientButton, GhostButton } from '../../components/UI';
import {
  LANGUAGES,
  COLORS,
  FONTS
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

      <Text className="mb-2 text-[22px] text-textPrimary dark:text-slate-100" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
        Choose your language
      </Text>
      <Text className="mb-4 text-[12px] leading-[18px] text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
        Nirogya works fully in your preferred language — questions, results,
        everything.
      </Text>

      {/* Main 8 languages in 2-col grid */}
      <View className="mb-4 flex-row flex-wrap gap-2">
        {MAIN_LANGS.map((lang) => {
          const isSel = selected === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              className="w-[47%] items-center rounded-xl border bg-card dark:bg-slate-900/72 p-3"
              style={isSel ? { backgroundColor: COLORS.pinkBg, borderColor: COLORS.pinkBorder } : { borderColor: COLORS.border }}
              onPress={() => setSelected(lang.code)}
              activeOpacity={0.8}
            >
              <View
                className="mb-2 h-4 w-4 items-center justify-center rounded-full border"
                style={isSel ? { backgroundColor: COLORS.gradStart, borderColor: 'transparent' } : { borderColor: COLORS.border }}
              >
                {isSel && <Text className="text-[9px] font-bold text-white">✓</Text>}
              </View>
              <Text
                className="mb-[3px] text-[18px] font-bold"
                style={{ color: isSel ? COLORS.pink : COLORS.textSecondary }}
              >
                {lang.native}
              </Text>
              <Text
                className="text-[11px]"
                style={{ color: isSel ? COLORS.pink : COLORS.textMuted, fontFamily: FONTS.sans }}
              >
                {lang.english}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Divider */}
      <View className="mb-3 flex-row items-center gap-2">
        <View className="h-[0.5px] flex-1 bg-borderSoft" />
        <Text className="text-[11px] text-textHint dark:text-slate-400" style={{ fontFamily: FONTS.sans }}>
          also available
        </Text>
        <View className="h-[0.5px] flex-1 bg-borderSoft" />
      </View>

      {/* Extra languages as chips */}
      <View className="mb-6 flex-row flex-wrap gap-2">
        {EXTRA_LANGS.map((lang) => {
          const isSel = selected === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              className="rounded-full border px-3 py-[6px]"
              style={isSel ? { backgroundColor: COLORS.pinkBg, borderColor: COLORS.pinkBorder } : { backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}
              onPress={() => setSelected(lang.code)}
              activeOpacity={0.8}
            >
              <Text
                className="text-[12px]"
                style={{
                  color: isSel ? COLORS.pink : COLORS.textMuted,
                  fontFamily: FONTS.sans
                }}
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


