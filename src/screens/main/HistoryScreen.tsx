import { useCallback, useState } from 'react';
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
import { auth } from '../../services/authService';
import type { DiagnosisResult } from '../../services/aiService';

function timeAgo(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function extractDiagnosisPayload(item: Assessment): DiagnosisResult & { fairnessScore?: number } {
  const fallback: DiagnosisResult & { fairnessScore?: number } = {
    diagnosis: item.diagnosis || 'Assessment summary',
    description: 'Your saved symptom assessment summary.',
    riskScore:
      typeof item.riskScore === 'number' && Number.isFinite(item.riskScore)
        ? item.riskScore
        : 50,
    riskLevel: item.riskLevel,
    nextSteps:
      Array.isArray(item.nextSteps) && item.nextSteps.length > 0
        ? item.nextSteps
        : ['Track symptoms and consult a doctor if they worsen.'],
    seeDoctor: item.riskLevel === 'high',
    urgency: item.riskLevel === 'high' ? 'As soon as possible' : 'Within a few days'
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
          ? base.nextSteps.filter((step: unknown): step is string => typeof step === 'string')
          : fallback.nextSteps,
      seeDoctor:
        typeof base.seeDoctor === 'boolean' ? base.seeDoctor : fallback.seeDoctor,
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

export default function HistoryScreen() {
  const nav = useNavigation<any>();
  const uid = auth.currentUser?.uid;
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!uid) {
      setAssessments([]);
      return;
    }

    setLoading(true);
    try {
      const list = await getUserAssessments(uid);
      setAssessments(list);
    } catch (err) {
      console.warn('[History] Failed to load assessments', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const total = assessments.length;
  const needsAttn = assessments.filter((a: Assessment) => a.riskLevel === 'high').length;

  const renderItem = ({ item }: { item: Assessment }) => (
    <TouchableOpacity
      className={`flex-row items-center gap-3 ${UI_CLASSES.cardShell} px-3 py-3`}
      style={UI_SHADOWS.soft}
      onPress={() =>
        nav.navigate('Results', {
          diagnosis: extractDiagnosisPayload(item),
          symptom: item.symptom
        })
      }
      activeOpacity={0.8}
    >
      <View
        className="h-[10px] w-[10px] shrink-0 rounded-full"
        style={{ backgroundColor: RISK_COLORS[item.riskLevel] }}
      />
      <View style={{ flex: 1 }}>
        <Text
          className="mb-[2px] text-[13px] text-textPrimary dark:text-slate-100"
          style={{ fontFamily: FONTS.sansBold }}
        >
          {item.symptom}
        </Text>
        <Text
          className="text-[11px] text-textMuted dark:text-slate-300"
          style={{ fontFamily: FONTS.sans }}
        >
          {item.diagnosis}
        </Text>
      </View>
      <View className="items-end" style={{ gap: 4 }}>
        <Text
          className="text-[10px] text-textMuted dark:text-slate-300"
          style={{ fontFamily: FONTS.sans }}
        >
          {timeAgo(item.createdAt)}
        </Text>
        <Text
          className="text-[11px]"
          style={{
            color: RISK_COLORS[item.riskLevel],
            fontFamily: FONTS.sansBold
          }}
        >
          {item.riskScore}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <View className="px-4 pb-3 pt-4">
        <View>
          <Text
            className="text-[29px] text-textPrimary dark:text-slate-100"
            style={{ fontFamily: FONTS.serif, fontWeight: '600', letterSpacing: -0.4 }}
          >
            History
          </Text>
          <Text
            className="mt-[2px] text-[12px] text-textMuted dark:text-slate-300"
            style={{ fontFamily: FONTS.sans }}
          >
            Your past assessments
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
            checks done
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
            manageable
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
            needs care
          </Text>
        </View>
      </View>

      <View className="mx-4 mb-3 flex-row items-center gap-2 rounded-xl2 bg-white/78 dark:bg-slate-900/66 px-3 py-2" style={UI_SHADOWS.soft}>
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
            ? `${needsAttn} recent checks may need attention.`
            : 'Great consistency. Your recent checks look manageable.'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          color={COLORS.pink}
          style={{ marginTop: SPACING.xl }}
        />
      ) : assessments.length === 0 ? (
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
            No assessments yet
          </Text>
          <Text
            className="text-center text-[12px] text-textMuted dark:text-slate-300"
            style={{ fontFamily: FONTS.sans }}
          >
            Start a symptom check from the home screen
          </Text>
        </View>
      ) : (
        <FlatList
          data={assessments}
          keyExtractor={(i, index) => i.id ?? `${i.createdAt ?? ''}-${i.symptom}-${index}`}
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



