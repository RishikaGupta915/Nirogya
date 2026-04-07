// src/services/aiService.ts
// ─────────────────────────────────────────────────────────────
// Primary model: Gemini
// Fallback models: Qwen/Gemma via NVIDIA NIM
// For production, route calls through your own backend to keep
// API keys secret. Never commit real keys to source control.
// ─────────────────────────────────────────────────────────────

import {
  geminiGenerateQuestions,
  geminiGenerateDiagnosis
} from './geminiService';
import { computeFairnessScore } from './fairnessService';
import { translateMany } from './translateService';
import { backendFetch } from './backendApi';
import { Alert } from 'react-native';

const NIM_BASE_URL =
  process.env.EXPO_PUBLIC_NVIDIA_BASE_URL ??
  process.env.NVIDIA_BASE_URL ??
  'https://integrate.api.nvidia.com/v1';

const NIM_API_KEY =
  process.env.EXPO_PUBLIC_NVIDIA_API_KEY ?? process.env.NVIDIA_API_KEY;

const NIM_QUESTION_MODELS = (
  process.env.EXPO_PUBLIC_NVIDIA_FALLBACK_MODELS_QUESTIONS ??
  'qwen/qwen3.5-397b-a17b,google/gemma-3-27b-it'
)
  .split(',')
  .map((m: string) => m.trim())
  .filter(Boolean);

const NIM_DIAGNOSIS_MODELS = (
  process.env.EXPO_PUBLIC_NVIDIA_FALLBACK_MODELS_DIAGNOSIS ??
  'qwen/qwen3.5-397b-a17b,google/gemma-3-27b-it'
)
  .split(',')
  .map((m: string) => m.trim())
  .filter(Boolean);

async function generateViaNimModel(
  prompt: string,
  model: string
): Promise<string> {
  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NIM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 2048
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `NIM ${model} failed (${res.status}): ${body.slice(0, 220)}`
    );
  }

  const payload = await res.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error(`NIM ${model} returned empty content`);
  }

  return content;
}

async function generateWithFallback(
  task: 'questions' | 'diagnosis',
  prompt: string
): Promise<string> {
  try {
    return task === 'questions'
      ? await geminiGenerateQuestions(prompt)
      : await geminiGenerateDiagnosis(prompt);
  } catch (geminiErr) {
    const models =
      task === 'questions' ? NIM_QUESTION_MODELS : NIM_DIAGNOSIS_MODELS;
    if (!NIM_API_KEY || models.length === 0) {
      throw new Error(
        `Primary model failed and fallback is unavailable. Original error: ${String(geminiErr)}`
      );
    }

    let lastErr: unknown = geminiErr;
    for (const model of models) {
      try {
        return await generateViaNimModel(prompt, model);
      } catch (nimErr) {
        lastErr = nimErr;
      }
    }

    throw new Error(
      `Primary and all fallback models failed. Last error: ${String(lastErr)}`
    );
  }
}

function defaultQuestionSet(symptom: string): QuestionSet {
  return {
    questions: [
      {
        id: 'q1',
        text: `Where do you feel ${symptom || 'this symptom'} most strongly?`,
        options: [
          'One clear area',
          'Multiple areas',
          'Moves around',
          'Not sure'
        ]
      },
      {
        id: 'q2',
        text: 'How long have you had this?',
        options: ['Today only', '2-7 days', '1-4 weeks', 'More than a month']
      },
      {
        id: 'q3',
        text: 'How severe is it right now?',
        options: ['Mild', 'Moderate', 'Severe', 'Very severe']
      },
      {
        id: 'q4',
        text: 'Do you notice any trigger?',
        options: ['Food', 'Stress', 'Cycle/hormonal timing', 'No clear trigger']
      },
      {
        id: 'q5',
        text: 'Do you have any red-flag symptoms with this?',
        options: [
          'No',
          'Fever/vomiting',
          'Dizziness/fainting',
          'Chest pain/breathlessness'
        ]
      }
    ]
  };
}

function defaultDiagnosisResult(symptom: string): DiagnosisResult {
  return {
    diagnosis: `Needs further evaluation for ${symptom || 'your symptom'}`,
    description:
      'Based on your responses, this cannot be diagnosed with high confidence right now. Track symptoms and seek in-person assessment if symptoms persist or worsen.',
    riskScore: 45,
    riskLevel: 'medium',
    nextSteps: [
      'Track symptom timing and severity for 3-5 days.',
      'Stay hydrated and avoid known triggers.',
      'Book a doctor visit if not improving within a week.',
      'Seek urgent care if severe red-flag symptoms appear.'
    ],
    seeDoctor: true,
    urgency: 'Within 1 week'
  };
}

