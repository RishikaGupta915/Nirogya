import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Keyboard,
  Platform,
  Linking,
  Modal,
  Pressable
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useRoute } from '@react-navigation/native';
import {
  generateDiagnosis,
  generateQuestions,
  startConversation,
  sendConversationMessage
} from '../../services/aiService';
import type {
  AlertItem,
  FollowUpQuestion,
  NearbyFacility,
  QuestionSet
} from '../../services/aiService';
import {
  createChatSessionId,
  deriveChatTitle,
  getChatSession,
  listChatSessions,
  type ChatHistoryMessage,
  type ChatHistorySession,
  upsertChatSession
} from '../../services/chatHistoryService';
import { COLORS, FONTS } from '../../constants/theme';
import { UI_SHADOWS } from '../../constants/ui';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';

type Message = {
  id: string;
  sender: 'nira' | 'user';
  text: string;
  createdAt: string;
};
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
const ANDROID_KEYBOARD_EXTRA_LIFT = 22;
const ANDROID_COMPOSER_BASE_GAP = 18;

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
  void index;
  void total;
  const options = (question.options || [])
    .map((option, i) => `${i + 1}. ${option}`)
    .join('\n');

  return `${question.text}\n\n${options}`;
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

function severityColors(severity: AlertItem['severity']) {
  if (severity === 'critical') {
    return {
      border: 'rgba(239,68,68,0.3)',
      bg: 'rgba(254,226,226,0.88)',
      text: '#b91c1c'
    };
  }

  if (severity === 'warning') {
    return {
      border: 'rgba(245,158,11,0.3)',
      bg: 'rgba(254,243,199,0.9)',
      text: '#92400e'
    };
  }

  return {
    border: 'rgba(59,130,246,0.26)',
    bg: 'rgba(219,234,254,0.88)',
    text: '#1d4ed8'
  };
}

function formatDistance(distanceKm: number | null) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) {
    return 'Distance not available';
  }

  return `${distanceKm.toFixed(1)} km away`;
}

function formatChatStamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function NiraChatScreen() {
  const route = useRoute<any>();
  const requestedSessionId =
    typeof route.params?.sessionId === 'string'
      ? route.params.sessionId
      : null;
  const requestedOpenHistoryAt =
    typeof route.params?.openHistoryAt === 'number'
      ? route.params.openHistoryAt
      : null;
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
      text: 'Hi! I am Nira, your AI health assistant. How can I help you today?',
      createdAt: new Date().toISOString()
    }
  ]);
  const [chatSessionId, setChatSessionId] = useState<string>(
    () => requestedSessionId || createChatSessionId()
  );
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string>(
    () => new Date().toISOString()
  );
  const [sessionReady, setSessionReady] = useState(false);
  const [savedSessions, setSavedSessions] = useState<ChatHistorySession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(
    Boolean(requestedOpenHistoryAt)
  );
  const [androidKeyboardInset, setAndroidKeyboardInset] = useState(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('backend');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [urgentNotice, setUrgentNotice] = useState<string | null>(null);
  const [chatAlerts, setChatAlerts] = useState<AlertItem[]>([]);
  const [nearbyFacilities, setNearbyFacilities] = useState<NearbyFacility[]>(
    []
  );
  const [backendFollowUpQuestion, setBackendFollowUpQuestion] =
    useState<FollowUpQuestion | null>(null);
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

  const refreshSavedSessions = useCallback(async () => {
    try {
      const list = await listChatSessions(60);
      setSavedSessions(list);
    } catch (err) {
      console.warn('[Chat] Failed to load saved sessions', err);
    }
  }, []);

  const activeLocalQuestion =
    chatMode === 'local' &&
    localQuestions.length > 0 &&
    localQuestionIndex < localQuestions.length
      ? localQuestions[localQuestionIndex]
      : null;

  const quickReplyOptions =
    tieBreakerQuestion !== null
      ? ['Yes', 'No', 'Not sure']
      : activeLocalQuestion?.options || backendFollowUpQuestion?.options || [];

  const visibleAlerts: AlertItem[] =
    chatAlerts.length > 0
      ? chatAlerts
      : urgentNotice
        ? [
            {
              id: 'urgent-notice',
              severity: 'critical',
              title: 'Urgent guidance',
              message: urgentNotice,
              action: null
            }
          ]
        : [];

  const resetLocalFlow = useCallback(() => {
    setLocalSymptom(null);
    setLocalQuestions([]);
    setLocalQuestionIndex(0);
    setLocalAnswers({});
    setTieBreakerQuestion(null);
    setTieBreakerContext(null);
  }, []);

  const openFacilityMap = async (facility: NearbyFacility) => {
    try {
      await Linking.openURL(facility.mapUrl);
    } catch {
      Alert.alert('Map Error', 'Could not open map for this facility.');
    }
  };

  const appendAssistantMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-nira-${Math.random().toString(36).slice(2, 8)}`,
        sender: 'nira',
        text,
        createdAt: new Date().toISOString()
      }
    ]);
  };

  const applyLoadedSession = useCallback(
    (session: ChatHistorySession) => {
      const hydratedMessages: Message[] =
        Array.isArray(session.messages) && session.messages.length > 0
          ? session.messages.map((message: ChatHistoryMessage) => ({
              id: message.id,
              sender: message.sender,
              text: message.text,
              createdAt: message.createdAt
            }))
          : [
              {
                id: `${Date.now()}-seed`,
                sender: 'nira',
                text: 'Hi! I am Nira, your AI health assistant. How can I help you today?',
                createdAt: new Date().toISOString()
              }
            ];

      setChatMode('backend');
      setConversationId(session.backendConversationId || null);
      setChatSessionId(session.id);
      setSessionCreatedAt(session.createdAt || new Date().toISOString());
      setMessages(hydratedMessages);
      setInput('');
      setUrgentNotice(null);
      setChatAlerts([]);
      setNearbyFacilities([]);
      setBackendFollowUpQuestion(null);
      resetLocalFlow();
      setSessionReady(true);
    },
    [resetLocalFlow]
  );

  const startFreshChat = useCallback(async () => {
    const nextSessionId = createChatSessionId();
    const createdAt = new Date().toISOString();

    setHistoryOpen(false);
    setLoading(true);
    setSessionReady(false);
    setChatSessionId(nextSessionId);
    setSessionCreatedAt(createdAt);
    setConversationId(null);
    setUrgentNotice(null);
    setChatAlerts([]);
    setNearbyFacilities([]);
    setBackendFollowUpQuestion(null);
    resetLocalFlow();

    try {
      const started = await startConversation(userProfile, language);
      setChatMode('backend');
      setConversationId(started.conversationId);
      setMessages([
        {
          id: `${Date.now()}-greeting`,
          sender: 'nira',
          text: started.greeting,
          createdAt: new Date().toISOString()
        }
      ]);
      setSessionReady(true);
    } catch (err) {
      logChatError('start-fresh', err, { language });
      setChatMode('local');
      setConversationId(null);
      setMessages([
        {
          id: `${Date.now()}-local`,
          sender: 'nira',
          text: 'I am switching to local question mode. Describe your main symptom and I will ask focused follow-up questions.',
          createdAt: new Date().toISOString()
        }
      ]);
      setSessionReady(true);
    } finally {
      setLoading(false);
      void refreshSavedSessions();
    }
  }, [language, refreshSavedSessions, resetLocalFlow, userProfile]);

  const openSavedSession = useCallback(
    async (sessionId: string) => {
      const existing = await getChatSession(sessionId);
      if (!existing) {
        Alert.alert('Not found', 'Saved conversation could not be opened.');
        return;
      }

      applyLoadedSession(existing);
      setHistoryOpen(false);
    },
    [applyLoadedSession]
  );

  const restoreMostRecentSession = useCallback(async (): Promise<boolean> => {
    try {
      const latest = await listChatSessions(1);
      const session = latest[0];
      if (!session) return false;

      applyLoadedSession(session);
      return true;
    } catch (err) {
      console.warn('[Chat] Failed to restore latest session', err);
      return false;
    }
  }, [applyLoadedSession]);

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
        setChatAlerts([
          {
            id: `local-critical-${Date.now()}`,
            severity: 'critical',
            title: 'Urgent guidance',
            message: refined.redFlags?.[0] || refined.description,
            action: null
          }
        ]);
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
      setChatAlerts([
        {
          id: `local-critical-${Date.now()}`,
          severity: 'critical',
          title: 'Urgent guidance',
          message: diagnosis.redFlags?.[0] || diagnosis.description,
          action: null
        }
      ]);
    } else {
      setChatAlerts([
        {
          id: `local-info-${Date.now()}`,
          severity: diagnosis.riskLevel === 'medium' ? 'warning' : 'info',
          title:
            diagnosis.riskLevel === 'medium'
              ? 'Doctor follow-up recommended'
              : 'Self-care monitoring',
          message:
            diagnosis.riskLevel === 'medium'
              ? 'Please follow up with a clinician in the next 1-2 weeks.'
              : 'Continue symptom tracking and monitor changes.',
          action: null
        }
      ]);
    }

    appendAssistantMessage(formatDiagnosisReply(diagnosis));
    appendAssistantMessage(
      'If you want, type another symptom and I will run another differential check.'
    );
    resetLocalFlow();
  };

  useEffect(() => {
    void refreshSavedSessions();
  }, [refreshSavedSessions]);

  useEffect(() => {
    if (requestedOpenHistoryAt !== null) {
      setHistoryOpen(true);
    }
  }, [requestedOpenHistoryAt]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      const keyboardHeight = Number(event?.endCoordinates?.height || 0);
      setAndroidKeyboardInset(
        Math.max(0, keyboardHeight + ANDROID_KEYBOARD_EXTRA_LIFT)
      );
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardInset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;

    const initializeConversation = async () => {
      setSessionReady(false);

      if (requestedSessionId) {
        try {
          const existing = await getChatSession(requestedSessionId);
          if (existing && active) {
            applyLoadedSession(existing);
            return;
          }
        } catch (err) {
          logChatError('load-saved-session', err, { requestedSessionId });
        }
      }

      if (requestedOpenHistoryAt !== null) {
        const restored = await restoreMostRecentSession();
        if (restored && active) {
          return;
        }
      }

      try {
        const started = await startConversation(userProfile, language);
        if (!active) return;
        setChatMode('backend');
        setConversationId(started.conversationId);
        setMessages([
          {
            id: `${Date.now()}-greeting`,
            sender: 'nira',
            text: started.greeting,
            createdAt: new Date().toISOString()
          }
        ]);
        setSessionReady(true);
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
          setBackendFollowUpQuestion(null);
          resetLocalFlow();
          setMessages([
            {
              id: `${Date.now()}-local`,
              sender: 'nira',
              text: 'I am switching to local question mode. Describe your main symptom and I will ask focused follow-up questions.',
              createdAt: new Date().toISOString()
            }
          ]);
          setSessionReady(true);
        }
      }
    };

    void initializeConversation();

    return () => {
      active = false;
    };
  }, [
    applyLoadedSession,
    language,
    requestedOpenHistoryAt,
    requestedSessionId,
    resetLocalFlow,
    restoreMostRecentSession,
    userProfile
  ]);

  useEffect(() => {
    if (!sessionReady || !chatSessionId || messages.length === 0) return;

    let cancelled = false;

    const persistConversation = async () => {
      const serializedMessages: ChatHistoryMessage[] = messages
        .slice(-140)
        .map((message) => ({
          id: message.id,
          sender: message.sender,
          text: message.text,
          createdAt: message.createdAt || new Date().toISOString()
        }));

      const detectedTitle = deriveChatTitle(serializedMessages);
      const lastMessage = serializedMessages.at(-1)?.text || '';

      await upsertChatSession({
        id: chatSessionId,
        backendConversationId: conversationId,
        title: detectedTitle,
        detectedTitle,
        createdAt: sessionCreatedAt,
        updatedAt: new Date().toISOString(),
        lastMessage,
        messages: serializedMessages
      });

      if (!cancelled) {
        void refreshSavedSessions();
      }
    };

    void persistConversation();

    return () => {
      cancelled = true;
    };
  }, [
    chatSessionId,
    conversationId,
    messages,
    refreshSavedSessions,
    sessionReady,
    sessionCreatedAt
  ]);

  const sendMessage = async () => {
    const userInput = input.trim();
    if (!userInput || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userInput,
      createdAt: new Date().toISOString()
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

      setBackendFollowUpQuestion(reply.followUpQuestion ?? null);
      setChatAlerts(Array.isArray(reply.alerts) ? reply.alerts : []);
      setNearbyFacilities(
        Array.isArray(reply.nearbyFacilities) ? reply.nearbyFacilities : []
      );

      if (reply.isUrgent) {
        setUrgentNotice(
          (Array.isArray(reply.alerts) && reply.alerts[0]?.message) ||
            reply.reply
        );
      } else {
        setUrgentNotice(null);
      }

      setMessages((prev: Message[]) => [
        ...prev,
        {
          id: `${Date.now()}-nira`,
          sender: 'nira',
          text: reply.reply,
          createdAt: new Date().toISOString()
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
        setBackendFollowUpQuestion(null);
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 14 : 0}
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
            className="mx-3 mb-2 mt-5 rounded-3xl border border-white/80 bg-white/80 dark:bg-slate-900/68 p-3"
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
              <View className="items-end">
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
          </View>
        </Animated.View>

        {visibleAlerts.length > 0 && (
          <View className="mx-3 mb-2" style={{ gap: 8 }}>
            {visibleAlerts.slice(0, 2).map((alertItem) => {
              const palette = severityColors(alertItem.severity);
              return (
                <View
                  key={alertItem.id}
                  className="rounded-2xl border px-3 py-2"
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.bg
                  }}
                >
                  <Text
                    className="text-[12px]"
                    style={{ color: palette.text, fontFamily: FONTS.sansBold }}
                  >
                    {alertItem.title}
                  </Text>
                  <Text
                    className="mt-1 text-[12px]"
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
            className="mx-3 mb-2 rounded-2xl border border-borderSoft bg-white/84 dark:bg-slate-900/72 p-3"
            style={UI_SHADOWS.soft}
          >
            <Text
              className="text-[12px] text-textPrimary dark:text-slate-100"
              style={{ fontFamily: FONTS.sansBold }}
            >
              Nearby care options
            </Text>
            <View className="mt-2" style={{ gap: 8 }}>
              {nearbyFacilities.slice(0, 3).map((facility) => (
                <TouchableOpacity
                  key={facility.id}
                  className="rounded-xl border border-borderSoft bg-card dark:bg-slate-900/76 px-3 py-2"
                  onPress={() => {
                    void openFacilityMap(facility);
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
                    className="mt-[2px] text-[11px] text-textMuted dark:text-slate-300"
                    style={{ fontFamily: FONTS.sans }}
                  >
                    {`${facility.facilityType} • ${formatDistance(
                      facility.distanceKm
                    )}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
            className="mx-3 rounded-3xl border border-white/80 bg-white/85 dark:bg-slate-900/72 p-2"
            style={[
              UI_SHADOWS.soft,
              {
                marginBottom:
                  Platform.OS === 'android'
                    ? Math.max(
                        ANDROID_COMPOSER_BASE_GAP,
                        androidKeyboardInset + 8
                      )
                    : 12
              }
            ]}
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
                    : backendFollowUpQuestion
                      ? 'Type your answer...'
                      : 'Describe your symptom to start...'
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

        <Modal
          visible={historyOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setHistoryOpen(false)}
        >
          <View className="flex-1 justify-start bg-black/28 px-4 pt-16">
            <Pressable
              className="absolute inset-0"
              onPress={() => setHistoryOpen(false)}
            />

            <View
              className="max-h-[78%] overflow-hidden rounded-3xl border border-borderSoft bg-white dark:bg-slate-900"
              style={UI_SHADOWS.strong}
            >
              <View className="flex-row items-center justify-between border-b border-borderSoft px-4 py-3">
                <Text
                  className="text-[18px] text-textPrimary dark:text-slate-100"
                  style={{ fontFamily: FONTS.serif, fontWeight: '600' }}
                >
                  Saved chats
                </Text>
                <TouchableOpacity
                  className="h-8 w-8 items-center justify-center rounded-full bg-canvas dark:bg-slate-800"
                  onPress={() => setHistoryOpen(false)}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={18}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <View className="px-4 pb-3 pt-3">
                <TouchableOpacity
                  className="rounded-2xl border border-brandStart/30 bg-brandStart/8 px-3 py-2"
                  onPress={() => {
                    void startFreshChat();
                  }}
                  activeOpacity={0.85}
                >
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons
                      name="plus-circle-outline"
                      size={18}
                      color={COLORS.gradStart}
                    />
                    <Text
                      className="ml-2 text-[12px] text-textPrimary dark:text-slate-100"
                      style={{ fontFamily: FONTS.sansBold }}
                    >
                      Start new chat
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {savedSessions.length === 0 ? (
                <View className="px-4 pb-5 pt-1">
                  <Text
                    className="text-[12px] text-textMuted dark:text-slate-300"
                    style={{ fontFamily: FONTS.sans }}
                  >
                    No saved chats yet. Your conversations will appear here.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={savedSessions}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="mb-2 rounded-2xl border border-borderSoft bg-canvas dark:bg-slate-950/75 px-3 py-3"
                      onPress={() => {
                        void openSavedSession(item.id);
                      }}
                      activeOpacity={0.82}
                    >
                      <Text
                        className="text-[12px] text-textPrimary dark:text-slate-100"
                        style={{ fontFamily: FONTS.sansBold }}
                        numberOfLines={1}
                      >
                        {item.detectedTitle || item.title}
                      </Text>
                      <Text
                        className="mt-[2px] text-[11px] text-textMuted dark:text-slate-300"
                        style={{ fontFamily: FONTS.sans }}
                        numberOfLines={2}
                      >
                        {item.lastMessage || 'Open this conversation'}
                      </Text>
                      <Text
                        className="mt-[3px] text-[10px] text-textHint dark:text-slate-400"
                        style={{ fontFamily: FONTS.sans }}
                      >
                        {formatChatStamp(item.updatedAt)}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}
