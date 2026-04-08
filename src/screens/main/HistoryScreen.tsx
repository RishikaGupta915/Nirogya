import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS, FONTS, RISK_COLORS, SPACING } from '../../constants/theme';
import { UI_CLASSES, UI_SHADOWS } from '../../constants/ui';
import {
  Assessment,
  getUserAssessments
} from '../../services/assessmentService';
import {
  listChatSessions,
  type ChatHistorySession
} from '../../services/chatHistoryService';
import { auth } from '../../services/authService';
import type { DiagnosisResult } from '../../services/aiService';
import { useApp } from '../../context/AppContext';
import { t } from '../../localization/i18n';

function timeAgo(ts: any, language: string): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return t(language, 'history_today');
  if (days === 1) return t(language, 'history_yesterday');
  if (days < 7) return t(language, 'history_days_ago', { count: days });
  if (days < 30) {
    return t(language, 'history_weeks_ago', { count: Math.floor(days / 7) });
  }
  return t(language, 'history_months_ago', { count: Math.floor(days / 30) });
}

function extractDiagnosisPayload(
  item: Assessment,
  language: string
): DiagnosisResult & { fairnessScore?: number } {
  const safeRiskLevel: DiagnosisResult['riskLevel'] =
    item.riskLevel === 'high' ||
    item.riskLevel === 'medium' ||
    item.riskLevel === 'low'
      ? item.riskLevel
      : 'low';
  const fallback: DiagnosisResult & { fairnessScore?: number } = {
    diagnosis: item.diagnosis || t(language, 'history_assessment_summary'),
    description: t(language, 'history_assessment_desc'),
    riskScore:
      typeof item.riskScore === 'number' && Number.isFinite(item.riskScore)
        ? item.riskScore
        : 50,
    riskLevel: safeRiskLevel,
    nextSteps:
      Array.isArray(item.nextSteps) && item.nextSteps.length > 0
        ? item.nextSteps
        : [t(language, 'history_track_fallback')],
    seeDoctor: safeRiskLevel === 'high',
    urgency:
      safeRiskLevel === 'high'
        ? t(language, 'history_urgency_asap')
        : t(language, 'history_urgency_days')
  };

  if (!item.rawAiText) return fallback;

  try {
    const parsed = JSON.parse(item.rawAiText);
    const base =
      parsed && typeof parsed === 'object' && parsed.diagnosis
        ? parsed.diagnosis
        : parsed;

    if (!base || typeof base !== 'object') {
      return fallback;
    }

    const riskLevel: DiagnosisResult['riskLevel'] =
      base.riskLevel === 'high' || base.riskLevel === 'low'
        ? base.riskLevel
        : base.riskLevel === 'medium'
          ? 'medium'
          : fallback.riskLevel;

    return {
      ...fallback,
      diagnosis:
        typeof base.diagnosis === 'string' && base.diagnosis.trim()
          ? base.diagnosis
          : fallback.diagnosis,
      description:
        typeof base.description === 'string' && base.description.trim()
          ? base.description
          : fallback.description,
      riskScore:
        typeof base.riskScore === 'number' && Number.isFinite(base.riskScore)
          ? base.riskScore
          : fallback.riskScore,
      riskLevel,
      nextSteps:
        Array.isArray(base.nextSteps) && base.nextSteps.length > 0
          ? base.nextSteps.filter(
              (step: unknown): step is string => typeof step === 'string'
            )
          : fallback.nextSteps,
      seeDoctor:
        typeof base.seeDoctor === 'boolean'
          ? base.seeDoctor
          : fallback.seeDoctor,
      urgency:
        typeof base.urgency === 'string' && base.urgency.trim()
          ? base.urgency
          : fallback.urgency,
      fairnessScore:
        typeof base.fairnessScore === 'number' ? base.fairnessScore : undefined
    };
  } catch {
    return fallback;
  }
}

function assessmentRowKey(item: Assessment, index: number): string {
  return item.id ?? `${item.createdAt ?? ''}-${item.symptom}-${index}`;
}