export interface QuestionSet {
  questions: {
    id: string;
    text: string;
    options: string[];
  }[];
}

export interface DiagnosisResult {
  diagnosis: string;
  description: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  nextSteps: string[];
  seeDoctor: boolean;
  urgency: string;
}

type BackendQuestionsResponse = {
  questions: QuestionSet['questions'];
  source?: string;
  language?: string;
};

type BackendDiagnosisResponse = {
  assessment: DiagnosisResult & { fairnessScore: number };
  source?: string;
  language?: string;
};

export type ConversationStart = {
  conversationId: string;
  greeting: string;
  language: string;
};

export type ConversationReply = {
  reply: string;
  isUrgent: boolean;
  source?: string;
  conversationId: string;
};

export type VoiceTranscriptionResponse = {
  text: string;
  language: string;
  confidence: number | null;
  source: string;
};

export type ClinicalImageAnalysisResponse = {
  analysis: string;
  followUpQuestion: string;
  warning: string;
  source: string;
};

export type DocumentExtractionResponse = {
  rawText: string;
  extracted: Record<string, any>;
  confidence: number;
  clarificationNeeded: { field: string; question: string }[];
  source: string;
  language: string;
};

export type TriageResponse = {
  triage: 'EMERGENCY' | 'CONSULT' | 'SELF_CARE';
  shouldStop: boolean;
  conditions: any[];
  question: any | null;
  source: string;
};

export type FullPipelineResponse = {
  contextMap: Record<string, any>;
  triage: TriageResponse;
  questions: QuestionSet['questions'];
  assessment: DiagnosisResult & {
    fairnessScore: number;
    fairness: {
      equityScore: number;
      affordability: number;
      accessibility: number;
      relevance: number;
      estimatedCost: number;
      explanation: string;
    };
  };
  riskFlags: {
    condition: string;
    severity: string;
    confidence: number;
    triggerRules: string[];
  }[];
  recommendation: {
    carePathway: string;
    facilityType: string;
    estimatedCostLow: number;
    estimatedCostHigh: number;
    pmjayApplicable: boolean;
  };
  assistantReply: string;
  sources: Record<string, string | undefined>;
};

// ── Generate follow-up questions for a symptom ────────────────
export async function generateQuestions(
  symptom: string,
  userProfile: Record<string, any>,
  language: string = 'en'
): Promise<QuestionSet> {
  try {
    const response = await backendFetch<BackendQuestionsResponse>(
      '/ai/questions',
      {
        method: 'POST',
        body: JSON.stringify({
          symptom,
          profile: userProfile,
          language
        })
      }
    );

    if (Array.isArray(response?.questions) && response.questions.length > 0) {
      return { questions: response.questions };
    }
  } catch (err) {
    console.warn('[Backend AI Questions Error]', err);
  }

  const prompt = `
You are a medical AI assistant specialising in women's health in India.
A user reports: "${symptom}"

User profile:
- Age group: ${userProfile.ageGroup ?? 'unknown'}
- Life stage: ${userProfile.lifeStage ?? 'unknown'}
- Known conditions: ${userProfile.conditions?.join(', ') ?? 'none'}
- Activity level: ${userProfile.activityLevel ?? 'unknown'}

Generate exactly 5 targeted follow-up questions to differentiate between possible conditions.
Each question must have 4 concise answer options.
Focus on Indian women's common health issues: PCOS, anaemia, thyroid, migraine, hypertension.

Respond ONLY with valid JSON in this exact format:
{
  "questions": [
    {
      "id": "q1",
      "text": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"]
    }
  ]
}
`;
  let text;
  try {
    text = await generateWithFallback('questions', prompt);
  } catch (err) {
    console.warn('[AI Questions Fallback Error]', err);
    let questions = defaultQuestionSet(symptom);
    if (language && language !== 'en') {
      const questionTexts = questions.questions.map((q) => q.text);
      const translatedQuestionTexts = await translateMany(
        questionTexts,
        language
      );
      const flatOptions = questions.questions.flatMap((q) => q.options);
      const translatedOptions = await translateMany(flatOptions, language);

      let optionCursor = 0;
      questions.questions.forEach((q, idx) => {
        const originalOptions = q.options;
        q.text = translatedQuestionTexts[idx] ?? q.text;
        q.options = originalOptions.map((originalOpt) => {
          const next = translatedOptions[optionCursor];
          optionCursor += 1;
          return next ?? originalOpt;
        });
      });
    }
    return questions;
  }

  console.log('AI raw response (questions):', text);
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    let questions = JSON.parse(clean) as QuestionSet;
    // Translate questions if needed
    if (language && language !== 'en') {
      const questionTexts = questions.questions.map((q) => q.text);
      const translatedQuestionTexts = await translateMany(
        questionTexts,
        language
      );

      const flatOptions = questions.questions.flatMap((q) => q.options);
      const translatedOptions = await translateMany(flatOptions, language);

      let optionCursor = 0;
      questions.questions.forEach((q, idx) => {
        const originalOptions = q.options;
        q.text = translatedQuestionTexts[idx] ?? q.text;
        q.options = originalOptions.map((originalOpt) => {
          const next = translatedOptions[optionCursor];
          optionCursor += 1;
          return next ?? originalOpt;
        });
      });
    }

    return questions;
  } catch (e) {
    console.log('Gemini parse error (questions):', e, clean);
    Alert.alert('Gemini Error', 'Raw response: ' + text.slice(0, 500));
    throw new Error(
      'Failed to parse questions from AI response. Please try again.'
    );
  }
}

