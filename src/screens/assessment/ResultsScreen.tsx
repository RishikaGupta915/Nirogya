import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { RiskBadge, GradientButton, GhostButton } from '../../components/UI';
import { COLORS, FONTS } from '../../constants/theme';
import { UI_CLASSES, UI_SHADOWS } from '../../constants/ui';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';
import type { DiagnosisResult } from '../../services/aiService';

const STEP_COLORS = [COLORS.pink, COLORS.purple, COLORS.indigo, COLORS.blue];
const STEP_BGS = [
  COLORS.pinkBg,
  COLORS.purpleBg,
  COLORS.indigoBg,
  COLORS.blueBg
];

export default function ResultsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const heroAnim = useEntranceAnimation(0, 10);
  const bodyAnim = useEntranceAnimation(110, 12);

  const diagnosis: DiagnosisResult & { fairnessScore?: number } =
    route.params?.diagnosis;

  if (!diagnosis) {
    return (
      <ScreenWrapper>
        <Text className="text-textPrimary">No results found.</Text>
      </ScreenWrapper>
    );
  }

  const fillWidth = `${Math.min(diagnosis.riskScore, 100)}%`;
  const riskColor =
    diagnosis.riskLevel === 'high'
      ? COLORS.riskHigh
      : diagnosis.riskLevel === 'medium'
        ? COLORS.riskMed
        : COLORS.riskLow;

  return (
    <ScreenWrapper>
      <Animated.View style={heroAnim}>
        <View className="mb-4 flex-row items-center justify-between pt-2">
          <TouchableOpacity
            onPress={() => nav.navigate('Home')}
            className="h-[34px] w-[34px] items-center justify-center rounded-md border border-borderSoft bg-card"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
          <Text
            className="text-[19px] text-textPrimary"
            style={{ fontFamily: FONTS.serif }}
          >
            Your results
          </Text>
          <View className="w-[34px]" />
        </View>

        <View
          className={`mb-4 ${UI_CLASSES.cardShell} p-4`}
          style={{
            backgroundColor: COLORS.bgCard,
            borderColor: COLORS.purpleBorder,
            ...UI_SHADOWS.strong
          }}
        >
          <RiskBadge level={diagnosis.riskLevel} />
          <Text
            className="mb-2 text-[24px] text-[#d5457a]"
            style={{ fontFamily: FONTS.serif, fontWeight: '600' }}
          >
            {diagnosis.diagnosis}
          </Text>
          <Text
            className="text-[13px] leading-[21px] text-textSecondary"
            style={{ fontFamily: FONTS.sans }}
          >
            {diagnosis.description}
          </Text>
        </View>
      </Animated.View>

      <Animated.View style={bodyAnim}>
        <View className="mb-4">
          <View className="mb-2 flex-row justify-between">
            <Text
              className="text-[11px] text-textMuted"
              style={{ fontFamily: FONTS.sans }}
            >
              Likelihood score
            </Text>
            <Text
              className="text-[13px] text-textPrimary"
              style={{ fontFamily: FONTS.sansBold }}
            >
              {diagnosis.riskScore}%
            </Text>
          </View>
          <View className="h-[6px] overflow-hidden rounded bg-borderSoft">
            <View
              className="h-full rounded"
              style={{ width: fillWidth as any, backgroundColor: riskColor }}
            />
          </View>
          {typeof diagnosis.fairnessScore === 'number' && (
            <View className="mt-2 flex-row justify-end">
              <Text
                className="text-[11px] text-textSecondary"
                style={{ fontFamily: FONTS.sansBold }}
              >
                Fairness score: {diagnosis.fairnessScore.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {diagnosis.seeDoctor && (
          <View
            className="mb-4 flex-row items-center gap-2 rounded-md border p-3"
            style={{
              backgroundColor: COLORS.amberBg,
              borderColor: COLORS.amberBorder
            }}
          >
            <MaterialCommunityIcons
              name="hospital-box-outline"
              size={16}
              color={COLORS.amber}
            />
            <Text
              className="text-[12px]"
              style={{ color: COLORS.amber, fontFamily: FONTS.sans }}
            >
              See a doctor:{' '}
              <Text style={{ fontFamily: FONTS.sansBold }}>
                {diagnosis.urgency}
              </Text>
            </Text>
          </View>
        )}

        <View
          className={`mb-4 ${UI_CLASSES.cardShell} p-4`}
          style={UI_SHADOWS.cool}
        >
          <Text
            className="mb-3 text-[12px] text-textSecondary"
            style={{ fontFamily: FONTS.sansBold }}
          >
            What to do next
          </Text>
          {diagnosis.nextSteps.map((step, i) => (
            <View key={i} className="mb-3 flex-row items-start gap-3">
              <View
                className="mt-[1px] h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: STEP_BGS[i % STEP_BGS.length] }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: STEP_COLORS[i % STEP_COLORS.length] }}
                >
                  {i + 1}
                </Text>
              </View>
              <Text
                className="flex-1 text-[12px] leading-[19px] text-textSecondary"
                style={{ fontFamily: FONTS.sans }}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>

        <View className="mb-4 flex-row items-start gap-1">
          <MaterialCommunityIcons
            name="information-outline"
            size={12}
            color={COLORS.textHint}
          />
          <Text
            className="flex-1 text-[11px] leading-[17px] text-textHint"
            style={{ fontFamily: FONTS.sans }}
          >
            This is not a medical diagnosis. Always consult a qualified doctor
            before starting treatment.
          </Text>
        </View>

        <GradientButton
          label="Check another symptom"
          onPress={() => nav.navigate('Home')}
        />
        <GhostButton
          label="View all history"
          onPress={() => nav.navigate('History')}
        />
      </Animated.View>
    </ScreenWrapper>
  );
}