function extractAssessmentDiagnosisText(item: Assessment): string {
  const direct =
    typeof item.diagnosis === 'string' ? item.diagnosis.trim() : '';
  if (direct) return direct;

  try {
    const parsed = item.rawAiText ? JSON.parse(item.rawAiText) : null;
    const base =
      parsed && typeof parsed === 'object' && parsed.diagnosis
        ? parsed.diagnosis
        : parsed;

    if (
      base &&
      typeof base === 'object' &&
      typeof base.diagnosis === 'string' &&
      base.diagnosis.trim()
    ) {
      return base.diagnosis.trim();
    }
  } catch {
    // Ignore malformed historical payloads.
  }

  return '';
}

function isAssessmentCompleted(item: Assessment): boolean {
  const hasSymptom =
    typeof item.symptom === 'string' && item.symptom.trim().length > 0;
  const hasDiagnosis = extractAssessmentDiagnosisText(item).length > 0;
  const hasRiskLevel =
    item.riskLevel === 'low' ||
    item.riskLevel === 'medium' ||
    item.riskLevel === 'high';
  const hasRiskScore =
    typeof item.riskScore === 'number' && Number.isFinite(item.riskScore);

  return hasSymptom && hasDiagnosis && hasRiskLevel && hasRiskScore;
}

function extractTimelineInsights(item: Assessment, language: string) {
  const diagnosis = extractDiagnosisPayload(item, language);
  const contextPills: string[] = [
    `Risk: ${diagnosis.riskLevel.toUpperCase()}`,
    `Score: ${Math.round(diagnosis.riskScore)}%`,
    diagnosis.urgency ? `Urgency: ${diagnosis.urgency}` : ''
  ].filter(Boolean);

  let summary = diagnosis.description;
  const nextSteps =
    Array.isArray(diagnosis.nextSteps) && diagnosis.nextSteps.length > 0
      ? diagnosis.nextSteps
      : [t(language, 'history_track_fallback')];

  try {
    const parsed = item.rawAiText ? JSON.parse(item.rawAiText) : null;
    const pipeline = parsed?.pipeline;
    const assessment = pipeline?.assessment;
    const recommendation = pipeline?.recommendation;

    if (
      assessment &&
      typeof assessment.description === 'string' &&
      assessment.description.trim()
    ) {
      summary = assessment.description.trim();
    }

    if (assessment && typeof assessment.fairnessScore === 'number') {
      contextPills.push(
        `Fairness: ${Math.round(
          Math.max(0, Math.min(1, assessment.fairnessScore)) * 100
        )}%`
      );
    } else if (typeof diagnosis.fairnessScore === 'number') {
      contextPills.push(
        `Fairness: ${Math.round(
          Math.max(0, Math.min(1, diagnosis.fairnessScore)) * 100
        )}%`
      );
    }

    if (
      recommendation &&
      typeof recommendation.facilityType === 'string' &&
      recommendation.facilityType.trim()
    ) {
      contextPills.push(`Route: ${recommendation.facilityType.trim()}`);
    }

    const low = Number(recommendation?.estimatedCostLow);
    const high = Number(recommendation?.estimatedCostHigh);
    if (Number.isFinite(low) && Number.isFinite(high) && low >= 0 && high >= 0) {
      contextPills.push(
        `Estimated cost: Rs ${Math.round(low)}-${Math.round(high)}`
      );
    }
  } catch {
    if (typeof diagnosis.fairnessScore === 'number') {
      contextPills.push(
        `Fairness: ${Math.round(
          Math.max(0, Math.min(1, diagnosis.fairnessScore)) * 100
        )}%`
      );
    }
  }

  return {
    diagnosis,
    summary,
    contextPills: Array.from(new Set(contextPills.filter(Boolean))),
    nextSteps
  };
}

