require('dotenv').config({ path: '.env' });
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const {
  generateQuestions,
  generateDiagnosis,
  generateConversationReply,
  computeFairnessScore,
  computeFairnessBreakdown,
  buildContextMap,
  deriveRiskFlags,
  buildRecommendationFromAssessment,
  transcribeAudio,
  analyzeClinicalImage,
  extractDocumentData,
  triageSymptoms,
  runFullPipeline
} = require('./ai');

const prisma = new PrismaClient();
const app = express();
app.use(express.json({ limit: '15mb' }));

const conversations = new Map();

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Auth middleware using Supabase JWT
app.use(async (req, res, next) => {
  const authHeader = req.header('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;
  if (!token) {
    return res
      .status(401)
      .json({ error: 'Missing Authorization Bearer token' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.uid = data.user.id;
  req.user = data.user;

  // Ensure profile exists
  await prisma.profile.upsert({
    where: { uid: req.uid },
    update: { lastActiveAt: new Date() },
    create: {
      uid: req.uid,
      email: data.user.email ?? null,
      name: data.user.user_metadata?.full_name ?? null,
      lastActiveAt: new Date()
    }
  });

  next();
});

app.get(['/profiles/me', '/api/profiles/me'], async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { uid: req.uid }
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post(['/profiles', '/api/profiles'], async (req, res) => {
  try {
    const data = req.body || {};
    const profile = await prisma.profile.upsert({
      where: { uid: req.uid },
      update: { ...data, updatedAt: new Date(), lastActiveAt: new Date() },
      create: { ...data, uid: req.uid, lastActiveAt: new Date() }
    });
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get(['/assessments', '/api/assessments'], async (req, res) => {
  try {
    const list = await prisma.assessment.findMany({
      where: { uid: req.uid, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post(['/assessments', '/api/assessments'], async (req, res) => {
  try {
    const data = req.body || {};
    const created = await prisma.assessment.create({
      data: {
        uid: req.uid,
        symptom: data.symptom ?? null,
        answers: data.answers ?? null,
        diagnosis: data.diagnosis ?? null,
        riskScore: data.riskScore ?? null,
        riskLevel: data.riskLevel ?? null,
        nextSteps: data.nextSteps ?? [],
        rawAiText: data.rawAiText ?? null
      }
    });
    res.json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI: generate follow-up questions
app.post(['/ai/questions', '/api/ai/questions'], async (req, res) => {
  try {
    const { symptom, profile, language } = req.body || {};
    if (!symptom) return res.status(400).json({ error: 'symptom is required' });

    const dbProfile = await prisma.profile.findUnique({
      where: { uid: req.uid }
    });
    const mergedProfile = {
      ...(dbProfile || {}),
      ...(profile || {})
    };

    const result = await generateQuestions(symptom, mergedProfile, language);
    res.json({
      questions: result.questions,
      source: result.source,
      language: language || mergedProfile.language || 'en'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'AI error' });
  }
});

// AI: generate diagnosis + fairness score
app.post(['/ai/diagnosis', '/api/ai/diagnosis'], async (req, res) => {
  try {
    const { symptom, answers, profile, language } = req.body || {};
    if (!symptom) return res.status(400).json({ error: 'symptom is required' });

    const dbProfile = await prisma.profile.findUnique({
      where: { uid: req.uid }
    });
    const mergedProfile = {
      ...(dbProfile || {}),
      ...(profile || {})
    };

    const assessment = await generateDiagnosis(
      symptom,
      answers || {},
      mergedProfile,
      language
    );

    const contextMap = buildContextMap(
      mergedProfile,
      language || mergedProfile.language || 'en'
    );
    const fairness = computeFairnessBreakdown(mergedProfile, assessment);
    const fairnessScore = computeFairnessScore(mergedProfile, assessment);
    const riskFlags = deriveRiskFlags(symptom, assessment);
    const recommendation = buildRecommendationFromAssessment(
      assessment,
      contextMap
    );

    res.json({
      assessment: {
        diagnosis: assessment.diagnosis,
        description: assessment.description,
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        nextSteps: assessment.nextSteps,
        seeDoctor: assessment.seeDoctor,
        urgency: assessment.urgency,
        fairnessScore,
        fairness
      },
      context: contextMap,
      riskFlags,
      recommendation,
      source: assessment.source,
      language: language || mergedProfile.language || 'en'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'AI error' });
  }
});

// AI: speech-to-text (Whisper/NIM)
app.post(
  ['/ai/voice/transcribe', '/api/ai/voice/transcribe'],
  async (req, res) => {
    try {
      const { audioBase64, language, mimeType } = req.body || {};
      if (!audioBase64) {
        return res.status(400).json({ error: 'audioBase64 is required' });
      }

      const result = await transcribeAudio({
        audioBase64,
        language,
        mimeType
      });

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Transcription error' });
    }
  }
);

// AI: clinical image analysis
app.post(['/ai/image/analyze', '/api/ai/image/analyze'], async (req, res) => {
  try {
    const { imageBase64, language, profile } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const dbProfile = await prisma.profile.findUnique({
      where: { uid: req.uid }
    });
    const mergedProfile = {
      ...(dbProfile || {}),
      ...(profile || {})
    };

    const result = await analyzeClinicalImage({
      imageBase64,
      profile: mergedProfile,
      language: language || mergedProfile.language || 'en'
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Image analysis error' });
  }
});

// AI: OCR + extraction for medical documents
app.post(
  ['/ai/documents/extract', '/api/ai/documents/extract'],
  async (req, res) => {
    try {
      const { imageBase64, documentType, language } = req.body || {};
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required' });
      }

      const result = await extractDocumentData({
        imageBase64,
        documentType,
        language
      });

      res.json(result);
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ error: err.message || 'Document extraction error' });
    }
  }
);

// AI: symptom triage (Infermedica + fallback rules)
app.post(['/ai/triage', '/api/ai/triage'], async (req, res) => {
  try {
    const { symptomText, sex, age, language } = req.body || {};
    if (!symptomText) {
      return res.status(400).json({ error: 'symptomText is required' });
    }

    const result = await triageSymptoms({
      symptomText,
      sex,
      age,
      language
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Triage error' });
  }
});

// AI: end-to-end pipeline orchestration
app.post(['/ai/pipeline/run', '/api/ai/pipeline/run'], async (req, res) => {
  try {
    const { symptom, answers, profile, language, history } = req.body || {};
    if (!symptom) {
      return res.status(400).json({ error: 'symptom is required' });
    }

    const dbProfile = await prisma.profile.findUnique({
      where: { uid: req.uid }
    });
    const mergedProfile = {
      ...(dbProfile || {}),
      ...(profile || {})
    };

    const result = await runFullPipeline({
      symptom,
      answers: answers || {},
      profile: mergedProfile,
      language: language || mergedProfile.language || 'en',
      history: Array.isArray(history) ? history : []
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Pipeline execution error' });
  }
});

// AI: start conversation session
app.post(
  [
    '/ai/conversations/start',
    '/api/ai/conversations/start',
    '/api/conversations/start'
  ],
  async (req, res) => {
    try {
      const { language, profile } = req.body || {};
      const dbProfile = await prisma.profile.findUnique({
        where: { uid: req.uid }
      });
      const mergedProfile = {
        ...(dbProfile || {}),
        ...(profile || {})
      };

      const conversationId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const conversationKey = `${req.uid}:${conversationId}`;
      const greeting =
        'Hi! I am Nira, your AI health assistant. Tell me what you are feeling today.';

      conversations.set(conversationKey, {
        uid: req.uid,
        profile: mergedProfile,
        language: language || mergedProfile.language || 'en',
        messages: [{ role: 'assistant', content: greeting }],
        createdAt: new Date().toISOString()
      });

      res.json({
        conversationId,
        greeting,
        language: language || mergedProfile.language || 'en'
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'AI error' });
    }
  }
);

// AI: send a message in an existing conversation
app.post(
  [
    '/ai/conversations/:id/message',
    '/api/ai/conversations/:id/message',
    '/api/conversations/:id/message'
  ],
  async (req, res) => {
    try {
      const conversationId = req.params.id;
      const { message, language, profile } = req.body || {};

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required' });
      }

      const key = `${req.uid}:${conversationId}`;
      const current = conversations.get(key);
      if (!current) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const dbProfile = await prisma.profile.findUnique({
        where: { uid: req.uid }
      });
      const mergedProfile = {
        ...(dbProfile || {}),
        ...(current.profile || {}),
        ...(profile || {})
      };

      const history = [
        ...(current.messages || []),
        { role: 'user', content: message }
      ];
      const result = await generateConversationReply({
        message,
        profile: mergedProfile,
        language:
          language || current.language || mergedProfile.language || 'en',
        history
      });

      const nextMessages = [
        ...history,
        { role: 'assistant', content: result.reply }
      ].slice(-20);

      conversations.set(key, {
        ...current,
        profile: mergedProfile,
        language:
          language || current.language || mergedProfile.language || 'en',
        messages: nextMessages,
        updatedAt: new Date().toISOString()
      });

      res.json({
        reply: result.reply,
        isUrgent: result.isUrgent,
        source: result.source,
        conversationId
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'AI error' });
    }
  }
);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
