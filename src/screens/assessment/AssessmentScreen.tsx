import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Animated
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ProgressBar, GradientButton, GhostButton } from '../../components/UI';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { UI_SHADOWS } from '../../constants/ui';
import { useApp } from '../../context/AppContext';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';
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
  const contentAnim = useEntranceAnimation(0, 10);

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
    } catch {
      setError(
        'Could not load questions. Please check your internet connection.'
      );
    } finally {
      setLoading(false);
    }
  }, [symptom, userProfile]);

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

    setSubmitting(true);
    try {
      const diagnosis = await generateDiagnosis(
        symptom,
        answers,
        userProfile,
        userProfile.language ?? 'en'
      );

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
    } catch {
      Alert.alert('Error', 'Could not generate diagnosis. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper scrollable={false}>
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color={COLORS.gradStart} />
          <Text className="text-center text-[18px] text-textPrimary" style={{ fontFamily: FONTS.serif }}>
            Preparing your questions…
          </Text>
          <Text className="text-center text-[12px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
            Personalising based on your profile
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper scrollable={false}>
        <View className="flex-1 items-center justify-center gap-3">
          <MaterialCommunityIcons name="wifi-off" size={36} color={COLORS.textMuted} />
          <Text className="text-center text-[18px] text-textPrimary" style={{ fontFamily: FONTS.serif }}>
            {error}
          </Text>
          <GradientButton label="Try again" onPress={loadQuestions} style={{ marginTop: SPACING.lg }} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Animated.View style={contentAnim}>
        <View className="mb-5 flex-row items-center justify-between pt-2">
          <TouchableOpacity
            className="h-[34px] w-[34px] items-center justify-center rounded-md border border-borderSoft bg-card"
            style={UI_SHADOWS.soft}
            onPress={() => nav.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text className="text-[16px] text-textPrimary" style={{ fontFamily: FONTS.serif }}>
            {symptom}
          </Text>
          <TouchableOpacity onPress={() => nav.goBack()}>
            <Text className="text-[12px] tracking-[0.15px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mb-2 flex-row justify-between">
          <Text className="text-[10px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
            Question {currentQ + 1} of {questions.length}
          </Text>
          <Text className="text-[10px] text-textSecondary" style={{ fontFamily: FONTS.sansBold }}>
            {Math.round(((currentQ + 1) / questions.length) * 100)}%
          </Text>
        </View>
        <ProgressBar current={currentQ + 1} total={questions.length} />

        {q && (
          <>
            <Text className="mb-2 text-[9px] uppercase tracking-[0.8px] text-brandStart" style={{ fontFamily: FONTS.sansBold }}>
              {[
                'Location',
                'Duration',
                'Character',
                'Associated symptoms',
                'Context'
              ][currentQ] ?? `Question ${currentQ + 1}`}
            </Text>
            <Text className="mb-5 text-[22px] leading-8 text-textPrimary" style={{ fontFamily: FONTS.serif }}>
              {q.text}
            </Text>

            <View className="mb-5 gap-[10px]">
              {q.options.map((opt) => {
                const isSel = selectedOpt === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    className="flex-row items-center gap-3 rounded-xl border p-[13px]"
                    style={{
                      backgroundColor: isSel ? COLORS.pinkBg : COLORS.bgCard,
                      borderColor: isSel ? COLORS.pinkBorder : COLORS.border,
                      ...UI_SHADOWS.soft
                    }}
                    onPress={() => handleSelect(opt)}
                    activeOpacity={0.8}
                  >
                    <View
                      className="h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border"
                      style={{
                        borderColor: isSel ? COLORS.pink : COLORS.border,
                        backgroundColor: isSel ? COLORS.pinkBg : 'transparent'
                      }}
                    >
                      {isSel && <View className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.pink }} />}
                    </View>
                    <Text
                      className="flex-1 text-[13px] leading-[19px]"
                      style={{
                        color: isSel ? COLORS.pink : COLORS.textSecondary,
                        fontFamily: isSel ? FONTS.sansBold : FONTS.sans
                      }}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="mb-2 text-[10px] uppercase tracking-[0.9px] text-textHint" style={{ fontFamily: FONTS.sansBold }}>
              Or describe in your own words
            </Text>
            <View
              className={`flex-row items-center gap-2 rounded-xl border border-borderSoft bg-card px-3 py-[12px]`}
              style={UI_SHADOWS.soft}
            >
              <MaterialCommunityIcons name="pencil-outline" size={13} color={COLORS.textMuted} />
              <TextInput
                className="flex-1 text-[12px] text-textPrimary"
                style={{ fontFamily: FONTS.sans }}
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
            {currentQ > 0 && <GhostButton label="← Back" onPress={() => setCurrentQ((i) => i - 1)} />}
          </>
        )}
      </Animated.View>
    </ScreenWrapper>
  );
}