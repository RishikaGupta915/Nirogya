// src/screens/assessment/ResultsScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { RiskBadge, GradientButton, GhostButton } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
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

  const diagnosis: DiagnosisResult = route.params?.diagnosis;
  const symptom: string = route.params?.symptom ?? '';

  if (!diagnosis) {
    return (
      <ScreenWrapper>
        <Text style={{ color: COLORS.textPrimary }}>No results found.</Text>
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
      {/* Header */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => nav.navigate('Home')}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={18}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
        <Text style={styles.heading}>Your results</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Diagnosis hero */}
      <View style={styles.heroCard}>
        <RiskBadge level={diagnosis.riskLevel} />
        <Text style={styles.diagName}>{diagnosis.diagnosis}</Text>
        <Text style={styles.diagDesc}>{diagnosis.description}</Text>
      </View>

      {/* Risk score bar */}
      <View style={styles.riskSection}>
        <View style={styles.riskLabelRow}>
          <Text style={styles.riskLabel}>Likelihood score</Text>
          <Text style={styles.riskVal}>{diagnosis.riskScore}%</Text>
        </View>
        <View style={styles.riskTrack}>
          <View
            style={[
              styles.riskFill,
              { width: fillWidth as any, backgroundColor: riskColor }
            ]}
          />
        </View>
      </View>

      {/* See doctor urgency */}
      {diagnosis.seeDoctor && (
        <View style={styles.urgencyCard}>
          <MaterialCommunityIcons
            name="hospital-box-outline"
            size={16}
            color={COLORS.amber}
          />
          <Text style={styles.urgencyText}>
            See a doctor:{' '}
            <Text style={{ fontFamily: FONTS.sansBold }}>
              {diagnosis.urgency}
            </Text>
          </Text>
        </View>
      )}

      {/* Next steps */}
      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>What to do next</Text>
        {diagnosis.nextSteps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View
              style={[
                styles.stepNum,
                { backgroundColor: STEP_BGS[i % STEP_BGS.length] }
              ]}
            >
              <Text
                style={[
                  styles.stepNumText,
                  { color: STEP_COLORS[i % STEP_COLORS.length] }
                ]}
              >
                {i + 1}
              </Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <MaterialCommunityIcons
          name="information-outline"
          size={12}
          color={COLORS.textHint}
        />
        <Text style={styles.disclaimerText}>
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
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.sm
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  heading: { fontFamily: FONTS.serif, fontSize: 18, color: COLORS.textPrimary },

  heroCard: {
    backgroundColor: 'rgba(30,10,46,0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(192,132,252,0.25)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg
  },
  diagName: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.pink,
    marginBottom: SPACING.sm
  },
  diagDesc: {
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.textSecondary,
    lineHeight: 20
  },

  riskSection: { marginBottom: SPACING.lg },
  riskLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm
  },
  riskLabel: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textMuted },
  riskVal: {
    fontSize: 13,
    fontFamily: FONTS.sansBold,
    color: COLORS.textPrimary
  },
  riskTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden'
  },
  riskFill: { height: '100%', borderRadius: 3 },

  urgencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.amberBg,
    borderWidth: 0.5,
    borderColor: COLORS.amberBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg
  },
  urgencyText: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.amber },

  stepsCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg
  },
  stepsTitle: {
    fontSize: 12,
    fontFamily: FONTS.sansBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.md
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1
  },
  stepNumText: { fontSize: 10, fontWeight: '700' },
  stepText: {
    fontSize: 12,
    fontFamily: FONTS.sans,
    color: COLORS.textSecondary,
    lineHeight: 18,
    flex: 1
  },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    marginBottom: SPACING.lg
  },
  disclaimerText: {
    fontSize: 11,
    fontFamily: FONTS.sans,
    color: COLORS.textHint,
    lineHeight: 16,
    flex: 1
  }
});
