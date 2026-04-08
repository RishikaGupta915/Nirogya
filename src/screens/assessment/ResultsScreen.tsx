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

type RouteDiagnosis = Partial<DiagnosisResult> & { fairnessScore?: number };

function normalizeDiagnosis(input?: RouteDiagnosis) {
  if (!input) return null;

  const riskLevel: DiagnosisResult['riskLevel'] =
    input.riskLevel === 'high' || input.riskLevel === 'low'
      ? input.riskLevel
      : 'medium';

  const riskScore =
    typeof input.riskScore === 'number' && Number.isFinite(input.riskScore)
      ? Math.max(0, Math.min(input.riskScore, 100))
      : 50;

  const nextSteps = Array.isArray(input.nextSteps)
    ? input.nextSteps.filter(
        (step): step is string =>
          typeof step === 'string' && step.trim().length > 0
      )
    : [];

  return {
    diagnosis: input.diagnosis?.trim() || 'Assessment summary',
    description:
      input.description?.trim() ||
      'Your recent symptom check has been summarized below.',
    riskScore,
    riskLevel,
    nextSteps:
      nextSteps.length > 0
        ? nextSteps
        : [
            'Track your symptoms for the next 24-48 hours.',
            'Stay hydrated and rest.',
            'Consult a doctor if symptoms persist or worsen.'
          ],
    seeDoctor: input.seeDoctor ?? riskLevel === 'high',
    urgency:
      input.urgency?.trim() ||
      (riskLevel === 'high' ? 'As soon as possible' : 'Within a few days'),
    fairnessScore:
      typeof input.fairnessScore === 'number' ? input.fairnessScore : undefined
  };
}

export default function ResultsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const heroAnim = useEntranceAnimation(0, 10);
  const bodyAnim = useEntranceAnimation(110, 12);

  const diagnosis = normalizeDiagnosis(
    route.params?.diagnosis as RouteDiagnosis | undefined
  );

  if (!diagnosis) {
    return (
      <ScreenWrapper>
        <Text className="text-textPrimary dark:text-slate-100">
          No results found.
        </Text>
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

  const goToTab = (screen: 'Home' | 'History') => {
    nav.navigate('MainTabs', { screen });
  };

  return (
    <ScreenWrapper>
      <Animated.View style={heroAnim}>
        <View className="mb-4 flex-row items-center justify-between pt-2">
          <TouchableOpacity
            onPress={() => (nav.canGoBack() ? nav.goBack() : goToTab('Home'))}
            className="h-[36px] w-[36px] items-center justify-center rounded-xl bg-card dark:bg-slate-900/72"
            style={UI_SHADOWS.soft}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
          <Text
            className="text-[19px] text-textPrimary dark:text-slate-100"
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
            ...UI_SHADOWS.strong
          }}
        >
          <RiskBadge level={diagnosis.riskLevel} />
          <Text
            className="mb-2 text-[28px] text-[#d5457a]"
            style={{
              fontFamily: FONTS.serif,
              fontWeight: '600',
              letterSpacing: -0.4
            }}
          >
            {diagnosis.diagnosis}
          </Text>
          <Text
            className="text-[13px] leading-[21px] text-textSecondary dark:text-slate-200"
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
              className="text-[11px] text-textMuted dark:text-slate-300"
              style={{ fontFamily: FONTS.sans }}
            >
              Likelihood score
            </Text>
            <Text
              className="text-[13px] text-textPrimary dark:text-slate-100"
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
                className="text-[11px] text-textSecondary dark:text-slate-200"
                style={{ fontFamily: FONTS.sansBold }}
              >
                Fairness score: {diagnosis.fairnessScore.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {diagnosis.seeDoctor && (
          <View
            className="mb-4 flex-row items-center gap-2 rounded-xl bg-card dark:bg-slate-900/72 px-3 py-[11px]"
            style={UI_SHADOWS.soft}
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
            className="mb-3 text-[12px] text-textSecondary dark:text-slate-200"
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
                className="flex-1 text-[12px] leading-[19px] text-textSecondary dark:text-slate-200"
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
            className="flex-1 text-[11px] leading-[17px] text-textHint dark:text-slate-400"
            style={{ fontFamily: FONTS.sans }}
          >
            This is not a medical diagnosis. Always consult a qualified doctor
            before starting treatment.
          </Text>
        </View>

        <GradientButton
          label="Check another symptom"
          onPress={() => goToTab('Home')}
        />
        <GhostButton
          label="View all history"
          onPress={() => goToTab('History')}
        />
      </Animated.View>
    </ScreenWrapper>
  );
}
