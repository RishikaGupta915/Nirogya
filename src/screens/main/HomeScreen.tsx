import React, { useState } from 'react';
import NiraIconButton from '../../components/NiraIconButton';
import { View, Text, TextInput, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import {
  CATEGORY_COLORS,
  COLORS,
  FONTS,
  RISK_COLORS,
  SYMPTOM_CATEGORIES
} from '../../constants/theme';
import { UI_CLASSES, UI_SHADOWS } from '../../constants/ui';
import { useApp } from '../../context/AppContext';
import { auth } from '../../services/authService';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';
import { useRecentAssessments } from '../../hooks/useRecentAssessments';

const WELLNESS_SPARKS = ['Hydration', 'Sleep quality', 'Stress check'];

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { userProfile } = useApp();
  const [search, setSearch] = useState('');
  const uid = auth.currentUser?.uid;
  const { assessments: recent } = useRecentAssessments(uid, 3);
  const heroAnim = useEntranceAnimation(0, 10);
  const recentAnim = useEntranceAnimation(90, 12);
  const contentAnim = useEntranceAnimation(170, 14);

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const handleSymptomSearch = () => {
    if (search.trim()) {
      nav.navigate('Assessment', { symptom: search.trim() });
      setSearch('');
    }
  };

  const handleCategory = (cat: (typeof SYMPTOM_CATEGORIES)[0]) => {
    nav.navigate('Assessment', { symptom: cat.label });
  };

  return (
    <ScreenWrapper>
      <Animated.View style={heroAnim}>
        <View className="mb-5 flex-row items-center justify-between pt-2">
          <View>
            <Text
              className="text-[29px] text-textPrimary"
              style={{ fontFamily: FONTS.serif, fontWeight: '600', letterSpacing: -0.5 }}
            >
              Nirogya
            </Text>
            <Text className="mt-[3px] text-[13px] text-textSecondary" style={{ fontFamily: FONTS.sans }}>
              Good {timeOfDay}, {userProfile.name?.split(' ')[0] ?? 'there'}
            </Text>
          </View>
          <TouchableOpacity
            className="h-[38px] w-[38px] items-center justify-center rounded-full border border-borderMed bg-white"
            style={UI_SHADOWS.medium}
            onPress={() => nav.navigate('Profile')}
          >
            <Text className="text-[16px] text-brandStart" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
              {(userProfile.name ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mb-2 items-end">
          <NiraIconButton />
        </View>

        <View className="mb-4 flex-row flex-wrap gap-2">
          {WELLNESS_SPARKS.map((spark) => (
            <View key={spark} className="rounded-full border border-borderSoft bg-white/80 px-[13px] py-[8px]">
              <Text className="text-[11px] tracking-[0.1px] text-textSecondary" style={{ fontFamily: FONTS.sans }}>
                {spark}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={recentAnim}>
        {recent.length > 0 && (
          <TouchableOpacity
            className={`mb-5 ${UI_CLASSES.cardShell} border-pinkSoft p-4`}
            style={UI_SHADOWS.strong}
            onPress={() => nav.navigate('History')}
            activeOpacity={0.85}
          >
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-[13px] text-[#d5457a]" style={{ fontFamily: FONTS.sansBold }}>
                Last check: {recent[0].symptom}
              </Text>
              <View
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    RISK_COLORS[
                      recent[0].riskLevel as keyof typeof RISK_COLORS
                    ]
                }}
              />
            </View>
            <Text className="mb-1 text-[12px] leading-[18px] text-textSecondary" style={{ fontFamily: FONTS.sans }}>
              {recent[0].diagnosis}
            </Text>
            <Text className="text-[10px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
              Tap to view history →
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <Animated.View style={contentAnim}>
        <Text className={UI_CLASSES.sectionEyebrow} style={{ fontFamily: FONTS.sansBold }}>
          TYPE YOUR SYMPTOM
        </Text>
        <View
          className="mb-5 flex-row items-center gap-2 rounded-xl border border-borderSoft bg-card px-3 py-[11px]"
          style={UI_SHADOWS.medium}
        >
          <MaterialCommunityIcons name="magnify" size={16} color={COLORS.textMuted} />
          <TextInput
            className="flex-1 text-[13px] text-textPrimary"
            style={{ fontFamily: FONTS.sans }}
            placeholder="e.g. knee pain, hair loss, nausea…"
            placeholderTextColor={COLORS.textHint}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSymptomSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={handleSymptomSearch} className="px-2">
              <Text className="text-[12px] text-[#d5457a]" style={{ fontFamily: FONTS.sansBold }}>
                Go →
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text className={UI_CLASSES.sectionEyebrow} style={{ fontFamily: FONTS.sansBold }}>
          OR CHOOSE A CATEGORY
        </Text>
        <View className="flex-row flex-wrap gap-[10px]">
          {SYMPTOM_CATEGORIES.map((cat) => {
            const c =
              CATEGORY_COLORS[cat.color as keyof typeof CATEGORY_COLORS] ??
              CATEGORY_COLORS.pink;
            return (
              <TouchableOpacity
                key={cat.id}
                className="w-[47%] rounded-xl2 border p-4"
                style={{
                  backgroundColor: c.bg,
                  borderColor: c.border,
                  ...UI_SHADOWS.soft
                }}
                onPress={() => handleCategory(cat)}
                activeOpacity={0.8}
              >
                <View
                  className="mb-2 h-[34px] w-[34px] items-center justify-center rounded-md"
                  style={{ backgroundColor: `${c.bg}99` }}
                >
                  <MaterialCommunityIcons name={cat.icon as any} size={18} color={c.icon} />
                </View>
                <Text className="mb-[2px] text-[12px]" style={{ color: c.text, fontFamily: FONTS.sansBold }}>
                  {cat.label}
                </Text>
                <Text className="text-[10px] leading-[15px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
                  {cat.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </ScreenWrapper>
  );
}