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

const NIM_BASE_URL =
  process.env.EXPO_PUBLIC_NVIDIA_BASE_URL ??
  process.env.NVIDIA_BASE_URL ??
  'https://integrate.api.nvidia.com/v1';

const NIM_API_KEY =
  process.env.EXPO_PUBLIC_NVIDIA_API_KEY ?? process.env.NVIDIA_API_KEY;

// Leave empty by default to avoid unwanted fallbacks; set explicit models via env to enable.
const NIM_QUESTION_MODELS = (
  process.env.EXPO_PUBLIC_NVIDIA_FALLBACK_MODELS_QUESTIONS ?? ''
)
  .split(',')
  .map((m: string) => m.trim())
  .filter(Boolean);

const NIM_DIAGNOSIS_MODELS = (
  process.env.EXPO_PUBLIC_NVIDIA_FALLBACK_MODELS_DIAGNOSIS ?? ''
)
  .split(',')
  .map((m: string) => m.trim())
  .filter(Boolean);

const warningKeys = new Set<string>();
let nimAuthorizationFailed = false;

function warnOnce(key: string, ...args: any[]) {
  if (warningKeys.has(key)) return;
  warningKeys.add(key);
  console.warn(...args);
}

function logAiError(stage: string, error: unknown, meta?: Record<string, any>) {
  const message = String((error as any)?.message ?? error);
  console.error(`[AI][${stage}] ${message}`, meta ?? {});
}

