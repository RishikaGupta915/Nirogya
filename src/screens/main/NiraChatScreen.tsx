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
  startConversation,
  sendConversationMessage
} from '../../services/aiService';
import { COLORS, FONTS } from '../../constants/theme';
import { UI_SHADOWS } from '../../constants/ui';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';

type Message = { id: string; sender: 'nira' | 'user'; text: string };

export default function NiraChatScreen() {
  const { userProfile, themeMode } = useApp();
  const language = userProfile.language ?? 'en';
  const isDark = themeMode === 'dark';
  const bgGradient = useMemo<[string, string, string]>(
    () => (isDark ? ['#0b1020', '#121a33', '#1a1230'] : ['#f7fbff', '#eef7ff', '#f9f4ff']),
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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [urgentNotice, setUrgentNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const bootstrapConversation = async () => {
      try {
        const started = await startConversation(userProfile, language);
        if (!active) return;
        setConversationId(started.conversationId);
        setMessages([{ id: '1', sender: 'nira', text: started.greeting }]);
      } catch (err) {
        console.warn('[Chat] Failed to start backend conversation', err);
      }
    };

    void bootstrapConversation();

    return () => {
      active = false;
    };
  }, [language, userProfile]);

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
      Alert.alert('Nira Error', e?.message || 'Could not send message.');
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
          <View className="mx-3 mb-3 rounded-3xl border border-white/80 bg-white/85 dark:bg-slate-900/72 p-2" style={UI_SHADOWS.soft}>
            <View className="flex-row items-center">
              <TextInput
                className="mr-2 flex-1 rounded-2xl bg-white/95 dark:bg-slate-900/78 px-4 py-[11px] text-[14px] text-textPrimary dark:text-slate-100"
                style={{ fontFamily: FONTS.sans }}
                value={input}
                onChangeText={setInput}
                placeholder="Type your message to Nira"
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