function extractResultRoutePayload(item: Assessment, language: string) {
  const diagnosis = extractDiagnosisPayload(item, language);

  let recommendation: Record<string, any> | null = null;
  let nearbyFacilities: Record<string, any>[] = [];
  let alerts: Record<string, any>[] = [];
  let riskFlags: Record<string, any>[] = [];
  let contextMap: Record<string, any> | null = null;

  try {
    const parsed = item.rawAiText ? JSON.parse(item.rawAiText) : null;
    const pipeline = parsed?.pipeline;

    recommendation =
      pipeline && typeof pipeline.recommendation === 'object'
        ? pipeline.recommendation
        : parsed?.recommendation && typeof parsed.recommendation === 'object'
          ? parsed.recommendation
          : null;

    nearbyFacilities = Array.isArray(pipeline?.nearbyFacilities)
      ? pipeline.nearbyFacilities
      : Array.isArray(parsed?.nearbyFacilities)
        ? parsed.nearbyFacilities
        : [];

    alerts = Array.isArray(pipeline?.alerts)
      ? pipeline.alerts
      : Array.isArray(parsed?.alerts)
        ? parsed.alerts
        : [];

    riskFlags = Array.isArray(pipeline?.riskFlags)
      ? pipeline.riskFlags
      : Array.isArray(parsed?.riskFlags)
        ? parsed.riskFlags
        : [];

    contextMap =
      pipeline && typeof pipeline.contextMap === 'object'
        ? pipeline.contextMap
        : parsed?.contextMap && typeof parsed.contextMap === 'object'
          ? parsed.contextMap
          : null;
  } catch {
    // Preserve diagnosis fallback for older records without pipeline metadata.
  }

  return {
    assessmentId: item.id ?? null,
    diagnosis,
    symptom: item.symptom,
    recommendation,
    nearbyFacilities,
    alerts,
    riskFlags,
    contextMap
  };
}

type RiskLevel = Assessment['riskLevel'];

type ChatTimelineInsights = {
  diagnosis: string;
  summary: string;
  contextPills: string[];
  nextSteps: string[];
  riskLevel: RiskLevel;
  riskScore: number;
};

type TimelineEntry =
  | {
      kind: 'assessment';
      key: string;
      createdAt: Assessment['createdAt'];
      sortEpoch: number;
      symptom: string;
      diagnosisLine: string;
      riskLevel: RiskLevel;
      riskScore: number;
      details: ReturnType<typeof extractTimelineInsights>;
      resultPayload: ReturnType<typeof extractResultRoutePayload>;
    }
  | {
      kind: 'chat';
      key: string;
      createdAt: string;
      sortEpoch: number;
      symptom: string;
      diagnosisLine: string;
      riskLevel: RiskLevel;
      riskScore: number;
      details: ChatTimelineInsights;
      sessionId: string;
    };

const CHAT_DEFAULT_RISK_SCORE: Record<RiskLevel, number> = {
  low: 28,
  medium: 56,
  high: 82
};

function toEpoch(ts: unknown): number {
  if (!ts) return 0;

  if (typeof ts === 'string' || ts instanceof Date) {
    const value = new Date(ts).getTime();
    return Number.isFinite(value) ? value : 0;
  }

  if (
    typeof ts === 'object' &&
    ts &&
    typeof (ts as { toDate?: () => Date }).toDate === 'function'
  ) {
    const value = (ts as { toDate: () => Date }).toDate().getTime();
    return Number.isFinite(value) ? value : 0;
  }

  return 0;
}

function pickLatestAssistantText(session: ChatHistorySession): string {
  for (let i = session.messages.length - 1; i >= 0; i -= 1) {
    const message = session.messages[i];
    if (message.sender === 'nira' && message.text.trim()) {
      return message.text.trim();
    }
  }

  return typeof session.lastMessage === 'string' ? session.lastMessage.trim() : '';
}

function pickCompletedDiagnosisMessage(session: ChatHistorySession): string | null {
  for (let i = session.messages.length - 1; i >= 0; i -= 1) {
    const message = session.messages[i];
    if (message.sender !== 'nira') continue;

    const text = message.text.trim();
    if (!text) continue;

    const hasFinalSignal =
      /Likely\s+condition\s*:/i.test(text) ||
      /Risk\s*level\s*:/i.test(text) ||
      /What\s+to\s+do\s+next\s*:/i.test(text);

    if (hasFinalSignal) {
      return text;
    }
  }

  return null;
}