function isLikelyNetworkFailure(err: unknown) {
  const message = String((err as any)?.message ?? err);
  return /(cannot reach backend api|network request failed|failed to fetch|econnrefused|enotfound|timed out|load failed)/i.test(
    message
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

type SymptomDomain =
  | 'menstrual'
  | 'hormonal'
  | 'urinary'
  | 'headache'
  | 'digestive'
  | 'general';

type DifferentialItem = {
  condition: string;
  probability: number;
  rationale: string;
};

type ConditionRule = {
  condition: string;
  keywords: RegExp[];
  answerSignals: RegExp[];
  rationale: string;
  nextSteps: string[];
  riskBias: number;
};

type RuleDiagnosis = DiagnosisResult & {
  confidence: number;
  differential: DifferentialItem[];
  redFlags: string[];
  tieBreakerQuestion: string | null;
};

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function normalizeQuestionSet(
  maybeQuestions: unknown,
  symptom: string
): QuestionSet {
  if (!Array.isArray(maybeQuestions)) {
    return defaultQuestionSet(symptom);
  }

  const normalized = maybeQuestions
    .map((item: any, idx: number) => {
      const text =
        typeof item?.text === 'string' && item.text.trim()
          ? item.text.trim()
          : null;
      const options = toStringArray(item?.options).slice(0, 6);

      if (!text || options.length === 0) return null;

      return {
        id:
          typeof item?.id === 'string' && item.id.trim()
            ? item.id.trim()
            : `q${idx + 1}`,
        text,
        options
      };
    })
    .filter(Boolean) as QuestionSet['questions'];

  if (normalized.length === 0) {
    return defaultQuestionSet(symptom);
  }

  return { questions: normalized };
}

const CONDITION_RULES: ConditionRule[] = [
  {
    condition: 'Iron Deficiency Anemia',
    keywords: [
      /fatigue|tired|weak|low energy/i,
      /dizz|light[-\s]?headed|faint/i,
      /heavy\s*(period|bleed|flow)/i,
      /pale|breathless|shortness\s+of\s+breath/i
    ],
    answerSignals: [/hair\s*fall/i, /craving\s*ice/i, /palpitations?/i],
    rationale:
      'Fatigue, dizziness, breathlessness, and heavy periods together often indicate low hemoglobin.',
    nextSteps: [
      'Get CBC and serum ferritin tests within 3-5 days.',
      'Increase iron-rich foods (lentils, leafy greens, jaggery) with vitamin C.',
      'Avoid tea/coffee within 1 hour of iron-rich meals.'
    ],
    riskBias: 10
  },
  {
    condition: 'PCOS Pattern',
    keywords: [
      /irregular\s*(period|cycle)|missed\s*period/i,
      /acne|pimples/i,
      /weight\s*gain|belly\s*fat/i,
      /facial\s*hair|chin\s*hair|hirsutism/i
    ],
    answerSignals: [/insulin|sugar|cravings?/i, /family\s*history\s*pcos/i],
    rationale:
      'Cycle irregularity with acne/weight gain and androgen signs is strongly suggestive of a PCOS pattern.',
    nextSteps: [
      'Track menstrual cycle dates for the next 2 months.',
      'Check fasting glucose, HbA1c, and thyroid profile.',
      'Consult a gynecologist/endocrinologist for hormonal evaluation.'
    ],
    riskBias: 8
  },
  {
    condition: 'Thyroid Dysfunction Pattern',
    keywords: [
      /thyroid|tsh/i,
      /cold\s*intolerance|always\s*cold/i,
      /constipation|dry\s*skin/i,
      /weight\s*gain|hair\s*fall|fatigue/i
    ],
    answerSignals: [
      /slow\s*heart\s*rate|puffy/i,
      /family\s*history\s*thyroid/i
    ],
    rationale:
      'Persistent fatigue with weight, skin, and bowel changes can indicate thyroid imbalance.',
    nextSteps: [
      'Get TSH, Free T4, and CBC tests.',
      'Maintain regular sleep and stress control routines.',
      'Review results with a physician before self-medicating.'
    ],
    riskBias: 7
  },
  {
    condition: 'Migraine Pattern',
    keywords: [
      /headache|migraine/i,
      /light\s*sensitive|sound\s*sensitive|photophobia/i,
      /one[-\s]?side(d)?\s*head/i,
      /nausea|vomit/i
    ],
    answerSignals: [
      /aura|visual\s*disturbance/i,
      /period\s*related\s*headache/i
    ],
    rationale:
      'One-sided headaches with light sensitivity and nausea are classic migraine features.',
    nextSteps: [
      'Hydrate, rest in a dark quiet room, and avoid known triggers.',
      'Maintain a headache diary including sleep, stress, and cycle timing.',
      'Seek medical review if headaches are frequent or worsening.'
    ],
    riskBias: 6
  },
  {
    condition: 'Urinary Tract Infection Pattern',
    keywords: [
      /burn(ing)?\s*(pee|urinat)/i,
      /frequent\s*urination|urgen(t|cy)/i,
      /lower\s*abdomen\s*pain|pelvic\s*pain/i,
      /foul\s*smell\s*urine|cloudy\s*urine/i
    ],
    answerSignals: [/fever/i, /back\s*pain|flank\s*pain/i],
    rationale:
      'Burning urination with urgency/frequency is most consistent with UTI.',
    nextSteps: [
      'Increase fluid intake and avoid delaying urination.',
      'Get a urine routine and culture test.',
      'Consult a doctor promptly for targeted treatment.'
    ],
    riskBias: 9
  },
  {
    condition: 'Acid Reflux / Gastritis Pattern',
    keywords: [
      /acidity|heartburn|acid\s*reflux/i,
      /bloating|gas/i,
      /upper\s*abdomen\s*pain|epigastric/i,
      /after\s*spicy\s*food|after\s*meal/i
    ],
    answerSignals: [/sour\s*taste|belching/i, /night\s*symptoms/i],
    rationale:
      'Meal-related burning and bloating usually suggest reflux/gastritis rather than a severe systemic cause.',
    nextSteps: [
      'Avoid spicy/oily meals and late-night eating for 1 week.',
      'Eat smaller frequent meals and stay hydrated.',
      'Consult a doctor if pain persists or worsens.'
    ],
    riskBias: 4
  },
  {
    condition: 'Stress / Anxiety Related Somatic Pattern',
    keywords: [
      /anxiety|stress|panic/i,
      /poor\s*sleep|insomnia/i,
      /palpitations|racing\s*heart/i,
      /restless|overthinking/i
    ],
    answerSignals: [/work\s*stress|exam\s*stress/i, /no\s*fever|no\s*pain/i],
    rationale:
      'Stress-associated physical symptoms can mimic medical illness and should be differentiated carefully.',
    nextSteps: [
      'Practice breathing exercises and sleep hygiene tonight.',
      'Reduce caffeine and maintain hydration.',
      'Seek counseling/doctor support if symptoms persist.'
    ],
    riskBias: 5
  }
];

const RED_FLAG_RULES: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern:
      /chest\s*pain|crushing\s*pain|cannot\s*breathe|severe\s*breathless/i,
    message:
      'Severe chest pain or breathing difficulty needs emergency care immediately.'
  },
  {
    pattern: /faint(ed|ing)?|unconscious|passed\s*out|seizure/i,
    message:
      'Fainting, unconsciousness, or seizures require urgent emergency evaluation.'
  },
  {
    pattern:
      /very\s*heavy\s*bleeding|soaking\s*pad\s*every\s*hour|blood\s*clots\s*large/i,
    message:
      'Very heavy bleeding can be dangerous and should be evaluated urgently.'
  },
  {
    pattern: /one\s*side\s*weakness|slurred\s*speech|face\s*droop/i,
    message: 'Possible stroke warning signs. Seek emergency care now.'
  }
];

