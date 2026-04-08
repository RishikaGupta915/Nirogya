import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Linking,
  Alert,
  Share
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { RiskBadge, GradientButton, GhostButton } from '../../components/UI';
import { COLORS, FONTS } from '../../constants/theme';
import { UI_CLASSES, UI_SHADOWS } from '../../constants/ui';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';
import type {
  AlertItem,
  DiagnosisResult,
  NearbyFacility
} from '../../services/aiService';
import {
  createShareLink,
  revokeShareLink,
  type ShareLinkRecord
} from '../../services/shareService';
import { useApp } from '../../context/AppContext';
import { t } from '../../localization/i18n';

const STEP_COLORS = [COLORS.pink, COLORS.purple, COLORS.indigo, COLORS.blue];
const STEP_BGS = [
  COLORS.pinkBg,
  COLORS.purpleBg,
  COLORS.indigoBg,
  COLORS.blueBg
];

type RouteDiagnosis = Partial<DiagnosisResult> & { fairnessScore?: number };
type RouteRecommendation = {
  carePathway?: string;
  facilityType?: string;
  estimatedCostLow?: number;
  estimatedCostHigh?: number;
  pmjayApplicable?: boolean;
};

function severityPalette(severity: AlertItem['severity']) {
  if (severity === 'critical') {
    return {
      border: 'rgba(239,68,68,0.28)',
      bg: 'rgba(254,226,226,0.9)',
      text: '#b91c1c',
      icon: 'alert-octagon'
    };
  }

  if (severity === 'warning') {
    return {
      border: 'rgba(245,158,11,0.28)',
      bg: 'rgba(254,243,199,0.92)',
      text: '#92400e',
      icon: 'alert'
    };
  }

  return {
    border: 'rgba(37,99,235,0.24)',
    bg: 'rgba(219,234,254,0.92)',
    text: '#1d4ed8',
    icon: 'information'
  };
}

function normalizeAlerts(
  input: unknown,
  diagnosis: ReturnType<typeof normalizeDiagnosis>
): AlertItem[] {
  if (Array.isArray(input) && input.length > 0) {
    return input.filter(
      (item): item is AlertItem =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        (item.severity === 'critical' ||
          item.severity === 'warning' ||
          item.severity === 'info') &&
        typeof item.title === 'string' &&
        typeof item.message === 'string'
    );
  }

  if (!diagnosis) return [];

  if (diagnosis.riskLevel === 'high') {
    return [
      {
        id: 'fallback-critical',
        severity: 'critical',
        title: 'Urgent guidance',
        message:
          'Please seek immediate medical care and call 108 if symptoms are severe.',
        action: null
      }
    ];
  }

  if (diagnosis.riskLevel === 'medium') {
    return [
      {
        id: 'fallback-warning',
        severity: 'warning',
        title: 'Doctor follow-up recommended',
        message: 'Book a consultation within 1-2 weeks and monitor symptoms.',
        action: null
      }
    ];
  }

  return [
    {
      id: 'fallback-info',
      severity: 'info',
      title: 'Self-care monitoring',
      message: 'Continue tracking symptoms and seek help if anything worsens.',
      action: null
    }
  ];
}

