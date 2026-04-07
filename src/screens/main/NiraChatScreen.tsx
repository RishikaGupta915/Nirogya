import React, { useEffect, useState } from 'react';
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
  Platform,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { generateQuestions, generateDiagnosis } from '../../services/aiService';
import { translateText } from '../../services/translateService';
import { COLORS, FONTS } from '../../constants/theme';
import { UI_SHADOWS } from '../../constants/ui';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';

type Message = { id: string; sender: 'nira' | 'user'; text: string };

export default function NiraChatScreen() {
  const { userProfile } = useApp();
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
  const [questions, setQuestions] = useState<
    { id: string; text: string; options: string[] }[]
  >([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [symptomContext, setSymptomContext] = useState('');
  const [stage, setStage] = useState<'initial' | 'asking' | 'final'>('initial');

  useEffect(() => {
    const language = userProfile.language ?? 'en';
    if (language === 'en') return;

    const baseGreeting =
      'Hi! I am Nira, your AI health assistant. How can I help you today?';

    translateText(baseGreeting, language)
      .then((translated) => {
        setMessages((prev: Message[]) => {
          if (prev.length === 0 || prev[0].sender !== 'nira') return prev;
          return [{ ...prev[0], text: translated }, ...prev.slice(1)];
        });
      })
      .catch(() => {});
  }, [userProfile.language]);

  const sendMessage = async (presetInput?: string) => {
    const userInput = (presetInput ?? input).trim();
    if (!userInput || loading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userInput
    };
    setMessages((prev: Message[]) => [...prev, userMsg]);
    setInput('');

    if (stage === 'initial') {
      setLoading(true);
      try {
        const qset = await generateQuestions(
          userInput,
          userProfile,
          userProfile.language ?? 'en'
        );
        setSymptomContext(userInput);
        setQuestions(qset.questions);
        setCurrentQ(0);
        setStage('asking');
        setMessages((prev: Message[]) => [
          ...prev,
          {
            id: Date.now() + '-nira',
            sender: 'nira',
            text:
              qset.questions[0].text +
              '\n' +
              qset.questions[0].options
                .map((o: string, i: number) => `${String.fromCharCode(65 + i)}. ${o}`)
                .join('  ')
          }
        ]);
      } catch (err: any) {
        let errorMsg = 'Sorry, I could not load questions.';
        if (err && typeof err === 'object' && 'message' in err)
          errorMsg += '\n' + err.message;
        else if (typeof err === 'string') errorMsg += '\n' + err;
        else errorMsg += '\nUnknown error.';
        setMessages((prev: Message[]) => [
          ...prev,
          { id: Date.now() + '-nira-error', sender: 'nira', text: errorMsg }
        ]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (stage === 'asking' && questions.length > 0) {
      const q = questions[currentQ];
      setAnswers((prev: Record<string, string>) => ({ ...prev, [q.id]: userInput }));
      if (currentQ < questions.length - 1) {
        setCurrentQ(currentQ + 1);
        setMessages((prev: Message[]) => [
          ...prev,
          {
            id: Date.now() + '-nira',
            sender: 'nira',
            text:
              questions[currentQ + 1].text +
              '\n' +
              questions[currentQ + 1].options
                .map((o: string, i: number) => `${String.fromCharCode(65 + i)}. ${o}`)
                .join('  ')
          }
        ]);
      } else {
        setLoading(true);
        try {
          const result = await generateDiagnosis(
            symptomContext || userMsg.text,
            { ...answers, [q.id]: userInput },
            userProfile,
            userProfile.language ?? 'en'
          );
          setStage('final');
          setMessages((prev: Message[]) => [
            ...prev,
            {
              id: Date.now() + '-nira',
              sender: 'nira',
              text: 'Thank you for your answers. Here is my assessment:'
            },
            {
              id: Date.now() + '-nira2',
              sender: 'nira',
              text:
                result.description +
                '\n\nRecommendation: ' +
                result.diagnosis +
                '\nNext Steps: ' +
                result.nextSteps.join('; ')
            }
          ]);
        } catch (e: any) {
          Alert.alert(
            'Nira Error',
            e.message || 'Could not generate diagnosis.'
          );
        } finally {
          setLoading(false);
        }
      }
      return;
    }
  };

  return (
    <View className="flex-1 bg-canvas">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={['#f7fbff', '#eef7ff', '#f9f4ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="absolute inset-0"
        />

        <View className="absolute -left-16 top-12 h-40 w-40 rounded-full bg-brandStart/12" />
        <View className="absolute -right-12 top-40 h-32 w-32 rounded-full bg-skySoft/35" />

        <Animated.View style={headerAnim}>
          <View className="mx-3 mb-2 mt-3 rounded-3xl border border-white/80 bg-white/80 p-3" style={UI_SHADOWS.soft}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brandStart/15">
                  <MaterialCommunityIcons name="robot-excited-outline" size={24} color={COLORS.gradStart} />
                </View>
                <View className="ml-3">
                  <Text className="text-[26px] text-textPrimary" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
                    Nira Live
                  </Text>
                  <Text className="text-[12px] leading-[18px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
                    Talk naturally. I will guide your assessment.
                  </Text>
                </View>
              </View>
              <View className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1">
                <Text className="text-[10px] uppercase tracking-[1.1px] text-emerald-700" style={{ fontFamily: FONTS.sansBold }}>
                  Online
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View className="mx-3 mb-2 flex-1 rounded-3xl border border-white/80 bg-white/60" style={[UI_SHADOWS.soft, listAnim]}>
          <FlatList
            data={messages}
            keyExtractor={(item: Message) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }: { item: Message }) => (
              <View className={`mb-3 ${item.sender === 'nira' ? 'items-start' : 'items-end'}`}>
                <View className={`max-w-[92%] flex-row items-end ${item.sender === 'nira' ? '' : 'flex-row-reverse'}`}>
                  <View
                    className={`h-[28px] w-[28px] items-center justify-center rounded-full ${item.sender === 'nira' ? 'mr-2 bg-brandStart/12' : 'ml-2 bg-brandEnd/14'}`}
                  >
                    <MaterialCommunityIcons
                      name={item.sender === 'nira' ? 'robot-excited' : 'account'}
                      size={16}
                      color={item.sender === 'nira' ? COLORS.gradStart : COLORS.gradEnd}
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
                      className="shrink text-[14px] leading-[21px] text-textPrimary"
                      style={{ fontFamily: FONTS.sans }}
                    >
                      {item.text}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 }}
          />

          {loading && (
            <View className="mx-3 mb-3 flex-row items-center self-start rounded-2xl border border-borderSoft bg-white/90 px-3 py-2" style={UI_SHADOWS.soft}>
              <ActivityIndicator color={COLORS.gradStart} size="small" />
              <Text className="ml-2 text-[12px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
                Nira is thinking...
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.View style={composerAnim}>
          <View className="mx-3 mb-3 rounded-3xl border border-white/80 bg-white/85 p-2" style={UI_SHADOWS.soft}>
            {stage === 'asking' && questions[currentQ]?.options?.length > 0 && !loading && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-2"
                contentContainerStyle={{ paddingHorizontal: 2 }}
              >
                {questions[currentQ].options.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      void sendMessage(option);
                    }}
                    className="mr-2 rounded-full border border-brandStart/25 bg-brandStart/10 px-3 py-2"
                  >
                    <Text className="text-[12px] text-brandStart" style={{ fontFamily: FONTS.sansBold }}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View className="flex-row items-center">
              <TextInput
                className="mr-2 flex-1 rounded-2xl border border-borderSoft bg-white/95 px-4 py-[11px] text-[14px] text-textPrimary"
                style={{ fontFamily: FONTS.sans }}
                value={input}
                onChangeText={setInput}
                placeholder={
                  stage === 'initial'
                    ? 'Describe your symptom or question...'
                    : 'Type your answer...'
                }
                placeholderTextColor={COLORS.textHint}
                editable={!loading && stage !== 'final'}
              />
              <TouchableOpacity
                className="overflow-hidden rounded-2xl"
                style={UI_SHADOWS.brandGlow}
                onPress={() => {
                  void sendMessage();
                }}
                disabled={loading || stage === 'final'}
              >
                <LinearGradient
                  colors={
                    loading || stage === 'final'
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