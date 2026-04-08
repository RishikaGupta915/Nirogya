import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import {
  generateDiagnosis,
  generateQuestions,
  startConversation,
  sendConversationMessage
} from '../../services/aiService';
import type { QuestionSet } from '../../services/aiService';
import { COLORS, FONTS } from '../../constants/theme';
import { UI_SHADOWS } from '../../constants/ui';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';

type Message = { id: string; sender: 'nira' | 'user'; text: string };
type ChatMode = 'backend' | 'local';
type LocalDiagnosis = {
  diagnosis: string;
  description: string;
  riskScore: number;
  nextSteps: string[];
  urgency: string;
  confidence?: number;
  differential?: {
    condition: string;
    probability: number;
    rationale: string;
  }[];
  redFlags?: string[];
  tieBreakerQuestion?: string | null;
  riskLevel?: 'low' | 'medium' | 'high';
};
let hasWarnedConversationBootstrap = false;

function logChatError(
  stage: string,
  error: unknown,
  meta?: Record<string, any>
) {
  console.error(`[CHAT][${stage}]`, {
    error: String((error as any)?.message ?? error),
    ...(meta || {})
  });
}

function formatQuestion(
  question: QuestionSet['questions'][number],
  index: number,
  total: number
) {
  const options = (question.options || [])
    .map((option, i) => `${i + 1}. ${option}`)
    .join('\n');

  return `Q${index + 1}/${total}: ${question.text}\n\n${options}`;
}

function formatDiagnosisReply(result: LocalDiagnosis) {
  const steps = result.nextSteps
    .map((step, i) => `${i + 1}. ${step}`)
    .join('\n');
  const confidenceLine =
    typeof result.confidence === 'number'
      ? `Diagnostic confidence: ${result.confidence}%\n`
      : '';

  const differentialBlock =
    Array.isArray(result.differential) && result.differential.length > 0
      ? `\nTop likely conditions:\n${result.differential
          .slice(0, 3)
          .map(
            (item, idx) =>
              `${idx + 1}. ${item.condition} (${item.probability}%) - ${item.rationale}`
          )
          .join('\n')}\n`
      : '';

  const redFlagBlock =
    Array.isArray(result.redFlags) && result.redFlags.length > 0
      ? `\nUrgent warning signs:\n${result.redFlags
          .map((item, idx) => `${idx + 1}. ${item}`)
          .join('\n')}\n`
      : '';

  return (
    `Likely condition: ${result.diagnosis}\n` +
    `Confidence score: ${result.riskScore}%\n` +
    confidenceLine +
    `Urgency: ${result.urgency}\n\n` +
    `${result.description}\n` +
    differentialBlock +
    redFlagBlock +
    `\n` +
    `What to do next:\n${steps}`
  );
}

