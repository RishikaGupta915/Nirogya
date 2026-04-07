// src/screens/assessment/AssessmentScreen.tsx

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ProgressBar, GradientButton, GhostButton } from '../../components/UI';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { generateQuestions, generateDiagnosis } from '../../services/aiService';
import { saveAssessment } from '../../services/assessmentService';
import { auth } from '../../services/authService';

interface Question {
  id: string;
  text: string;
  options: string[];
}

export default function AssessmentScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { userProfile } = useApp();

  const symptom: string = route.params?.symptom ?? '';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customAnswer, setCustomAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generateQuestions(
        symptom,
        userProfile,
        userProfile.language ?? 'en'
      );
      setQuestions(result.questions);
    } catch (_err) {
      setError(
        'Could not load questions. Please check your internet connection.'
      );
    } finally {
      setLoading(false);
    }
  }, [symptom, userProfile]);

  // Load AI questions on mount
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const q = questions[currentQ];
  const selectedOpt = q ? (answers[q.id] ?? '') : '';
  const isLastQ = currentQ === questions.length - 1;

  const handleSelect = (opt: string) => {
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: opt }));
    setCustomAnswer('');
  };

  const handleCustomType = (text: string) => {
    setCustomAnswer(text);
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: text }));
  };

  const handleNext = async () => {
    if (!isLastQ) {
      setCurrentQ((i) => i + 1);
      setCustomAnswer('');
      return;
    }

    // Final question — generate diagnosis
    setSubmitting(true);
    try {
      const diagnosis = await generateDiagnosis(
        symptom,
        answers,
        userProfile,
        userProfile.language ?? 'en'
      );

      // Save to Firestore
      const uid = auth.currentUser?.uid;
      if (uid) {
        await saveAssessment({
          uid,
          symptom,
          answers,
          diagnosis: diagnosis.diagnosis,
          riskScore: diagnosis.riskScore,
          riskLevel: diagnosis.riskLevel,
          nextSteps: diagnosis.nextSteps,
          rawAiText: JSON.stringify(diagnosis)
        });
      }

      nav.navigate('Results', { diagnosis, symptom });
    } catch (_err) {
      Alert.alert('Error', 'Could not generate diagnosis. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <ScreenWrapper scrollable={false}>
        <View style={styles.loadCenter}>
          <ActivityIndicator size="large" color={COLORS.pink} />
          <Text style={styles.loadText}>Preparing your questions…</Text>
          <Text style={styles.loadSub}>
            Personalising based on your profile
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper scrollable={false}>
        <View style={styles.loadCenter}>
          <MaterialCommunityIcons
            name="wifi-off"
            size={36}
            color={COLORS.textMuted}
          />
          <Text style={styles.loadText}>{error}</Text>
          <GradientButton
            label="Try again"
            onPress={loadQuestions}
            style={{ marginTop: SPACING.lg }}
          />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={18}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
        <Text style={styles.symptomLabel}>{symptom}</Text>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={styles.progRow}>
        <Text style={styles.progLabel}>
          Question {currentQ + 1} of {questions.length}
        </Text>
        <Text style={styles.progPct}>
          {Math.round(((currentQ + 1) / questions.length) * 100)}%
        </Text>
      </View>
      <ProgressBar current={currentQ + 1} total={questions.length} />

      {/* Question */}
      {q && (
        <>
          <Text style={styles.qStep}>
            {[
              'Location',
              'Duration',
              'Character',
              'Associated symptoms',
              'Context'
            ][currentQ] ?? `Question ${currentQ + 1}`}
          </Text>
          <Text style={styles.qText}>{q.text}</Text>

          {/* Options */}
          <View style={styles.optList}>
            {q.options.map((opt) => {
              const isSel = selectedOpt === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optCard, isSel && styles.optCardSel]}
                  onPress={() => handleSelect(opt)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optRadio, isSel && styles.optRadioSel]}>
                    {isSel && <View style={styles.optRadioDot} />}
                  </View>
                  <Text style={[styles.optText, isSel && styles.optTextSel]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom answer input */}
          <Text style={styles.orLabel}>Or describe in your own words</Text>
          <View style={styles.customBox}>
            <MaterialCommunityIcons
              name="pencil-outline"
              size={13}
              color={COLORS.textMuted}
            />
            <TextInput
              style={styles.customInput}
              placeholder="Type your own description…"
              placeholderTextColor={COLORS.textHint}
              value={customAnswer}
              onChangeText={handleCustomType}
            />
          </View>

          <GradientButton
            label={isLastQ ? 'See my results →' : 'Next →'}
            onPress={handleNext}
            loading={submitting}
            disabled={!selectedOpt && !customAnswer.trim()}
            style={{ marginTop: SPACING.md }}
          />
          {currentQ > 0 && (
            <GhostButton
              label="← Back"
              onPress={() => setCurrentQ((i) => i - 1)}
            />
          )}
        </>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md
  },
  loadText: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    color: COLORS.textPrimary,
    textAlign: 'center'
  },
  loadSub: {
    fontSize: 12,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    textAlign: 'center'
  },

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
  symptomLabel: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    color: COLORS.textPrimary
  },
  cancelTxt: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted },

  progRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm
  },
  progLabel: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted },
  progPct: {
    fontSize: 10,
    fontFamily: FONTS.sansBold,
    color: COLORS.textSecondary
  },

  qStep: {
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(232,121,160,0.7)',
    fontFamily: FONTS.sansBold,
    marginBottom: SPACING.sm
  },
  qText: {
    fontFamily: FONTS.serif,
    fontSize: 20,
    color: COLORS.textPrimary,
    lineHeight: 28,
    marginBottom: SPACING.lg
  },

  optList: { gap: SPACING.sm, marginBottom: SPACING.lg },
  optCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 0.5,
    borderColor: COLORS.border
  },
  optCardSel: {
    backgroundColor: COLORS.pinkBg,
    borderColor: COLORS.pinkBorder
  },
  optRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  optRadioSel: { borderColor: COLORS.pink, backgroundColor: COLORS.pinkBg },
  optRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.pink
  },
  optText: {
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.textSecondary,
    flex: 1
  },
  optTextSel: { color: COLORS.pink, fontFamily: FONTS.sansBold },

  orLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.textHint,
    fontFamily: FONTS.sansBold,
    marginBottom: SPACING.sm
  },
  customBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md
  },
  customInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.sans,
    color: COLORS.textPrimary
  }
});