function extractLikelyCondition(text: string): string | null {
  const match = text.match(/Likely\s+condition\s*:\s*([^\n]+)/i);
  if (!match?.[1]) return null;

  const value = match[1].trim();
  return value || null;
}

function extractChatRiskLevel(text: string): RiskLevel {
  const match = text.match(/Risk\s*level\s*:\s*(high|medium|low)/i);
  if (!match?.[1]) return 'medium';

  const normalized = match[1].toLowerCase();
  if (normalized === 'high' || normalized === 'low') return normalized;
  return 'medium';
}

function extractChatRiskScore(text: string, riskLevel: RiskLevel): number {
  const explicit =
    text.match(/Risk\s*level\s*:\s*(?:high|medium|low)\s*\((\d{1,3})%\)/i) ||
    text.match(/(\d{1,3})\s*%\s*(?:confidence|risk)/i);

  if (explicit?.[1]) {
    const parsed = Number(explicit[1]);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(100, parsed));
    }
  }

  return CHAT_DEFAULT_RISK_SCORE[riskLevel];
}

function extractChatSummary(text: string): string {
  if (!text.trim()) {
    return 'Nira chat identified this symptom from your conversation.';
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^Likely\s+condition\s*:/i.test(line))
    .filter((line) => !/^Risk\s*level\s*:/i.test(line))
    .filter((line) => !/^Urgency\s*:/i.test(line))
    .filter((line) => !/^What\s+to\s+do\s+next\s*:/i.test(line))
    .filter((line) => !/^\d+[\).\s-]+/.test(line));

  const merged = lines.join(' ');
  if (!merged) {
    return 'Nira chat identified this symptom from your conversation.';
  }

  return merged.length > 220 ? `${merged.slice(0, 217)}...` : merged;
}

function extractChatNextSteps(text: string, language: string): string[] {
  const marker = text.match(/What\s+to\s+do\s+next\s*:/i);
  if (!marker || marker.index === undefined) {
    return [t(language, 'history_track_fallback')];
  }

  const tail = text.slice(marker.index + marker[0].length);
  const steps = tail
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d+[\).\s-]+/.test(line) || /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^\s*(?:\d+[\).\s-]+|[-*]\s+)/, '').trim())
    .filter(Boolean)
    .slice(0, 3);

  if (steps.length > 0) return steps;
  return [t(language, 'history_track_fallback')];
}

function extractChatSymptom(session: ChatHistorySession, assistantText: string): string {
  const likely = extractLikelyCondition(assistantText);
  if (likely) return likely;

  const detected = session.detectedTitle?.trim();
  if (detected && detected.toLowerCase() !== 'nira conversation') {
    return detected;
  }

  const title = session.title?.trim();
  if (title && title.toLowerCase() !== 'nira conversation') {
    return title;
  }

  return 'AI chat symptom';
}

function extractChatTimelineInsights(
  session: ChatHistorySession,
  language: string,
  diagnosisText?: string
): ChatTimelineInsights {
  const assistantText =
    typeof diagnosisText === 'string' && diagnosisText.trim()
      ? diagnosisText.trim()
      : pickLatestAssistantText(session);
  const riskLevel = extractChatRiskLevel(assistantText);
  const riskScore = extractChatRiskScore(assistantText, riskLevel);
  const diagnosis =
    extractLikelyCondition(assistantText) ||
    session.detectedTitle ||
    session.title ||
    'AI chat finding';

  return {
    diagnosis,
    summary: extractChatSummary(assistantText),
    contextPills: [
      'Source: Nira Chat',
      `Risk: ${riskLevel.toUpperCase()}`,
      `Score: ${Math.round(riskScore)}%`,
      `Messages: ${session.messages.length}`
    ],
    nextSteps: extractChatNextSteps(assistantText, language),
    riskLevel,
    riskScore
  };
}

