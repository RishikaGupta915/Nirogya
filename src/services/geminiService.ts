// Gemini API integration for React Native/Node.js
// https://ai.google.dev/tutorials/node_quickstart
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

function parseModelList(raw: string | undefined, fallback: string[]) {
  if (!raw) return fallback;
  const parsed = raw
    .split(',')
    .map((m) => m.trim().replace(/^models\//i, ''))
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

const GEMINI_MODELS = parseModelList(
  process.env.EXPO_PUBLIC_GEMINI_MODEL_FALLBACKS ??
    process.env.EXPO_PUBLIC_GEMINI_MODEL,
  [
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite-001',
    'gemma-3-4b-it'
  ]
);

function getGeminiClient() {
  if (!GEMINI_API_KEY || !genAI) {
    throw new Error('Gemini API key missing.');
  }
  return genAI;
}

async function generateWithGeminiFallback(prompt: string): Promise<string> {
  let lastErr: unknown = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = getGeminiClient().getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();
      if (typeof text === 'string' && text.trim()) {
        return text;
      }
      throw new Error(`Model ${modelName} returned empty content.`);
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(
    `All Gemini models failed (${GEMINI_MODELS.join(', ')}). Last error: ${String(lastErr)}`
  );
}

export async function geminiGenerateQuestions(prompt: string) {
  try {
    return await generateWithGeminiFallback(prompt);
  } catch (err: any) {
    let msg = '[Gemini Error] ';
    if (err && err.message) msg += err.message;
    else msg += JSON.stringify(err);
    // Surface error for chat display
    throw new Error(msg);
  }
}

export async function geminiGenerateDiagnosis(prompt: string) {
  try {
    return await generateWithGeminiFallback(prompt);
  } catch (err: any) {
    let msg = '[Gemini Error] ';
    if (err && err.message) msg += err.message;
    else msg += JSON.stringify(err);
    throw new Error(msg);
  }
}
