import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChatHistorySender = 'nira' | 'user';

export type ChatHistoryMessage = {
  id: string;
  sender: ChatHistorySender;
  text: string;
  createdAt: string;
};

export type ChatHistorySession = {
  id: string;
  backendConversationId: string | null;
  title: string;
  detectedTitle: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
  messages: ChatHistoryMessage[];
};

const CHAT_HISTORY_KEY = 'nirogya.chat.history.v1';
const MAX_SESSION_COUNT = 80;
const MAX_MESSAGE_COUNT = 140;
const MAX_MESSAGE_LENGTH = 1400;

function trimText(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

function clipText(value: string, max = MAX_MESSAGE_LENGTH) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 1))}…`;
}

function isSender(value: unknown): value is ChatHistorySender {
  return value === 'nira' || value === 'user';
}

function normalizeMessage(input: any): ChatHistoryMessage | null {
  const id = trimText(input?.id);
  const sender = input?.sender;
  const text = trimText(input?.text);
  const createdAtRaw = trimText(input?.createdAt, new Date().toISOString());

  if (!id || !isSender(sender) || !text) return null;

  const createdAt = Number.isNaN(new Date(createdAtRaw).getTime())
    ? new Date().toISOString()
    : createdAtRaw;

  return {
    id,
    sender,
    text: clipText(text),
    createdAt
  };
}

function normalizeSession(input: any): ChatHistorySession | null {
  const id = trimText(input?.id);
  if (!id) return null;

  const title = trimText(input?.title, 'Nira conversation');
  const detectedTitle = trimText(input?.detectedTitle, title);
  const createdAtRaw = trimText(input?.createdAt, new Date().toISOString());
  const updatedAtRaw = trimText(input?.updatedAt, createdAtRaw);

  const createdAt = Number.isNaN(new Date(createdAtRaw).getTime())
    ? new Date().toISOString()
    : createdAtRaw;
  const updatedAt = Number.isNaN(new Date(updatedAtRaw).getTime())
    ? createdAt
    : updatedAtRaw;

  const backendConversationId = trimText(input?.backendConversationId) || null;
  const messages = Array.isArray(input?.messages)
    ? input.messages
        .map((message: any) => normalizeMessage(message))
        .filter((message: ChatHistoryMessage | null): message is ChatHistoryMessage => Boolean(message))
        .slice(-MAX_MESSAGE_COUNT)
    : [];

  const lastMessage = trimText(input?.lastMessage, messages.at(-1)?.text || '');

  return {
    id,
    backendConversationId,
    title,
    detectedTitle,
    createdAt,
    updatedAt,
    lastMessage: clipText(lastMessage),
    messages
  };
}

async function readAllSessions(): Promise<ChatHistorySession[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeSession(item))
      .filter((item): item is ChatHistorySession => Boolean(item))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  } catch (err) {
    console.warn('[ChatHistory] Failed to read sessions', err);
    return [];
  }
}

async function writeAllSessions(sessions: ChatHistorySession[]) {
  const sorted = [...sessions]
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, MAX_SESSION_COUNT);

  await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(sorted));
}

export function createChatSessionId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function detectConditionTitle(messages: Array<{ sender: ChatHistorySender; text: string }>) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.sender !== 'nira') continue;

    const match = message.text.match(/Likely\s+condition\s*:\s*([^\n]+)/i);
    if (match?.[1]) {
      return trimText(match[1]);
    }
  }

  return null;
}

export function deriveChatTitle(messages: Array<{ sender: ChatHistorySender; text: string }>) {
  const detected = detectConditionTitle(messages);
  if (detected) return detected;

  const firstUserMessage = messages.find((message) => message.sender === 'user');
  if (firstUserMessage?.text) {
    const plain = firstUserMessage.text.trim();
    if (!plain) return 'Nira conversation';
    return plain.length > 58 ? `${plain.slice(0, 57)}…` : plain;
  }

  return 'Nira conversation';
}

export async function listChatSessions(limit = 40): Promise<ChatHistorySession[]> {
  const sessions = await readAllSessions();
  return sessions.slice(0, Math.max(1, limit));
}

export async function getChatSession(sessionId: string): Promise<ChatHistorySession | null> {
  const targetId = trimText(sessionId);
  if (!targetId) return null;

  const sessions = await readAllSessions();
  return sessions.find((session) => session.id === targetId) || null;
}

export async function upsertChatSession(session: ChatHistorySession): Promise<void> {
  const normalized = normalizeSession(session);
  if (!normalized) return;

  const sessions = await readAllSessions();
  const existingIndex = sessions.findIndex((item) => item.id === normalized.id);

  if (existingIndex >= 0) {
    sessions[existingIndex] = {
      ...sessions[existingIndex],
      ...normalized,
      createdAt: sessions[existingIndex].createdAt || normalized.createdAt
    };
  } else {
    sessions.push(normalized);
  }

  await writeAllSessions(sessions);
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const targetId = trimText(sessionId);
  if (!targetId) return;

  const sessions = await readAllSessions();
  const next = sessions.filter((session) => session.id !== targetId);
  await writeAllSessions(next);
}