const TIE_BREAKER_MAP: Record<string, string> = {
  'Iron Deficiency Anemia|Thyroid Dysfunction Pattern':
    'Do you also feel unusually cold with constipation and dry skin most days?',
  'PCOS Pattern|Thyroid Dysfunction Pattern':
    'Have your periods become irregular along with clear weight gain or acne/facial hair changes?',
  'Migraine Pattern|Stress / Anxiety Related Somatic Pattern':
    'During headaches, do you get strong light/sound sensitivity or nausea?',
  'Urinary Tract Infection Pattern|Acid Reflux / Gastritis Pattern':
    'Is burning mainly during urination rather than in the chest/upper abdomen after meals?'
};

function getPairKey(a?: string, b?: string) {
  if (!a || !b) return '';
  return [a, b].sort().join('|');
}

function detectSymptomDomain(symptom: string): SymptomDomain {
  const s = symptom.toLowerCase();
  if (/period|menstrual|bleed|cramp|pelvic|cycle/.test(s)) return 'menstrual';
  if (/pcos|hormone|thyroid|acne|weight/.test(s)) return 'hormonal';
  if (/urine|pee|burning|uti|frequency/.test(s)) return 'urinary';
  if (/headache|migraine|head\s*pain/.test(s)) return 'headache';
  if (/acidity|gas|bloating|stomach|abdomen|reflux/.test(s)) return 'digestive';
  return 'general';
}

