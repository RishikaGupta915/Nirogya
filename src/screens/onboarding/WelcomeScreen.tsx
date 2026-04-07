// src/screens/onboarding/WelcomeScreen.tsx

import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { GradientButton, GhostButton } from '../../components/UI';
import { COLORS, FONTS } from '../../constants/theme';

const FEATURES = [
  {
    icon:  'clock-outline',
    color: COLORS.pink,
    bg:    'rgba(255,255,255,0.8)',
    title: 'Smart symptom analysis',
    sub:   'Adapts to your answers in real time',
  },
  {
    icon:  'clipboard-check-outline',
    color: COLORS.purple,
    bg:    'rgba(255,255,255,0.8)',
    title: 'Risk score & next steps',
    sub:   'Know exactly when to see a doctor',
  },
  {
    icon:  'chat-outline',
    color: COLORS.teal,
    bg:    'rgba(255,255,255,0.8)',
    title: 'Your language, your comfort',
    sub:   'Tamil, Hindi, Telugu & 8 more',
  },
];

export default function WelcomeScreen() {
  const nav = useNavigation<any>();

  return (
    <ScreenWrapper>
      {/* Hero */}
      <View className="items-center pb-4 pt-6">
        <View
          className="mb-3 h-[74px] w-[74px] items-center justify-center rounded-full bg-card dark:bg-slate-900/72"
          style={{
            shadowColor: '#2f4b84',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 14,
            elevation: 4
          }}
        >
          <MaterialCommunityIcons name="heart-pulse" size={28} color={COLORS.pink} />
        </View>
        <Text
          className="mb-2 text-[28px] text-textPrimary dark:text-slate-100"
          style={{ fontFamily: FONTS.serif, fontWeight: '600', letterSpacing: -0.5 }}
        >
          Nirogya
        </Text>
        <Text
          className="mb-2 text-center text-[26px] leading-[34px] text-textPrimary dark:text-slate-100"
          style={{ fontFamily: FONTS.serif, fontWeight: '600' }}
        >
          Your health, finally{'\n'}understood
        </Text>
        <Text className="mb-6 text-center text-[13px] leading-5 text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
          Not generic advice. Personalised symptom care,{'\n'}built for Indian women.
        </Text>
      </View>

      {/* Features */}
      <View className="mb-6 gap-[2px]">
        {FEATURES.map((f, i) => (
          <View
            key={i}
            className="mb-2 flex-row items-center gap-3 rounded-xl2 bg-card dark:bg-slate-900/72 px-3 py-[11px]"
            style={{
              shadowColor: '#2f4b84',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
              elevation: 2
            }}
          >
            <View className="h-[34px] w-[34px] items-center justify-center rounded-md" style={{ backgroundColor: f.bg }}>
              <MaterialCommunityIcons name={f.icon as any} size={16} color={f.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text className="mb-[2px] text-[13px] text-textPrimary dark:text-slate-100" style={{ fontFamily: FONTS.sansBold }}>
                {f.title}
              </Text>
              <Text className="text-[11px] text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
                {f.sub}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <GradientButton
        label="Get started"
        onPress={() => nav.navigate('ChooseLanguage')}
        style={{ marginBottom: 0 }}
      />
      <GhostButton
        label="I already have an account"
        onPress={() => nav.navigate('SignIn')}
      />
    </ScreenWrapper>
  );
}


