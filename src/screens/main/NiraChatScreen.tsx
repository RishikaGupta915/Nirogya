import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { generateQuestions, generateDiagnosis } from '../../services/aiService';
import { translateText } from '../../services/translateService';

type Message = { id: string; sender: 'nira' | 'user'; text: string };

export default function NiraChatScreen() {
  const { userProfile } = useApp();
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
        setMessages((prev) => {
          if (prev.length === 0 || prev[0].sender !== 'nira') return prev;
          return [{ ...prev[0], text: translated }, ...prev.slice(1)];
        });
      })
      .catch(() => {});
  }, [userProfile.language]);

  // Handler for sending a message
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userInput = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userInput
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    if (stage === 'initial') {
      // Treat input as symptom, get questions
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
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + '-nira',
            sender: 'nira',
            text:
              qset.questions[0].text +
              '\n' +
              qset.questions[0].options
                .map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`)
                .join('  ')
          }
        ]);
      } catch (err: any) {
        let errorMsg = 'Sorry, I could not load questions.';
        if (err && typeof err === 'object' && 'message' in err)
          errorMsg += '\n' + err.message;
        else if (typeof err === 'string') errorMsg += '\n' + err;
        else errorMsg += '\nUnknown error.';
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + '-nira-error', sender: 'nira', text: errorMsg }
        ]);
      } finally {
        setLoading(false);
      }
      // (Removed duplicate/erroneous error handler code)
      return;
    }

    if (stage === 'asking' && questions.length > 0) {
      // Store answer
      const q = questions[currentQ];
      setAnswers((prev) => ({ ...prev, [q.id]: input.trim() }));
      // Next question or final
      if (currentQ < questions.length - 1) {
        setCurrentQ(currentQ + 1);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + '-nira',
            sender: 'nira',
            text:
              questions[currentQ + 1].text +
              '\n' +
              questions[currentQ + 1].options
                .map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`)
                .join('  ')
          }
        ]);
      } else {
        // All questions answered, get diagnosis
        setLoading(true);
        try {
          const result = await generateDiagnosis(
            symptomContext || userMsg.text,
            { ...answers, [q.id]: input.trim() },
            userProfile,
            userProfile.language ?? 'en'
          );
          setStage('final');
          setMessages((prev) => [
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
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.message,
              item.sender === 'nira' ? styles.niraMsg : styles.userMsg
            ]}
          >
            <MaterialCommunityIcons
              name={item.sender === 'nira' ? 'robot-excited' : 'account'}
              size={20}
              color="#fff"
            />
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
      {loading && (
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <ActivityIndicator color="#9d4edd" size="large" />
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={
            stage === 'initial'
              ? 'Describe your symptom or question...'
              : 'Type your answer...'
          }
          placeholderTextColor="#aaa"
          editable={!loading && stage !== 'final'}
        />
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={sendMessage}
          disabled={loading || stage === 'final'}
        >
          <MaterialCommunityIcons name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181028' },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 10,
    borderRadius: 16,
    maxWidth: '85%'
  },
  niraMsg: {
    backgroundColor: '#9d4edd',
    alignSelf: 'flex-start'
  },
  userMsg: {
    backgroundColor: '#e879a0',
    alignSelf: 'flex-end'
  },
  msgText: {
    color: '#fff',
    fontSize: 15,
    marginLeft: 8,
    flexShrink: 1
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#333',
    backgroundColor: '#181028'
  },
  input: {
    flex: 1,
    backgroundColor: '#241a36',
    color: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8
  },
  sendBtn: {
    backgroundColor: '#9d4edd',
    borderRadius: 16,
    padding: 10
  }
});