function defaultQuestionSet(symptom: string): QuestionSet {
  const domain = detectSymptomDomain(symptom);

  const bank: Record<SymptomDomain, QuestionSet['questions']> = {
    menstrual: [
      {
        id: 'q1',
        text: 'How would you describe your period flow right now?',
        options: ['Light', 'Normal', 'Heavy', 'Very heavy with clots']
      },
      {
        id: 'q2',
        text: 'How regular are your menstrual cycles?',
        options: [
          'Regular',
          'Slightly irregular',
          'Often irregular',
          'Missed cycles'
        ]
      },
      {
        id: 'q3',
        text: 'How severe is the pain/cramping?',
        options: ['Mild', 'Moderate', 'Severe', 'Unbearable']
      },
      {
        id: 'q4',
        text: 'Do you also feel dizziness or unusual fatigue?',
        options: ['No', 'Sometimes', 'Often', 'Almost always']
      },
      {
        id: 'q5',
        text: 'Any urgent warning signs?',
        options: [
          'None',
          'Soaking pads quickly',
          'Fainting/near-fainting',
          'Severe one-sided pain'
        ]
      }
    ],
    hormonal: [
      {
        id: 'q1',
        text: 'How have your cycles changed recently?',
        options: ['No change', 'Delayed often', 'Missed cycles', 'Too frequent']
      },
      {
        id: 'q2',
        text: 'Any skin/hair changes?',
        options: ['None', 'More acne', 'Hair fall', 'Facial hair growth']
      },
      {
        id: 'q3',
        text: 'Weight trend in the last 3 months?',
        options: ['Stable', 'Slight gain', 'Clear gain', 'Clear loss']
      },
      {
        id: 'q4',
        text: 'Any thyroid-like symptoms?',
        options: ['None', 'Cold intolerance', 'Constipation', 'Both']
      },
      {
        id: 'q5',
        text: 'Any family history of hormonal disorders?',
        options: ['No', 'PCOS', 'Thyroid', 'Not sure']
      }
    ],
    urinary: [
      {
        id: 'q1',
        text: 'Do you feel burning while urinating?',
        options: ['No', 'Mild', 'Moderate', 'Severe']
      },
      {
        id: 'q2',
        text: 'How frequent is urination?',
        options: [
          'Normal',
          'Slightly increased',
          'Clearly frequent',
          'Very frequent'
        ]
      },
      {
        id: 'q3',
        text: 'Any associated fever or chills?',
        options: ['No', 'Low fever', 'High fever', 'Not sure']
      },
      {
        id: 'q4',
        text: 'Any lower abdominal/back pain?',
        options: ['No', 'Lower abdomen', 'Back/flank', 'Both']
      },
      {
        id: 'q5',
        text: 'How long have these urinary symptoms lasted?',
        options: ['Today only', '2-3 days', '4-7 days', 'More than a week']
      }
    ],
    headache: [
      {
        id: 'q1',
        text: 'Where is your headache strongest?',
        options: ['Whole head', 'One side', 'Forehead/sinus', 'Back of head']
      },
      {
        id: 'q2',
        text: 'How severe is it?',
        options: ['Mild', 'Moderate', 'Severe', 'Worst ever']
      },
      {
        id: 'q3',
        text: 'Any light/sound sensitivity?',
        options: ['No', 'Light only', 'Sound only', 'Both']
      },
      {
        id: 'q4',
        text: 'Any nausea or vomiting?',
        options: ['No', 'Nausea only', 'Vomiting once', 'Repeated vomiting']
      },
      {
        id: 'q5',
        text: 'Any red flags with headache?',
        options: [
          'None',
          'Sudden thunderclap pain',
          'Weakness/slurred speech',
          'Fainting/confusion'
        ]
      }
    ],
    digestive: [
      {
        id: 'q1',
        text: 'When is the discomfort worst?',
        options: [
          'After spicy food',
          'On empty stomach',
          'At night',
          'No pattern'
        ]
      },
      {
        id: 'q2',
        text: 'Main symptom type?',
        options: ['Burning', 'Bloating', 'Cramping', 'Nausea']
      },
      {
        id: 'q3',
        text: 'Any vomiting or black stools?',
        options: ['No', 'Vomiting only', 'Dark stools', 'Both']
      },
      {
        id: 'q4',
        text: 'How severe is your pain?',
        options: ['Mild', 'Moderate', 'Severe', 'Very severe']
      },
      {
        id: 'q5',
        text: 'How long have these symptoms lasted?',
        options: ['Today only', '2-7 days', '1-4 weeks', 'More than a month']
      }
    ],
    general: [
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

  return { questions: bank[domain] };
}

function buildRuleBasedDiagnosis(
  symptom: string,
  answers: Record<string, string>,
  userProfile: Record<string, any>
): RuleDiagnosis {
  const answersBlob = Object.values(answers).join(' ');
  const combinedText = `${symptom} ${answersBlob}`.toLowerCase();

  const ranked = CONDITION_RULES.map((rule) => {
    let score = 20;

    for (const pattern of rule.keywords) {
      if (pattern.test(combinedText)) score += 12;
    }

    for (const pattern of rule.answerSignals) {
      if (pattern.test(combinedText)) score += 8;
    }

    return { rule, score: clamp(score, 0, 100) };
  }).sort((a, b) => b.score - a.score);

  const top = ranked.slice(0, 3);
  const total = top.reduce((sum, item) => sum + item.score, 0) || 1;
  const differential: DifferentialItem[] = top.map((item) => ({
    condition: item.rule.condition,
    probability: clamp(Math.round((item.score / total) * 100), 1, 99),
    rationale: item.rule.rationale
  }));

  const primary = top[0];
  const second = top[1];
  const gap =
    primary && second ? primary.score - second.score : primary?.score || 0;
  const confidence = clamp(
    Math.round(50 + gap * 4 + (primary?.score || 0) * 0.2),
    40,
    95
  );

  const redFlags = RED_FLAG_RULES.filter((entry) =>
    entry.pattern.test(combinedText)
  ).map((entry) => entry.message);

  let riskScore = clamp(
    Math.round(
      (differential[0]?.probability || 45) * 0.8 +
        (primary?.rule.riskBias || 5) * 2
    ),
    25,
    95
  );

  if (redFlags.length) riskScore = Math.max(riskScore, 88);

  const riskLevel: DiagnosisResult['riskLevel'] =
    redFlags.length > 0 || riskScore >= 75
      ? 'high'
      : riskScore >= 45
        ? 'medium'
        : 'low';

  const tieBreakerQuestion =
    !redFlags.length && confidence < 68 && differential.length > 1
      ? TIE_BREAKER_MAP[
          getPairKey(differential[0]?.condition, differential[1]?.condition)
        ] ||
        `To improve accuracy, what is the single strongest symptom now: pain, bleeding, urinary burning, fatigue, or headache?`
      : null;

  const seeDoctor = redFlags.length > 0 || riskLevel !== 'low';
  const urgency = redFlags.length
    ? 'Seek emergency care now'
    : riskLevel === 'high'
      ? 'Within 24 hours'
      : riskLevel === 'medium'
        ? 'Within 3-7 days'
        : 'Monitor for 48 hours';

  const baseSteps = primary?.rule.nextSteps || [
    'Track symptoms for 24-48 hours.',
    'Stay hydrated and avoid known triggers.',
    'Consult a doctor if symptoms persist.'
  ];

  const nextSteps = redFlags.length
    ? [
        'Call emergency services (108) or go to nearest emergency facility now.',
        'Do not delay care if symptoms worsen.',
        'Carry prior reports/medications if available.'
      ]
    : baseSteps;

  return {
    diagnosis:
      primary?.rule.condition ||
      `Needs further evaluation for ${symptom || 'your symptom'}`,
    description:
      `Most signals point to ${primary?.rule.condition || 'a moderate-risk pattern'}. ` +
      `${primary?.rule.rationale || 'Further assessment is required to confirm.'}`,
    riskScore,
    riskLevel,
    nextSteps,
    seeDoctor,
    urgency,
    confidence,
    differential,
    redFlags,
    tieBreakerQuestion
  };
}

function normalizeDiagnosisResult(
  input: any,
  symptom: string,
  answers: Record<string, string>,
  userProfile: Record<string, any>
): RuleDiagnosis {
  const fallback = buildRuleBasedDiagnosis(symptom, answers, userProfile);
  if (!input || typeof input !== 'object') return fallback;

  const riskScore =
    typeof input.riskScore === 'number'
      ? clamp(Math.round(input.riskScore), 0, 100)
      : fallback.riskScore;

  const riskLevel: DiagnosisResult['riskLevel'] =
    input.riskLevel === 'low' ||
    input.riskLevel === 'medium' ||
    input.riskLevel === 'high'
      ? input.riskLevel
      : fallback.riskLevel;

  const nextSteps = Array.isArray(input.nextSteps)
    ? input.nextSteps
        .filter(
          (s: unknown): s is string =>
            typeof s === 'string' && s.trim().length > 0
        )
        .slice(0, 6)
    : fallback.nextSteps;

  const differential = Array.isArray(input.differential)
    ? input.differential
        .map((d: any) => ({
          condition: typeof d?.condition === 'string' ? d.condition : '',
          probability:
            typeof d?.probability === 'number'
              ? clamp(Math.round(d.probability), 1, 99)
              : 0,
          rationale: typeof d?.rationale === 'string' ? d.rationale : ''
        }))
        .filter((d: DifferentialItem) => d.condition)
        .slice(0, 3)
    : fallback.differential;

  return {
    diagnosis:
      typeof input.diagnosis === 'string' && input.diagnosis.trim()
        ? input.diagnosis.trim()
        : fallback.diagnosis,
    description:
      typeof input.description === 'string' && input.description.trim()
        ? input.description.trim()
        : fallback.description,
    riskScore,
    riskLevel,
    nextSteps,
    seeDoctor:
      typeof input.seeDoctor === 'boolean'
        ? input.seeDoctor
        : fallback.seeDoctor,
    urgency:
      typeof input.urgency === 'string' && input.urgency.trim()
        ? input.urgency.trim()
        : fallback.urgency,
    confidence:
      typeof input.confidence === 'number'
        ? clamp(Math.round(input.confidence), 1, 100)
        : fallback.confidence,
    differential,
    redFlags: Array.isArray(input.redFlags)
      ? input.redFlags.filter(
          (f: unknown): f is string =>
            typeof f === 'string' && f.trim().length > 0
        )
      : fallback.redFlags,
    tieBreakerQuestion:
      typeof input.tieBreakerQuestion === 'string' &&
      input.tieBreakerQuestion.trim()
        ? input.tieBreakerQuestion.trim()
        : fallback.tieBreakerQuestion
  };
}

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
    if (res.status === 401 || res.status === 403) {
      nimAuthorizationFailed = true;
    }
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
    // If no NIM fallback configured, surface the Gemini error to caller (will trigger local default fallback)
    if (!NIM_API_KEY || models.length === 0 || nimAuthorizationFailed) {
      throw geminiErr;
    }

    let lastErr: unknown = geminiErr;
    for (const model of models) {
      try {
        return await generateViaNimModel(prompt, model);
      } catch (nimErr) {
        lastErr = nimErr;
        if (nimAuthorizationFailed) {
          break;
        }
      }
    }

    throw lastErr;
  }
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
  confidence?: number;
  differential?: {
    condition: string;
    probability: number;
    rationale: string;
  }[];
  redFlags?: string[];
  tieBreakerQuestion?: string | null;
}