function normalizeNearbyFacilities(input: unknown) {
  if (!Array.isArray(input)) return [] as NearbyFacility[];
  return input.filter(
    (item): item is NearbyFacility =>
      Boolean(item) &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.facilityType === 'string' &&
      typeof item.address === 'string' &&
      typeof item.mapUrl === 'string'
  );
}

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
  const { userProfile } = useApp();
  const language = userProfile.language ?? 'en';
  const heroAnim = useEntranceAnimation(0, 10);
  const bodyAnim = useEntranceAnimation(110, 12);

  const diagnosis = normalizeDiagnosis(
    route.params?.diagnosis as RouteDiagnosis | undefined
  );
  const recommendation = (route.params?.recommendation ||
    null) as RouteRecommendation | null;
  const assessmentId =
    typeof route.params?.assessmentId === 'string'
      ? route.params.assessmentId
      : null;
  const alerts = normalizeAlerts(route.params?.alerts, diagnosis);
  const nearbyFacilities = normalizeNearbyFacilities(
    route.params?.nearbyFacilities
  );
  const [shareMeta, setShareMeta] = useState<ShareLinkRecord | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);

  if (!diagnosis) {
    return (
      <ScreenWrapper>
        <Text className="text-textPrimary dark:text-slate-100">
          {t(language, 'results_no_results')}
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

  const openMap = async (facility: NearbyFacility) => {
    try {
      await Linking.openURL(facility.mapUrl);
    } catch {
      Alert.alert('Map Error', 'Unable to open map for this facility.');
    }
  };

  const handleShareWithDoctor = async () => {
    if (!assessmentId) {
      Alert.alert(
        'Share unavailable',
        'This assessment does not have a saved id yet. Please retry from history.'
      );
      return;
    }

    setShareLoading(true);
    try {
      const created = await createShareLink(assessmentId, 72);
      setShareMeta(created);

      const expiresAtLabel = new Date(created.expiresAt).toLocaleString('en-IN');
      await Share.share({
        message: `Nirogya doctor summary link (expires ${expiresAtLabel}):\n${created.shareUrl}`,
        url: created.shareUrl
      });
    } catch (err: any) {
      Alert.alert(
        'Share failed',
        err?.message || 'Could not create a doctor share link right now.'
      );
    } finally {
      setShareLoading(false);
    }
  };

  const handleRevokeShareLink = async () => {
    if (!shareMeta?.id) return;
    setRevokeLoading(true);
    try {
      await revokeShareLink(shareMeta.id);
      setShareMeta((prev) =>
        prev
          ? {
              ...prev,
              revokedAt: new Date().toISOString(),
              status: 'revoked'
            }
          : prev
      );
      Alert.alert('Link revoked', 'Doctor share link is now disabled.');
    } catch (err: any) {
      Alert.alert(
        'Revoke failed',
        err?.message || 'Could not revoke this share link right now.'
      );
    } finally {
      setRevokeLoading(false);
    }
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
            {t(language, 'results_title')}
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
              {t(language, 'results_likelihood_score')}
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
                {t(language, 'results_fairness_score', {
                  score: diagnosis.fairnessScore.toFixed(2)
                })}
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
              {t(language, 'results_see_doctor')}{' '}
              <Text style={{ fontFamily: FONTS.sansBold }}>
                {diagnosis.urgency}
              </Text>
            </Text>
          </View>
        )}

        {recommendation && (
          <View
            className="mb-4 rounded-xl bg-card dark:bg-slate-900/72 px-3 py-3"
            style={UI_SHADOWS.soft}
          >
            <Text
              className="text-[12px] text-textSecondary dark:text-slate-200"
              style={{ fontFamily: FONTS.sansBold }}
            >
              Suggested care route
            </Text>
            <Text
              className="mt-1 text-[12px] leading-[19px] text-textSecondary dark:text-slate-200"
              style={{ fontFamily: FONTS.sans }}
            >
              {recommendation.carePathway ||
                'Follow the next steps and choose an appropriate nearby facility.'}
            </Text>
            <Text
              className="mt-2 text-[11px] text-textMuted dark:text-slate-300"
              style={{ fontFamily: FONTS.sans }}
            >
              {`Facility: ${recommendation.facilityType || 'Hospital'} • Cost range: Rs ${Math.round(
                Number(recommendation.estimatedCostLow || 0)
              )}-${Math.round(Number(recommendation.estimatedCostHigh || 0))}`}
            </Text>
            {recommendation.pmjayApplicable && (
              <Text
                className="mt-1 text-[11px]"
                style={{ color: COLORS.teal, fontFamily: FONTS.sansBold }}
              >
                PMJAY may reduce your out-of-pocket cost.
              </Text>
            )}
          </View>
        )}

        {alerts.length > 0 && (
          <View className="mb-4" style={{ gap: 8 }}>
            {alerts.slice(0, 3).map((alertItem) => {
              const palette = severityPalette(alertItem.severity);
              return (
                <View
                  key={alertItem.id}
                  className="rounded-xl border px-3 py-3"
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.bg
                  }}
                >
                  <View className="flex-row items-center gap-2">
                    <MaterialCommunityIcons
                      name={palette.icon as any}
                      size={14}
                      color={palette.text}
                    />
                    <Text
                      className="text-[12px]"
                      style={{ color: palette.text, fontFamily: FONTS.sansBold }}
                    >
                      {alertItem.title}
                    </Text>
                  </View>
                  <Text
                    className="mt-1 text-[12px] leading-[18px]"
                    style={{ color: palette.text, fontFamily: FONTS.sans }}
                  >
                    {alertItem.message}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {nearbyFacilities.length > 0 && (
          <View
            className={`mb-4 ${UI_CLASSES.cardShell} p-4`}
            style={UI_SHADOWS.cool}
          >
            <Text
              className="mb-3 text-[12px] text-textSecondary dark:text-slate-200"
              style={{ fontFamily: FONTS.sansBold }}
            >
              Nearby care options
            </Text>
            <View style={{ gap: 8 }}>
              {nearbyFacilities.slice(0, 3).map((facility) => (
                <TouchableOpacity
                  key={facility.id}
                  className="rounded-xl border border-borderSoft bg-card dark:bg-slate-900/74 px-3 py-3"
                  onPress={() => {
                    void openMap(facility);
                  }}
                  activeOpacity={0.82}
                >
                  <Text
                    className="text-[12px] text-textPrimary dark:text-slate-100"
                    style={{ fontFamily: FONTS.sansBold }}
                  >
                    {facility.name}
                  </Text>
                  <Text
                    className="mt-1 text-[11px] text-textSecondary dark:text-slate-200"
                    style={{ fontFamily: FONTS.sans }}
                  >
                    {`${facility.facilityType} • ${
                      typeof facility.distanceKm === 'number'
                        ? `${facility.distanceKm.toFixed(1)} km`
                        : 'Distance unavailable'
                    }`}
                  </Text>
                  <Text
                    className="mt-1 text-[10px] text-textMuted dark:text-slate-300"
                    style={{ fontFamily: FONTS.sans }}
                    numberOfLines={2}
                  >
                    {facility.address}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
            {t(language, 'results_what_to_do_next')}
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

        <View
          className={`mb-4 ${UI_CLASSES.cardShell} p-4`}
          style={UI_SHADOWS.cool}
        >
          <Text
            className="mb-2 text-[12px] text-textSecondary dark:text-slate-200"
            style={{ fontFamily: FONTS.sansBold }}
          >
            Share with doctor
          </Text>
          <Text
            className="mb-3 text-[11px] leading-[17px] text-textMuted dark:text-slate-300"
            style={{ fontFamily: FONTS.sans }}
          >
            Create a secure read-only link valid for 72 hours.
          </Text>

          <GradientButton
            label={shareMeta?.revokedAt ? 'Create new share link' : 'Create doctor share link'}
            onPress={handleShareWithDoctor}
            loading={shareLoading}
            disabled={shareLoading || !assessmentId}
          />

          {shareMeta?.shareUrl && (
            <View className="mt-3 rounded-xl border border-borderSoft bg-card dark:bg-slate-900/74 px-3 py-3">
              <Text
                className="text-[11px] text-textSecondary dark:text-slate-200"
                style={{ fontFamily: FONTS.sansBold }}
              >
                {shareMeta.revokedAt ? 'Link status: Revoked' : 'Link status: Active'}
              </Text>
              <Text
                className="mt-1 text-[10px] text-textMuted dark:text-slate-300"
                style={{ fontFamily: FONTS.sans }}
              >
                {`Expires: ${new Date(shareMeta.expiresAt).toLocaleString('en-IN')}`}
              </Text>
              {!shareMeta.revokedAt && (
                <View className="mt-2 flex-row" style={{ gap: 8 }}>
                  <TouchableOpacity
                    className="rounded-full border border-borderSoft px-3 py-2"
                    onPress={() => {
                      void Linking.openURL(shareMeta.shareUrl as string);
                    }}
                  >
                    <Text
                      className="text-[11px] text-textSecondary dark:text-slate-200"
                      style={{ fontFamily: FONTS.sansBold }}
                    >
                      Open link
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="rounded-full border border-red-200 px-3 py-2"
                    disabled={revokeLoading}
                    onPress={() => {
                      void handleRevokeShareLink();
                    }}
                  >
                    <Text
                      className="text-[11px] text-red-600"
                      style={{ fontFamily: FONTS.sansBold }}
                    >
                      {revokeLoading ? 'Revoking...' : 'Revoke'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
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
            {t(language, 'results_disclaimer')}
          </Text>
        </View>

        <GradientButton
          label={t(language, 'results_check_another')}
          onPress={() => goToTab('Home')}
        />
        <GhostButton
          label={t(language, 'results_view_history')}
          onPress={() => goToTab('History')}
        />
      </Animated.View>
    </ScreenWrapper>
  );
}
