import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS, FONTS, RISK_COLORS, SPACING } from '../../constants/theme';
import { UI_CLASSES, UI_SHADOWS } from '../../constants/ui';
import { Assessment } from '../../services/assessmentService';
import { auth } from '../../services/authService';
import { useUserAssessments } from '../../hooks/useUserAssessments';

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

export default function HistoryScreen() {
  const nav = useNavigation<any>();
  const uid = auth.currentUser?.uid;
  const { assessments, loading, reload } = useUserAssessments(uid);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const total = assessments.length;
  const needsAttn = assessments.filter((a) => a.riskLevel === 'high').length;

  const renderItem = ({ item }: { item: Assessment }) => (
    <TouchableOpacity
      className={`flex-row items-center gap-3 ${UI_CLASSES.cardShell} px-3 py-3`}
      style={UI_SHADOWS.soft}
      onPress={() =>
        nav.navigate('Results', {
          diagnosis: JSON.parse(item.rawAiText ?? '{}'),
          symptom: item.symptom
        })
      }
      activeOpacity={0.8}
    >
      <View className="h-[10px] w-[10px] shrink-0 rounded-full" style={{ backgroundColor: RISK_COLORS[item.riskLevel] }} />
      <View style={{ flex: 1 }}>
        <Text className="mb-[2px] text-[13px] text-textPrimary" style={{ fontFamily: FONTS.sansBold }}>
          {item.symptom}
        </Text>
        <Text className="text-[11px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
          {item.diagnosis}
        </Text>
      </View>
      <View className="items-end" style={{ gap: 4 }}>
        <Text className="text-[10px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
          {timeAgo(item.createdAt)}
        </Text>
        <Text className="text-[11px]" style={{ color: RISK_COLORS[item.riskLevel], fontFamily: FONTS.sansBold }}>
          {item.riskScore}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <View className="px-4 pb-3 pt-4">
        <View>
          <Text className="text-[26px] text-textPrimary" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
            History
          </Text>
          <Text className="mt-[2px] text-[12px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
            Your past assessments
          </Text>
        </View>
      </View>

      <View className="mb-4 flex-row gap-2 px-4">
        <View className="flex-1 rounded-xl border bg-card p-3" style={{ borderColor: COLORS.pinkBorder, ...UI_SHADOWS.soft }}>
          <Text className="mb-[2px] text-[22px]" style={{ color: COLORS.pink, fontFamily: FONTS.serif, fontWeight: '600' }}>
            {total}
          </Text>
          <Text className="text-[10px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
            checks done
          </Text>
        </View>
        <View className="flex-1 rounded-xl border bg-card p-3" style={{ borderColor: 'rgba(52,211,153,0.25)', ...UI_SHADOWS.soft }}>
          <Text className="mb-[2px] text-[22px]" style={{ color: COLORS.teal, fontFamily: FONTS.serif, fontWeight: '600' }}>
            {total - needsAttn}
          </Text>
          <Text className="text-[10px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
            manageable
          </Text>
        </View>
        <View className="flex-1 rounded-xl border bg-card p-3" style={{ borderColor: 'rgba(251,113,133,0.25)', ...UI_SHADOWS.soft }}>
          <Text className="mb-[2px] text-[22px]" style={{ color: COLORS.red, fontFamily: FONTS.serif, fontWeight: '600' }}>
            {needsAttn}
          </Text>
          <Text className="text-[10px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
            needs care
          </Text>
        </View>
      </View>

      <View className="mx-4 mb-3 flex-row items-center gap-2 rounded-xl border border-borderSoft bg-white/70 px-3 py-2">
        <MaterialCommunityIcons
          name={needsAttn > 0 ? 'alert-circle-outline' : 'check-circle-outline'}
          size={16}
          color={needsAttn > 0 ? COLORS.red : COLORS.teal}
        />
        <Text className="flex-1 text-[11px] text-textSecondary" style={{ fontFamily: FONTS.sans }}>
          {needsAttn > 0
            ? `${needsAttn} recent checks may need attention.`
            : 'Great consistency. Your recent checks look manageable.'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.pink} style={{ marginTop: SPACING.xl }} />
      ) : assessments.length === 0 ? (
        <View className="items-center gap-3 pt-8">
          <MaterialCommunityIcons name="clipboard-text-outline" size={36} color={COLORS.textMuted} />
          <Text className="text-[18px] text-textSecondary" style={{ fontFamily: FONTS.serif }}>
            No assessments yet
          </Text>
          <Text className="text-center text-[12px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
            Start a symptom check from the home screen
          </Text>
        </View>
      ) : (
        <FlatList
          data={assessments}
          keyExtractor={(i) => i.id ?? Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl }}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}