type BackendQuestionsResponse = {
  questions: QuestionSet['questions'];
  source?: string;
  language?: string;
};

type BackendDiagnosisResponse = {
  assessment: DiagnosisResult & { fairnessScore: number };
  recommendation?: {
    carePathway: string;
    facilityType: string;
    estimatedCostLow: number;
    estimatedCostHigh: number;
    pmjayApplicable: boolean;
  };
  alerts?: AlertItem[];
  nearbyFacilities?: NearbyFacility[];
  source?: string;
  language?: string;
};

export type ConversationStart = {
  conversationId: string;
  greeting: string;
  language: string;
};

export type AlertItem = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action?: string | null;
};

export type NearbyFacility = {
  id: string;
  name: string;
  facilityType: string;
  distanceKm: number | null;
  address: string;
  contact: string | null;
  mapUrl: string;
  source?: string;
};

export type FollowUpQuestion = {
  id: string;
  text: string;
  options: string[];
  index: number;
  total: number;
};

export type ConversationReply = {
  reply: string;
  isUrgent: boolean;
  source?: string;
  conversationId: string;
  followUpQuestion?: FollowUpQuestion | null;
  alerts?: AlertItem[];
  nearbyFacilities?: NearbyFacility[];
  recommendation?: {
    carePathway: string;
    facilityType: string;
    estimatedCostLow: number;
    estimatedCostHigh: number;
    pmjayApplicable: boolean;
  };
  assessment?: (DiagnosisResult & { fairnessScore?: number }) | null;
  riskFlags?: {
    condition: string;
    severity: string;
    confidence: number;
    triggerRules: string[];
  }[];
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
  alerts?: AlertItem[];
  nearbyFacilities?: NearbyFacility[];
  assistantReply: string;
  sources: Record<string, string | undefined>;
};

