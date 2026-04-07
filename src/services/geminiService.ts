// Gemini API integration for React Native/Node.js
// https://ai.google.dev/tutorials/node_quickstart
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('Missing env var: EXPO_PUBLIC_GEMINI_API_KEY');
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function geminiGenerateQuestions(prompt: string) {
  try {
    if (!GEMINI_API_KEY) throw new Error('Gemini API key missing.');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
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
    if (!GEMINI_API_KEY) throw new Error('Gemini API key missing.');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (err: any) {
    let msg = '[Gemini Error] ';
    if (err && err.message) msg += err.message;
    else msg += JSON.stringify(err);
    throw new Error(msg);
  }
}
