// src/screens/onboarding/AboutYou5Screen.tsx — Medical History

import React, { useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import {
  ProgressDots,
  ProgressBar,
  GradientButton,
  GhostButton,
  SectionLabel,
  Chip
} from '../../components/UI';
import { COLORS, FONTS } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import {
  auth,
  saveUserProfile,
  saveLanguage
} from '../../services/authService';

const CONDITIONS = [
  'PCOS',
  'Thyroid',
  'Diabetes',
  'Anaemia',
  'Hypertension',
  'Endometriosis',
  'Arthritis',
  'None'
];
const FAMILY_HISTORY = [
  'Diabetes',
  'Heart disease',
  'Cancer',
  'Thyroid',
  'Hypertension',
  'None known'
];
const ALLERGIES = [
  'Penicillin',
  'Sulfa drugs',
  'NSAIDs',
  'Aspirin',
  'Dust/pollen',
  'None'
];

export default function AboutYou5Screen() {
  const nav = useNavigation<any>();
  const { setUserProfile, userProfile } = useApp();

  const [conditions, setConditions] = useState<string[]>(
    userProfile.conditions ?? []
  );
  const [familyHistory, setFamilyHistory] = useState<string[]>(
    userProfile.familyHistory ?? []
  );
  const [medications, setMedications] = useState(userProfile.medications ?? '');
  const [allergies, setAllergies] = useState<string[]>(
    userProfile.allergies ?? []
  );
  const [loading, setLoading] = useState(false);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const handleComplete = async () => {
    const finalProfile = {
      ...userProfile,
      conditions,
      familyHistory,
      medications,
      allergies
    };
    setUserProfile({ conditions, familyHistory, medications, allergies });

    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        await saveUserProfile(uid, finalProfile);
        if (userProfile.language) await saveLanguage(uid, userProfile.language);
      }
      if (!auth.currentUser) {
        nav.navigate('ProfileReady');
      } else {
        nav.navigate('MainTabs'); // or another authenticated screen
      }
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <ProgressDots total={5} current={4} />
      <ProgressBar current={5} total={5} />

      <Text className="mb-2 text-[20px] text-textPrimary dark:text-slate-100" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
        Medical background
      </Text>
      <Text className="mb-4 text-[12px] leading-[18px] text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
        Known conditions help us flag risks you may not have linked to your
        symptoms.
      </Text>

      <SectionLabel label="Existing conditions (if any)" />
      <View className="mb-2 flex-row flex-wrap">
        {CONDITIONS.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={conditions.includes(c)}
            color="indigo"
            onPress={() => toggle(conditions, setConditions, c)}
          />
        ))}
      </View>

      <SectionLabel label="Family history" />
      <View className="mb-2 flex-row flex-wrap">
        {FAMILY_HISTORY.map((f) => (
          <Chip
            key={f}
            label={f}
            selected={familyHistory.includes(f)}
            color="red"
            onPress={() => toggle(familyHistory, setFamilyHistory, f)}
          />
        ))}
      </View>

      <SectionLabel label="Current medications (optional)" />
      <TextInput
        className="mb-2 rounded-lg border border-borderSoft bg-card dark:bg-slate-900/72 px-3 py-3 text-[13px] text-textPrimary dark:text-slate-100"
        style={{ fontFamily: FONTS.sans, textAlignVertical: 'top' }}
        placeholder="e.g. thyroid meds, birth control, iron tablets…"
        placeholderTextColor={COLORS.textHint}
        value={medications}
        onChangeText={setMedications}
        multiline
        numberOfLines={2}
      />

      <SectionLabel label="Allergies" />
      <View className="mb-2 flex-row flex-wrap">
        {ALLERGIES.map((a) => (
          <Chip
            key={a}
            label={a}
            selected={allergies.includes(a)}
            color="amber"
            onPress={() => toggle(allergies, setAllergies, a)}
          />
        ))}
      </View>

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
          This profile is built once and improves every assessment you do. You
          can update it anytime from your profile.
        </Text>
      </View>

      <GradientButton
        label="Complete my profile →"
        onPress={handleComplete}
        loading={loading}
      />
      <GhostButton
        label="Skip for now"
        onPress={() => {
          if (!auth.currentUser) {
            nav.navigate('ProfileReady');
          } else {
            nav.navigate('MainTabs');
          }
        }}
      />
    </ScreenWrapper>
  );
}


