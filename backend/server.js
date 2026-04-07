require('dotenv').config({ path: '.env' });
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

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
    return res.status(401).json({ error: 'Missing Authorization Bearer token' });
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

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/profiles/me', async (req, res) => {
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

app.post('/profiles', async (req, res) => {
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

app.get('/assessments', async (req, res) => {
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

app.post('/assessments', async (req, res) => {
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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