export type NearbyFacilitiesLookupResponse = {
  location: string | null;
  riskLevel: 'low' | 'medium' | 'high';
  nearbyFacilities: NearbyFacility[];
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
      return normalizeQuestionSet(response.questions, symptom);
    }
  } catch (err) {
    logAiError('questions-backend', err, { symptom, language });
    if (isLikelyNetworkFailure(err)) {
      warnOnce(
        'backend-ai-questions-network',
        '[Backend AI Questions] Backend unavailable. Using on-device fallback.'
      );
    } else {
      warnOnce(
        'backend-ai-questions-error',
        '[Backend AI Questions Error]',
        err
      );
    }
  }

  const prompt = `
You are a medical AI assistant specialising in women's health in India.
A user reports: "${symptom}"

User profile:
- Age group: ${userProfile.ageGroup ?? 'unknown'}
- Life stage: ${userProfile.lifeStage ?? 'unknown'}
- Known conditions: ${toStringArray(userProfile.conditions).join(', ') || 'none'}
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
    logAiError('questions-model', err, { symptom, language });
    warnOnce(
      'ai-questions-fallback',
      '[AI Questions] Model providers unavailable. Using local fallback questions.'
    );
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
    let questions = normalizeQuestionSet(
      (JSON.parse(clean) as any)?.questions,
      symptom
    );
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
    logAiError('questions-parse', e, {
      symptom,
      language,
      rawPreview: clean.slice(0, 280)
    });
    warnOnce(
      'ai-questions-parse',
      '[AI Questions] Invalid model JSON. Using local fallback questions.'
    );
    return defaultQuestionSet(symptom);
  }
}

// ── Generate diagnosis from symptom + answers ─────────────────
export async function generateDiagnosis(
  symptom: string,
  answers: Record<string, string>,
  userProfile: Record<string, any>,
  language: string = 'en'
): Promise<DiagnosisResult & { fairnessScore: number }> {
  const translateDiagnosisResult = async (
    input: RuleDiagnosis
  ): Promise<RuleDiagnosis> => {
    if (!language || language === 'en') return input;

    const baseTexts = [
      input.diagnosis,
      input.description,
      ...input.nextSteps,
      input.urgency,
      ...(input.redFlags || []),
      ...(input.differential || []).map((d) => d.rationale),
      input.tieBreakerQuestion || ''
    ];

    const translated = await translateMany(baseTexts, language);

    const nextStepsStart = 2;
    const urgencyIndex = nextStepsStart + input.nextSteps.length;
    const redFlagsStart = urgencyIndex + 1;
    const redFlagsEnd = redFlagsStart + (input.redFlags?.length || 0);
    const differentialStart = redFlagsEnd;
    const differentialEnd =
      differentialStart + (input.differential?.length || 0);
    const tieBreakerIndex = differentialEnd;

    const redFlags = (input.redFlags || []).map(
      (flag, idx) => translated[redFlagsStart + idx] || flag
    );

    const differential = (input.differential || []).map((item, idx) => ({
      ...item,
      rationale: translated[differentialStart + idx] || item.rationale
    }));

    return {
      ...input,
      diagnosis: translated[0] || input.diagnosis,
      description: translated[1] || input.description,
      nextSteps: input.nextSteps.map(
        (step, idx) => translated[nextStepsStart + idx] || step
      ),
      urgency: translated[urgencyIndex] || input.urgency,
      redFlags,
      differential,
      tieBreakerQuestion: input.tieBreakerQuestion
        ? translated[tieBreakerIndex] || input.tieBreakerQuestion
        : null
    };
  };

  const withFairness = (result: RuleDiagnosis) => {
    const fairnessScore = computeFairnessScore(userProfile, {
      estimatedCost:
        result.riskLevel === 'high'
          ? 3500
          : result.riskLevel === 'medium'
            ? 1500
            : 500
    });

    return { ...result, fairnessScore };
  };

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
    logAiError('diagnosis-backend', err, { symptom, language });
    if (isLikelyNetworkFailure(err)) {
      warnOnce(
        'backend-ai-diagnosis-network',
        '[Backend AI Diagnosis] Backend unavailable. Using on-device fallback.'
      );
    } else {
      warnOnce(
        'backend-ai-diagnosis-error',
        '[Backend AI Diagnosis Error]',
        err
      );
    }
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
- Known conditions: ${toStringArray(userProfile.conditions).join(', ') || 'none'}
- Family history: ${toStringArray(userProfile.familyHistory).join(', ') || 'none'}
- Supplements: ${toStringArray(userProfile.supplements).join(', ') || 'none'}

Based on the above, provide a personalised health assessment.
Consider Indian-specific prevalence: anaemia affects ~50% of Indian women, PCOS ~20%, thyroid disorders ~11%.

Respond ONLY with valid JSON:
{
  "diagnosis": "Most likely condition name",
  "description": "2-3 sentence personalised explanation referencing their specific answers",
  "riskScore": 65,
  "confidence": 72,
  "riskLevel": "medium",
  "nextSteps": [
    "Specific action step 1",
    "Specific action step 2",
    "Specific action step 3",
    "Specific action step 4"
  ],
  "differential": [
    { "condition": "Condition A", "probability": 55, "rationale": "Why this fits" },
    { "condition": "Condition B", "probability": 30, "rationale": "Why this is possible" },
    { "condition": "Condition C", "probability": 15, "rationale": "Why this is less likely" }
  ],
  "redFlags": ["Any urgent warning sign if present"],
  "tieBreakerQuestion": "A single most useful question if confidence is < 68, otherwise null",
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
    logAiError('diagnosis-model', err, { symptom, language });
    warnOnce(
      'ai-diagnosis-fallback',
      '[AI Diagnosis] Model providers unavailable. Using local fallback diagnosis.'
    );
    const ruleBased = buildRuleBasedDiagnosis(symptom, answers, userProfile);
    return withFairness(await translateDiagnosisResult(ruleBased));
  }

  console.log('AI raw response (diagnosis):', text);
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(clean) as unknown;
    const normalized = normalizeDiagnosisResult(
      parsed,
      symptom,
      answers,
      userProfile
    );
    return withFairness(await translateDiagnosisResult(normalized));
  } catch (e) {
    logAiError('diagnosis-parse', e, {
      symptom,
      language,
      rawPreview: clean.slice(0, 280)
    });
    warnOnce(
      'ai-diagnosis-parse',
      '[AI Diagnosis] Invalid model JSON. Using local fallback diagnosis.'
    );
    const ruleBased = buildRuleBasedDiagnosis(symptom, answers, userProfile);
    return withFairness(await translateDiagnosisResult(ruleBased));
  }
}

export async function startConversation(
  userProfile: Record<string, any>,
  language: string = 'en'
): Promise<ConversationStart> {
  try {
    return await backendFetch<ConversationStart>('/ai/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ profile: userProfile, language })
    });
  } catch (err) {
    logAiError('conversation-start', err, { language });
    throw err;
  }
}

export async function sendConversationMessage(
  conversationId: string,
  message: string,
  userProfile: Record<string, any>,
  language: string = 'en'
): Promise<ConversationReply> {
  try {
    return await backendFetch<ConversationReply>(
      `/ai/conversations/${conversationId}/message`,
      {
        method: 'POST',
        body: JSON.stringify({ message, profile: userProfile, language })
      }
    );
  } catch (err) {
    logAiError('conversation-message', err, {
      conversationId,
      language,
      messageLength: message?.length ?? 0
    });
    throw err;
  }
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

export async function fetchNearbyFacilities(params: {
  city?: string;
  district?: string;
  state?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  limit?: number;
}): Promise<NearbyFacilitiesLookupResponse> {
  const search = new URLSearchParams();
  if (params.city) search.set('city', params.city);
  if (params.district) search.set('district', params.district);
  if (params.state) search.set('state', params.state);
  if (params.riskLevel) search.set('riskLevel', params.riskLevel);
  if (typeof params.limit === 'number' && Number.isFinite(params.limit)) {
    search.set('limit', String(Math.max(1, Math.min(8, Math.round(params.limit)))));
  }

  return backendFetch<NearbyFacilitiesLookupResponse>(
    `/facilities/nearby${search.toString() ? `?${search.toString()}` : ''}`,
    {
      method: 'GET'
    }
  );
}