export default function NiraChatScreen() {
  const { userProfile, themeMode } = useApp();
  const language = userProfile.language ?? 'en';
  const isDark = themeMode === 'dark';
  const bgGradient = useMemo<[string, string, string]>(
    () =>
      isDark
        ? ['#0b1020', '#121a33', '#1a1230']
        : ['#f7fbff', '#eef7ff', '#f9f4ff'],
    [isDark]
  );
  const headerAnim = useEntranceAnimation(0, 8);
  const listAnim = useEntranceAnimation(90, 12);
  const composerAnim = useEntranceAnimation(180, 12);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'nira',
      text: 'Hi! I am Nira, your AI health assistant. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('backend');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [urgentNotice, setUrgentNotice] = useState<string | null>(null);
  const [localSymptom, setLocalSymptom] = useState<string | null>(null);
  const [localQuestions, setLocalQuestions] = useState<
    QuestionSet['questions']
  >([]);
  const [localQuestionIndex, setLocalQuestionIndex] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [tieBreakerQuestion, setTieBreakerQuestion] = useState<string | null>(
    null
  );
  const [tieBreakerContext, setTieBreakerContext] = useState<{
    symptom: string;
    answers: Record<string, string>;
  } | null>(null);

  const activeLocalQuestion =
    chatMode === 'local' &&
    localQuestions.length > 0 &&
    localQuestionIndex < localQuestions.length
      ? localQuestions[localQuestionIndex]
      : null;

  const quickReplyOptions =
    tieBreakerQuestion !== null
      ? ['Yes', 'No', 'Not sure']
      : activeLocalQuestion?.options || [];

  const resetLocalFlow = () => {
    setLocalSymptom(null);
    setLocalQuestions([]);
    setLocalQuestionIndex(0);
    setLocalAnswers({});
    setTieBreakerQuestion(null);
    setTieBreakerContext(null);
  };

  const appendAssistantMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-nira-${Math.random().toString(36).slice(2, 8)}`,
        sender: 'nira',
        text
      }
    ]);
  };

  const runLocalFlow = async (userInput: string) => {
    if (tieBreakerQuestion && tieBreakerContext) {
      const refinedAnswers: Record<string, string> = {
        ...tieBreakerContext.answers,
        tie_breaker: userInput
      };
      const refined = await generateDiagnosis(
        tieBreakerContext.symptom,
        refinedAnswers,
        userProfile,
        language
      );

      setTieBreakerQuestion(null);
      setTieBreakerContext(null);

      if (
        refined.riskLevel === 'high' ||
        (Array.isArray(refined.redFlags) && refined.redFlags.length > 0)
      ) {
        setUrgentNotice(refined.redFlags?.[0] || refined.description);
      }

      appendAssistantMessage(
        formatDiagnosisReply({
          ...refined,
          tieBreakerQuestion: null
        })
      );
      appendAssistantMessage(
        'If you want, type another symptom and I will run another differential check.'
      );
      resetLocalFlow();
      return;
    }

    if (!localSymptom) {
      const symptom = userInput;
      const generated = await generateQuestions(symptom, userProfile, language);
      setLocalSymptom(symptom);
      setLocalQuestions(generated.questions);
      setLocalQuestionIndex(0);
      setLocalAnswers({});

      if (generated.questions.length === 0) {
        appendAssistantMessage(
          'I could not generate a questionnaire right now. Please describe your symptom in more detail.'
        );
        return;
      }

      appendAssistantMessage(
        'Let us narrow this down step-by-step like a clinical Akinator.'
      );
      appendAssistantMessage(
        formatQuestion(generated.questions[0], 0, generated.questions.length)
      );
      return;
    }

    const currentQuestion = activeLocalQuestion;
    if (!currentQuestion) {
      resetLocalFlow();
      appendAssistantMessage(
        'Please tell me your main symptom and I will start a fresh check.'
      );
      return;
    }

    const updatedAnswers: Record<string, string> = {
      ...localAnswers,
      [currentQuestion.id]: userInput
    };
    setLocalAnswers(updatedAnswers);

    const nextIndex = localQuestionIndex + 1;
    if (nextIndex < localQuestions.length) {
      setLocalQuestionIndex(nextIndex);
      const nextQuestion = localQuestions[nextIndex];
      appendAssistantMessage(
        formatQuestion(nextQuestion, nextIndex, localQuestions.length)
      );
      return;
    }

    const diagnosis = await generateDiagnosis(
      localSymptom,
      updatedAnswers,
      userProfile,
      language
    );

    const needsTieBreaker =
      typeof diagnosis.tieBreakerQuestion === 'string' &&
      diagnosis.tieBreakerQuestion.trim().length > 0 &&
      (typeof diagnosis.confidence === 'number'
        ? diagnosis.confidence < 68
        : diagnosis.riskScore < 60);

    if (needsTieBreaker) {
      setTieBreakerQuestion(diagnosis.tieBreakerQuestion || null);
      setTieBreakerContext({ symptom: localSymptom, answers: updatedAnswers });
      appendAssistantMessage(
        `One final precision question:\n${diagnosis.tieBreakerQuestion}`
      );
      return;
    }

    if (diagnosis.riskLevel === 'high') {
      setUrgentNotice(diagnosis.redFlags?.[0] || diagnosis.description);
    }

    appendAssistantMessage(formatDiagnosisReply(diagnosis));
    appendAssistantMessage(
      'If you want, type another symptom and I will run another differential check.'
    );
    resetLocalFlow();
  };

  useEffect(() => {
    let active = true;

    const bootstrapConversation = async () => {
      try {
        const started = await startConversation(userProfile, language);
        if (!active) return;
        setConversationId(started.conversationId);
        setMessages([{ id: '1', sender: 'nira', text: started.greeting }]);
      } catch (err) {
        logChatError('bootstrap', err, { language });
        if (!hasWarnedConversationBootstrap) {
          hasWarnedConversationBootstrap = true;
          console.warn(
            '[Chat] Failed to start backend conversation. Continuing in local chat mode.',
            err
          );
        }
        if (active) {
          setChatMode('local');
          setConversationId(null);
          resetLocalFlow();
          setMessages([
            {
              id: '1-local',
              sender: 'nira',
              text: 'I am switching to local question mode. Describe your main symptom and I will ask focused follow-up questions.'
            }
          ]);
        }
      }
    };

    void bootstrapConversation();

    return () => {
      active = false;
    };
  }, [language]);

  const sendMessage = async () => {
    const userInput = input.trim();
    if (!userInput || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userInput
    };
    setMessages((prev: Message[]) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      if (chatMode === 'local') {
        await runLocalFlow(userInput);
        return;
      }

      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const started = await startConversation(userProfile, language);
        activeConversationId = started.conversationId;
        setConversationId(started.conversationId);
      }

      const reply = await sendConversationMessage(
        activeConversationId,
        userInput,
        userProfile,
        language
      );

      if (reply.isUrgent) {
        setUrgentNotice(reply.reply);
      }

      setMessages((prev: Message[]) => [
        ...prev,
        {
          id: `${Date.now()}-nira`,
          sender: 'nira',
          text: reply.reply
        }
      ]);
    } catch (e: any) {
      if (chatMode === 'backend') {
        logChatError('backend-send', e, {
          language,
          messageLength: userInput.length
        });
        setChatMode('local');
        setConversationId(null);
        resetLocalFlow();
        appendAssistantMessage(
          'Live server chat is unavailable right now. I switched to local question mode.'
        );
        try {
          await runLocalFlow(userInput);
          return;
        } catch (fallbackErr: any) {
          logChatError('local-fallback-after-backend', fallbackErr, {
            language,
            messageLength: userInput.length
          });
          Alert.alert(
            'Nira Error',
            fallbackErr?.message || 'Could not process your message.'
          );
        }
      } else {
        logChatError('local-send', e, {
          language,
          messageLength: userInput.length
        });
        Alert.alert('Nira Error', e?.message || 'Could not send message.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-canvas dark:bg-slate-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={bgGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="absolute inset-0"
        />

        <View className="absolute -left-16 top-12 h-40 w-40 rounded-full bg-brandStart/12" />
        <View className="absolute -right-12 top-40 h-32 w-32 rounded-full bg-skySoft/35" />

        <Animated.View style={headerAnim}>
          <View
            className="mx-3 mb-2 mt-3 rounded-3xl border border-white/80 bg-white/80 dark:bg-slate-900/68 p-3"
            style={UI_SHADOWS.soft}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brandStart/15">
                  <MaterialCommunityIcons
                    name="robot-excited-outline"
                    size={24}
                    color={COLORS.gradStart}
                  />
                </View>
                <View className="ml-3">
                  <Text
                    className="text-[26px] text-textPrimary dark:text-slate-100"
                    style={{ fontFamily: FONTS.serif, fontWeight: '600' }}
                  >
                    Nira Live
                  </Text>
                  <Text
                    className="text-[12px] leading-[18px] text-textMuted dark:text-slate-300"
                    style={{ fontFamily: FONTS.sans }}
                  >
                    Talk naturally. I will guide your assessment.
                  </Text>
                </View>
              </View>
              <View className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1">
                <Text
                  className="text-[10px] uppercase tracking-[1.1px] text-emerald-700"
                  style={{ fontFamily: FONTS.sansBold }}
                >
                  Online
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {urgentNotice && (
          <View className="mx-3 mb-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2">
            <Text
              className="text-[12px] text-red-700"
              style={{ fontFamily: FONTS.sansBold }}
            >
              Urgent guidance
            </Text>
            <Text
              className="mt-1 text-[12px] text-red-700"
              style={{ fontFamily: FONTS.sans }}
            >
              {urgentNotice}
            </Text>
          </View>
        )}

        <Animated.View
          className="mx-3 mb-2 flex-1 rounded-3xl border border-white/80 bg-white/60 dark:bg-slate-900/58"
          style={[UI_SHADOWS.soft, listAnim]}
        >
          <FlatList
            data={messages}
            keyExtractor={(item: Message) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }: { item: Message }) => (
              <View
                className={`mb-3 ${item.sender === 'nira' ? 'items-start' : 'items-end'}`}
              >
                <View
                  className={`max-w-[92%] flex-row items-end ${item.sender === 'nira' ? '' : 'flex-row-reverse'}`}
                >
                  <View
                    className={`h-[28px] w-[28px] items-center justify-center rounded-full ${item.sender === 'nira' ? 'mr-2 bg-brandStart/12' : 'ml-2 bg-brandEnd/14'}`}
                  >
                    <MaterialCommunityIcons
                      name={
                        item.sender === 'nira' ? 'robot-excited' : 'account'
                      }
                      size={16}
                      color={
                        item.sender === 'nira'
                          ? COLORS.gradStart
                          : COLORS.gradEnd
                      }
                    />
                  </View>
                  <View
                    className="rounded-[20px] border px-4 py-3"
                    style={
                      item.sender === 'nira'
                        ? {
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            borderColor: COLORS.border,
                            ...UI_SHADOWS.soft
                          }
                        : {
                            backgroundColor: 'rgba(255,107,138,0.14)',
                            borderColor: 'rgba(255,107,138,0.24)'
                          }
                    }
                  >
                    <Text
                      className="shrink text-[14px] leading-[21px] text-textPrimary dark:text-slate-100"
                      style={{ fontFamily: FONTS.sans }}
                    >
                      {item.text}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingTop: 10,
              paddingBottom: 12
            }}
          />

          {loading && (
            <View
              className="mx-3 mb-3 flex-row items-center self-start rounded-2xl border border-borderSoft bg-white/90 dark:bg-slate-900/74 px-3 py-2"
              style={UI_SHADOWS.soft}
            >
              <ActivityIndicator color={COLORS.gradStart} size="small" />
              <Text
                className="ml-2 text-[12px] text-textMuted dark:text-slate-300"
                style={{ fontFamily: FONTS.sans }}
              >
                Nira is thinking...
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.View style={composerAnim}>
          <View
            className="mx-3 mb-3 rounded-3xl border border-white/80 bg-white/85 dark:bg-slate-900/72 p-2"
            style={UI_SHADOWS.soft}
          >
            {quickReplyOptions.length > 0 ? (
              <View className="mb-2 flex-row flex-wrap gap-2">
                {quickReplyOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      if (loading) return;
                      setInput(option);
                    }}
                    className="rounded-full border border-borderSoft bg-card dark:bg-slate-900/74 px-3 py-1"
                    activeOpacity={0.75}
                  >
                    <Text
                      className="text-[11px] text-textSecondary dark:text-slate-200"
                      style={{ fontFamily: FONTS.sans }}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View className="flex-row items-center">
              <TextInput
                className="mr-2 flex-1 rounded-2xl bg-white/95 dark:bg-slate-900/78 px-4 py-[11px] text-[14px] text-textPrimary dark:text-slate-100"
                style={{ fontFamily: FONTS.sans }}
                value={input}
                onChangeText={setInput}
                placeholder={
                  chatMode === 'local'
                    ? tieBreakerQuestion
                      ? 'Answer the precision question...'
                      : activeLocalQuestion
                        ? 'Type your answer...'
                        : 'Describe your symptom to start...'
                    : 'Type your message to Nira'
                }
                placeholderTextColor={COLORS.textHint}
                editable={!loading}
                returnKeyType="send"
                onSubmitEditing={() => {
                  void sendMessage();
                }}
              />
              <TouchableOpacity
                className="overflow-hidden rounded-2xl"
                style={UI_SHADOWS.brandGlow}
                onPress={() => {
                  void sendMessage();
                }}
                disabled={loading}
              >
                <LinearGradient
                  colors={
                    loading
                      ? ['#c5cfdb', '#b2c0d0']
                      : [COLORS.gradStart, COLORS.gradEnd]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="px-[14px] py-[11px]"
                >
                  <MaterialCommunityIcons name="send" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