// ── Generate diagnosis from symptom + answers ─────────────────
export async function generateDiagnosis(
  symptom: string,
  answers: Record<string, string>,
  userProfile: Record<string, any>,
  language: string = 'en'
): Promise<DiagnosisResult & { fairnessScore: number }> {
  try {
    const response = await backendFetch<BackendDiagnosisResponse>(
      '/ai/diagnosis',
      {
        method: 'POST',
        body: JSON.stringify({
          symptom,
          answers,
          profile: userProfile,
          language
        })
      }
    );

    if (response?.assessment?.diagnosis) {
      return response.assessment;
    }
  } catch (err) {
    console.warn('[Backend AI Diagnosis Error]', err);
  }

  const answersText = Object.entries(answers)
    .map(([q, a]) => `- ${q}: ${a}`)
    .join('\n');

  const prompt = `
You are a medical AI assistant specialising in Indian women's health.
Symptom: "${symptom}"

User's answers to follow-up questions:
${answersText}

User profile:
- Age: ${userProfile.ageGroup ?? 'unknown'}
- Life stage: ${userProfile.lifeStage ?? 'unknown'}
- Activity level: ${userProfile.activityLevel ?? 'unknown'}
- Diet: ${userProfile.dietType ?? 'unknown'}
- Sleep: ${userProfile.sleepHours ?? 'unknown'} hours
- Stress: ${userProfile.stressLevel ?? 'unknown'}
- Known conditions: ${userProfile.conditions?.join(', ') ?? 'none'}
- Family history: ${userProfile.familyHistory?.join(', ') ?? 'none'}
- Supplements: ${userProfile.supplements?.join(', ') ?? 'none'}

Based on the above, provide a personalised health assessment.
Consider Indian-specific prevalence: anaemia affects ~50% of Indian women, PCOS ~20%, thyroid disorders ~11%.

Respond ONLY with valid JSON:
{
  "diagnosis": "Most likely condition name",
  "description": "2-3 sentence personalised explanation referencing their specific answers",
  "riskScore": 65,
  "riskLevel": "medium",
  "nextSteps": [
    "Specific action step 1",
    "Specific action step 2",
    "Specific action step 3",
    "Specific action step 4"
  ],
  "seeDoctor": true,
  "urgency": "Within 1-2 weeks"
}

riskLevel must be "low", "medium", or "high".
riskScore must be 0-100.
`;
  let text;
  try {
    text = await generateWithFallback('diagnosis', prompt);
  } catch (err) {
    console.warn('[AI Diagnosis Fallback Error]', err);
    let result = defaultDiagnosisResult(symptom);
    if (language && language !== 'en') {
      const toTranslate = [
        result.diagnosis,
        result.description,
        ...result.nextSteps,
        result.urgency
      ];
      const translated = await translateMany(toTranslate, language);
      const stepsCount = result.nextSteps.length;

      result.diagnosis = translated[0] ?? result.diagnosis;
      result.description = translated[1] ?? result.description;
      result.nextSteps = result.nextSteps.map(
        (step, idx) => translated[2 + idx] ?? step
      );
      result.urgency = translated[2 + stepsCount] ?? result.urgency;
    }
    const fairnessScore = computeFairnessScore(userProfile, {
      estimatedCost:
        result.riskLevel === 'high'
          ? 3500
          : result.riskLevel === 'medium'
            ? 1500
            : 500
    });
    return { ...result, fairnessScore };
  }

  console.log('AI raw response (diagnosis):', text);
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    let result = JSON.parse(clean) as DiagnosisResult;
    // Translate output if needed
    if (language && language !== 'en') {
      const toTranslate = [
        result.diagnosis,
        result.description,
        ...result.nextSteps,
        result.urgency
      ];
      const translated = await translateMany(toTranslate, language);
      const stepsCount = result.nextSteps.length;

      result.diagnosis = translated[0] ?? result.diagnosis;
      result.description = translated[1] ?? result.description;
      result.nextSteps = result.nextSteps.map(
        (step, idx) => translated[2 + idx] ?? step
      );
      result.urgency = translated[2 + stepsCount] ?? result.urgency;
    }
    // Compute fairness score
    const fairnessScore = computeFairnessScore(userProfile, {
      estimatedCost:
        result.riskLevel === 'high'
          ? 3500
          : result.riskLevel === 'medium'
            ? 1500
            : 500
    });
    return { ...result, fairnessScore };
  } catch (e) {
    console.log('Gemini parse error (diagnosis):', e, clean);
    Alert.alert('Gemini Error', 'Raw response: ' + text.slice(0, 500));
    throw new Error(
      'Failed to parse diagnosis from AI response. Please try again.'
    );
  }
}