export default function HistoryScreen() {
  const nav = useNavigation<any>();
  const { userProfile } = useApp();
  const language = userProfile.language ?? 'en';
  const uid = auth.currentUser?.uid;
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatHistorySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [assessmentList, sessionList] = await Promise.all([
        uid ? getUserAssessments(uid) : Promise.resolve([]),
        listChatSessions(40)
      ]);

      setAssessments(assessmentList);
      setChatSessions(sessionList);
    } catch (err) {
      console.warn('[History] Failed to load history surfaces', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    const completedAssessments = assessments.filter((assessment) =>
      isAssessmentCompleted(assessment)
    );

    const assessmentEntries: TimelineEntry[] = completedAssessments.map(
      (assessment, index) => {
        const diagnosis = extractDiagnosisPayload(assessment, language);
        const riskScore =
          typeof diagnosis.riskScore === 'number' &&
          Number.isFinite(diagnosis.riskScore)
            ? diagnosis.riskScore
            : typeof assessment.riskScore === 'number' &&
                Number.isFinite(assessment.riskScore)
              ? assessment.riskScore
              : 0;

        return {
          kind: 'assessment',
          key: `assessment-${assessmentRowKey(assessment, index)}`,
          createdAt: assessment.createdAt,
          sortEpoch: toEpoch(assessment.createdAt),
          symptom: assessment.symptom,
          diagnosisLine: assessment.diagnosis || diagnosis.diagnosis,
          riskLevel: diagnosis.riskLevel,
          riskScore,
          details: extractTimelineInsights(assessment, language),
          resultPayload: extractResultRoutePayload(assessment, language)
        };
      }
    );

    const chatEntries: TimelineEntry[] = chatSessions.flatMap((session) => {
      const diagnosisText = pickCompletedDiagnosisMessage(session);
      if (!diagnosisText) return [];

      const details = extractChatTimelineInsights(session, language, diagnosisText);
      const createdAt = session.updatedAt || session.createdAt;

      return [
        {
          kind: 'chat',
          key: `chat-${session.id}`,
          createdAt,
          sortEpoch: toEpoch(createdAt),
          symptom: extractChatSymptom(session, diagnosisText),
          diagnosisLine: details.diagnosis,
          riskLevel: details.riskLevel,
          riskScore: details.riskScore,
          details,
          sessionId: session.id
        }
      ];
    });

    return [...assessmentEntries, ...chatEntries].sort(
      (a, b) => b.sortEpoch - a.sortEpoch
    );
  }, [assessments, chatSessions, language]);

  const total = timelineEntries.length;
  const needsAttn = timelineEntries.filter(
    (entry) => entry.riskLevel === 'high'
  ).length;

  const toggleExpanded = (key: string) => {
    setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderItem = ({
    item,
    index
  }: {
    item: TimelineEntry;
    index: number;
  }) => {
    const rowKey = item.key;
    const details = item.details;
    const expanded = Boolean(expandedRows[rowKey]);
    const isLast = index === timelineEntries.length - 1;
    const riskColor = RISK_COLORS[item.riskLevel] ?? COLORS.textMuted;
    const safeScore =
      typeof item.riskScore === 'number' && Number.isFinite(item.riskScore)
        ? Math.round(item.riskScore)
        : 0;
    const actionLabel =
      item.kind === 'assessment' ? 'View full assessment' : 'Open chat transcript';

    const handleActionPress = () => {
      if (item.kind === 'assessment') {
        nav.navigate('Results', item.resultPayload);
        return;
      }

      nav.navigate('NiraChat', { sessionId: item.sessionId });
    };

    return (
      <View className="flex-row" style={{ gap: SPACING.sm }}>
        <View className="items-center" style={{ width: 22 }}>
          {!isLast && (
            <View
              style={{
                position: 'absolute',
                top: 18,
                bottom: -SPACING.sm,
                width: 2,
                borderRadius: 999,
                backgroundColor: 'rgba(95,115,152,0.24)'
              }}
            />
          )}
          <View
            className="mt-[6px] h-[12px] w-[12px] rounded-full"
            style={{ backgroundColor: riskColor }}
          />
        </View>

        <TouchableOpacity
          className={`${UI_CLASSES.cardShell} flex-1 px-3 py-3`}
          style={UI_SHADOWS.soft}
          onPress={() => toggleExpanded(rowKey)}
          activeOpacity={0.86}
        >
          <View className="flex-row items-start justify-between">
            <View className="pr-2" style={{ flex: 1 }}>
              <Text
                className="mb-[2px] text-[13px] text-textPrimary dark:text-slate-100"
                style={{ fontFamily: FONTS.sansBold }}
              >
                {item.symptom}
              </Text>
              <Text
                className="text-[10px] text-textMuted dark:text-slate-300"
                style={{ fontFamily: FONTS.sans }}
              >
                {timeAgo(item.createdAt, language)}
              </Text>
            </View>

            <View className="items-end" style={{ gap: 4 }}>
              <Text
                className="text-[11px]"
                style={{ color: riskColor, fontFamily: FONTS.sansBold }}
              >
                {safeScore}%
              </Text>
              <MaterialCommunityIcons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={COLORS.textMuted}
              />
            </View>
          </View>

          <Text
            className="mt-1 text-[11px] text-textMuted dark:text-slate-300"
            style={{ fontFamily: FONTS.sans }}
            numberOfLines={expanded ? undefined : 1}
          >
            {item.diagnosisLine}
          </Text>

          {expanded && (
            <View className="mt-3 border-t border-borderSoft pt-3">
              <Text
                className="text-[10px] uppercase tracking-[0.9px] text-textHint dark:text-slate-400"
                style={{ fontFamily: FONTS.sansBold }}
              >
                Summary
              </Text>
              <Text
                className="mt-1 text-[12px] leading-[18px] text-textSecondary dark:text-slate-200"
                style={{ fontFamily: FONTS.sans }}
              >
                {details.summary}
              </Text>

              <Text
                className="mt-3 text-[10px] uppercase tracking-[0.9px] text-textHint dark:text-slate-400"
                style={{ fontFamily: FONTS.sansBold }}
              >
                Context
              </Text>
              <View className="mb-1 mt-2 flex-row flex-wrap">
                {details.contextPills.map((pill) => (
                  <View
                    key={`${rowKey}-${pill}`}
                    className="mb-2 mr-2 rounded-full px-3 py-[6px]"
                    style={{ backgroundColor: COLORS.bgOverlay }}
                  >
                    <Text
                      className="text-[10px] text-textSecondary dark:text-slate-200"
                      style={{ fontFamily: FONTS.sans }}
                    >
                      {pill}
                    </Text>
                  </View>
                ))}
              </View>

              <Text
                className="mt-1 text-[10px] uppercase tracking-[0.9px] text-textHint dark:text-slate-400"
                style={{ fontFamily: FONTS.sansBold }}
              >
                Next steps
              </Text>
              <View className="mt-2" style={{ gap: 6 }}>
                {details.nextSteps.slice(0, 3).map((step, stepIndex) => (
                  <Text
                    key={`${rowKey}-step-${stepIndex}`}
                    className="text-[11px] leading-[17px] text-textSecondary dark:text-slate-200"
                    style={{ fontFamily: FONTS.sans }}
                  >
                    {`${stepIndex + 1}. ${step}`}
                  </Text>
                ))}
              </View>

              <TouchableOpacity
                className="mt-3 self-start rounded-full border border-borderSoft px-3 py-[7px]"
                onPress={handleActionPress}
              >
                <Text
                  className="text-[11px] text-textSecondary dark:text-slate-200"
                  style={{ fontFamily: FONTS.sansBold }}
                >
                  {actionLabel}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <View className="px-4 pb-3 pt-4">
        <View>
          <Text
            className="text-[29px] text-textPrimary dark:text-slate-100"
            style={{
              fontFamily: FONTS.serif,
              fontWeight: '600',
              letterSpacing: -0.4
            }}
          >
            {t(language, 'history_title')}
          </Text>
          <Text
            className="mt-[2px] text-[12px] text-textMuted dark:text-slate-300"
            style={{ fontFamily: FONTS.sans }}
          >
            {t(language, 'history_subtitle')}
          </Text>
        </View>
      </View>

      <View className="mb-4 flex-row gap-2 px-4">
        <View
          className="flex-1 rounded-xl2 bg-card dark:bg-slate-900/72 p-[11px]"
          style={UI_SHADOWS.soft}
        >
          <Text
            className="mb-[2px] text-[22px]"
            style={{
              color: COLORS.pink,
              fontFamily: FONTS.serif,
              fontWeight: '600'
            }}
          >
            {total}
          </Text>
          <Text
            className="text-[10px] text-textMuted dark:text-slate-300"
            style={{ fontFamily: FONTS.sans }}
          >
            {t(language, 'history_checks_done')}
          </Text>
        </View>
        <View
          className="flex-1 rounded-xl2 bg-card dark:bg-slate-900/72 p-[11px]"
          style={UI_SHADOWS.soft}
        >
          <Text
            className="mb-[2px] text-[22px]"
            style={{
              color: COLORS.teal,
              fontFamily: FONTS.serif,
              fontWeight: '600'
            }}
          >
            {total - needsAttn}
          </Text>
          <Text
            className="text-[10px] text-textMuted dark:text-slate-300"
            style={{ fontFamily: FONTS.sans }}
          >
            {t(language, 'history_manageable')}
          </Text>
        </View>
        <View
          className="flex-1 rounded-xl2 bg-card dark:bg-slate-900/72 p-[11px]"
          style={UI_SHADOWS.soft}
        >
          <Text
            className="mb-[2px] text-[22px]"
            style={{
              color: COLORS.red,
              fontFamily: FONTS.serif,
              fontWeight: '600'
            }}
          >
            {needsAttn}
          </Text>
          <Text
            className="text-[10px] text-textMuted dark:text-slate-300"
            style={{ fontFamily: FONTS.sans }}
          >
            {t(language, 'history_needs_care')}
          </Text>
        </View>
      </View>

      <View
        className="mx-4 mb-3 flex-row items-center gap-2 rounded-xl2 bg-white/78 dark:bg-slate-900/66 px-3 py-2"
        style={UI_SHADOWS.soft}
      >
        <MaterialCommunityIcons
          name={needsAttn > 0 ? 'alert-circle-outline' : 'check-circle-outline'}
          size={16}
          color={needsAttn > 0 ? COLORS.red : COLORS.teal}
        />
        <Text
          className="flex-1 text-[11px] text-textSecondary dark:text-slate-200"
          style={{ fontFamily: FONTS.sans }}
        >
          {needsAttn > 0
            ? t(language, 'history_attention_msg', { count: needsAttn })
            : t(language, 'history_consistency_msg')}
        </Text>
      </View>

      {timelineEntries.length > 0 && (
        <View className="px-4 pb-2">
          <Text
            className="text-[10px] uppercase tracking-[1px] text-textHint dark:text-slate-400"
            style={{ fontFamily: FONTS.sansBold }}
          >
            Timeline
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator
          color={COLORS.pink}
          style={{ marginTop: SPACING.xl }}
        />
      ) : timelineEntries.length === 0 ? (
        <View className="items-center gap-3 pt-8">
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={36}
            color={COLORS.textMuted}
          />
          <Text
            className="text-[18px] text-textSecondary dark:text-slate-200"
            style={{ fontFamily: FONTS.serif }}
          >
            {t(language, 'history_empty_title')}
          </Text>
          <Text
            className="text-center text-[12px] text-textMuted dark:text-slate-300"
            style={{ fontFamily: FONTS.sans }}
          >
            {t(language, 'history_empty_sub')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={timelineEntries}
          keyExtractor={(entry) => entry.key}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: SPACING.lg,
            paddingBottom: SPACING.xl
          }}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}
