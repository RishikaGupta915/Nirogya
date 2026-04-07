// src/screens/onboarding/AboutYou5Screen.tsx — Medical History

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
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
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
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
    } catch (_err: any) {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <ProgressDots total={5} current={4} />
      <ProgressBar current={5} total={5} />

      <Text style={styles.heading}>Medical background</Text>
      <Text style={styles.sub}>
        Known conditions help us flag risks you may not have linked to your
        symptoms.
      </Text>

      <SectionLabel label="Existing conditions (if any)" />
      <View style={styles.chipRow}>
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
      <View style={styles.chipRow}>
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
        style={styles.input}
        placeholder="e.g. thyroid meds, birth control, iron tablets…"
        placeholderTextColor={COLORS.textHint}
        value={medications}
        onChangeText={setMedications}
        multiline
        numberOfLines={2}
      />

      <SectionLabel label="Allergies" />
      <View style={styles.chipRow}>
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

      <View style={styles.tip}>
        <Text style={styles.tipText}>
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

const styles = StyleSheet.create({
  heading: {
    fontFamily: FONTS.serif,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm
  },
  sub: {
    fontSize: 12,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: SPACING.lg
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.sm },
  input: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: FONTS.sans,
    textAlignVertical: 'top',
    marginBottom: SPACING.sm
  },
  tip: {
    backgroundColor: 'rgba(129,140,248,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(129,140,248,0.18)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg
  },
  tipText: {
    fontSize: 11,
    color: 'rgba(165,180,252,0.7)',
    fontFamily: FONTS.sans,
    lineHeight: 17
  }
});
