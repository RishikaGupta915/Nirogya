// src/screens/main/HistoryScreen.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import {
  getUserAssessments,
  Assessment
} from '../../services/assessmentService';
import { auth } from '../../services/authService';

const RISK_COLORS: Record<string, string> = {
  low: COLORS.riskLow,
  medium: COLORS.riskMed,
  high: COLORS.riskHigh
};

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
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoading(true);
    try {
      const data = await getUserAssessments(uid);
      setAssessments(data);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  // Summary stats
  const total = assessments.length;
  const needsAttn = assessments.filter((a) => a.riskLevel === 'high').length;

  const renderItem = ({ item }: { item: Assessment }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() =>
        nav.navigate('Results', {
          diagnosis: JSON.parse(item.rawAiText ?? '{}'),
          symptom: item.symptom
        })
      }
      activeOpacity={0.8}
    >
      <View
        style={[styles.dot, { backgroundColor: RISK_COLORS[item.riskLevel] }]}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowSym}>{item.symptom}</Text>
        <Text style={styles.rowDiag}>{item.diagnosis}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={styles.rowDate}>{timeAgo(item.createdAt)}</Text>
        <Text style={[styles.rowRisk, { color: RISK_COLORS[item.riskLevel] }]}>
          {item.riskScore}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>History</Text>
          <Text style={styles.sub}>Your past assessments</Text>
        </View>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.sumCard, { borderColor: COLORS.pinkBorder }]}>
          <Text style={[styles.sumNum, { color: COLORS.pink }]}>{total}</Text>
          <Text style={[styles.sumLbl, { color: 'rgba(249,168,201,0.6)' }]}>
            checks done
          </Text>
        </View>
        <View
          style={[styles.sumCard, { borderColor: 'rgba(52,211,153,0.25)' }]}
        >
          <Text style={[styles.sumNum, { color: COLORS.teal }]}>
            {total - needsAttn}
          </Text>
          <Text style={[styles.sumLbl, { color: 'rgba(110,231,183,0.6)' }]}>
            manageable
          </Text>
        </View>
        <View
          style={[styles.sumCard, { borderColor: 'rgba(251,113,133,0.25)' }]}
        >
          <Text style={[styles.sumNum, { color: COLORS.red }]}>
            {needsAttn}
          </Text>
          <Text style={[styles.sumLbl, { color: 'rgba(252,165,165,0.6)' }]}>
            needs care
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          color={COLORS.pink}
          style={{ marginTop: SPACING.xl }}
        />
      ) : assessments.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={36}
            color={COLORS.textMuted}
          />
          <Text style={styles.emptyText}>No assessments yet</Text>
          <Text style={styles.emptySub}>
            Start a symptom check from the home screen
          </Text>
        </View>
      ) : (
        <FlatList
          data={assessments}
          keyExtractor={(i) => i.id ?? Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md
  },
  heading: {
    fontFamily: FONTS.serif,
    fontSize: 26,
    color: COLORS.pink,
    fontWeight: '600'
  },
  sub: {
    fontSize: 12,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    marginTop: 2
  },

  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg
  },
  sumCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 0.5,
    borderRadius: RADIUS.md,
    padding: SPACING.md
  },
  sumNum: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 2
  },
  sumLbl: { fontSize: 10, fontFamily: FONTS.sans },

  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md
  },
  sep: { height: 0.5, backgroundColor: COLORS.border },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  rowSym: {
    fontSize: 13,
    fontFamily: FONTS.sansBold,
    color: COLORS.textPrimary,
    marginBottom: 2
  },
  rowDiag: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted },
  rowDate: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted },
  rowRisk: { fontSize: 11, fontFamily: FONTS.sansBold },

  empty: { alignItems: 'center', paddingTop: SPACING.xxl, gap: SPACING.md },
  emptyText: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    color: COLORS.textSecondary
  },
  emptySub: {
    fontSize: 12,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    textAlign: 'center'
  }
});