export async function startConversation(
  userProfile: Record<string, any>,
  language: string = 'en'
): Promise<ConversationStart> {
  return backendFetch<ConversationStart>('/ai/conversations/start', {
    method: 'POST',
    body: JSON.stringify({ profile: userProfile, language })
  });
}

export async function sendConversationMessage(
  conversationId: string,
  message: string,
  userProfile: Record<string, any>,
  language: string = 'en'
): Promise<ConversationReply> {
  return backendFetch<ConversationReply>(
    `/ai/conversations/${conversationId}/message`,
    {
      method: 'POST',
      body: JSON.stringify({ message, profile: userProfile, language })
    }
  );
}

export async function transcribeVoice(
  audioBase64: string,
  language: string = 'en',
  mimeType?: string
): Promise<VoiceTranscriptionResponse> {
  return backendFetch<VoiceTranscriptionResponse>('/ai/voice/transcribe', {
    method: 'POST',
    body: JSON.stringify({ audioBase64, language, mimeType })
  });
}

export async function analyzeClinicalImage(
  imageBase64: string,
  userProfile: Record<string, any>,
  language: string = 'en'
): Promise<ClinicalImageAnalysisResponse> {
  return backendFetch<ClinicalImageAnalysisResponse>('/ai/image/analyze', {
    method: 'POST',
    body: JSON.stringify({ imageBase64, profile: userProfile, language })
  });
}

export async function extractMedicalDocument(
  imageBase64: string,
  documentType: string,
  language: string = 'en'
): Promise<DocumentExtractionResponse> {
  return backendFetch<DocumentExtractionResponse>('/ai/documents/extract', {
    method: 'POST',
    body: JSON.stringify({ imageBase64, documentType, language })
  });
}

export async function triageSymptoms(
  symptomText: string,
  profile: Record<string, any>,
  language: string = 'en'
): Promise<TriageResponse> {
  return backendFetch<TriageResponse>('/ai/triage', {
    method: 'POST',
    body: JSON.stringify({
      symptomText,
      sex: profile?.gender,
      age: profile?.age,
      language
    })
  });
}

export async function runFullAiPipeline(
  symptom: string,
  answers: Record<string, string>,
  userProfile: Record<string, any>,
  language: string = 'en',
  history: { role: 'assistant' | 'user'; content: string }[] = []
): Promise<FullPipelineResponse> {
  return backendFetch<FullPipelineResponse>('/ai/pipeline/run', {
    method: 'POST',
    body: JSON.stringify({
      symptom,
      answers,
      profile: userProfile,
      language,
      history
    })
  });
}
