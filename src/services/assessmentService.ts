// src/services/assessmentService.ts
// Supabase-backed storage with local cache fallback

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { backendFetch } from './backendApi';

const warningKeys = new Set<string>();

function warnOnce(key: string, ...args: any[]) {
  if (warningKeys.has(key)) return;
  warningKeys.add(key);
  console.warn(...args);
}

function isLikelyNetworkFailure(err: unknown) {
  const message = String((err as any)?.message ?? err);
  return /(cannot reach backend api|network request failed|failed to fetch|econnrefused|enotfound|timed out|load failed)/i.test(
    message
  );
}

export interface Assessment {
  id?: string;
  uid: string;
  symptom: string;
  answers: Record<string, string>;
  diagnosis: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  nextSteps: string[];
  rawAiText: string;
  createdAt?: string; // ISO string
}

const cacheKey = (uid: string) => `nirogya.assessments.${uid}`;

async function saveCache(uid: string, items: Assessment[]) {
  await AsyncStorage.setItem(cacheKey(uid), JSON.stringify(items));
}

async function loadCache(uid: string): Promise<Assessment[]> {
  const raw = await AsyncStorage.getItem(cacheKey(uid));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Assessment[];
  } catch {
    return [];
  }
}

export async function saveAssessment(
  data: Omit<Assessment, 'id' | 'createdAt'>
) {
  let createdAt = new Date().toISOString();
  let createdId: string | undefined;

  try {
    const response = await backendFetch<{ id?: string; createdAt?: string }>(
      '/assessments',
      {
        method: 'POST',
        body: JSON.stringify({
          symptom: data.symptom,
          answers: data.answers,
          diagnosis: data.diagnosis,
          riskScore: data.riskScore,
          riskLevel: data.riskLevel,
          nextSteps: data.nextSteps,
          rawAiText: data.rawAiText
        })
      }
    );

    if (typeof response?.createdAt === 'string' && response.createdAt.trim()) {
      createdAt = response.createdAt;
    }
    if (typeof response?.id === 'string' && response.id.trim()) {
      createdId = response.id;
    }
  } catch (backendErr) {
    if (isLikelyNetworkFailure(backendErr)) {
      warnOnce(
        'assessment-save-network',
        '[Assessment API] Backend unavailable. Falling back to Supabase.'
      );
    } else {
      warnOnce(
        'assessment-save-error',
        '[Assessment API Fallback to Supabase]',
        backendErr
      );
    }

    const payloadSnake = {
      ...data,
      created_at: createdAt,
      risk_score: data.riskScore,
      risk_level: data.riskLevel,
      next_steps: data.nextSteps,
      raw_ai_text: data.rawAiText
    };

    const { data: insertedSnake, error: snakeError } = await supabase
      .from('assessments')
      .insert(payloadSnake)
      .select('id, created_at')
      .single();

    if (!snakeError) {
      createdId = insertedSnake?.id;
      if (insertedSnake?.created_at) createdAt = insertedSnake.created_at;
    } else {
      const payloadCompact = {
        ...data,
        created_at: createdAt,
        riskscore: data.riskScore,
        risklevel: data.riskLevel,
        nextsteps: data.nextSteps,
        rawaitext: data.rawAiText
      };

      const { data: insertedCompact, error: compactError } = await supabase
        .from('assessments')
        .insert(payloadCompact)
        .select('id, created_at')
        .single();

      if (compactError) throw compactError;
      createdId = insertedCompact?.id;
      if (insertedCompact?.created_at) createdAt = insertedCompact.created_at;
    }
  }

  // Update cache
  const existing = await loadCache(data.uid);
  const entry: Assessment = { ...data, createdAt, id: createdId };
  const next = [entry, ...existing].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime()
  );
  await saveCache(data.uid, next);
  return entry.createdAt;
}

export async function getUserAssessments(uid: string): Promise<Assessment[]> {
  try {
    const data = await backendFetch<any[]>('/assessments', { method: 'GET' });
    if (Array.isArray(data)) {
      const mapped = data.map((row: any) => ({
        id: row.id,
        uid: row.uid,
        symptom: row.symptom,
        answers: row.answers,
        diagnosis: row.diagnosis,
        riskScore: row.riskScore ?? row.risk_score ?? row.riskscore,
        riskLevel: row.riskLevel ?? row.risk_level ?? row.risklevel,
        nextSteps: row.nextSteps ?? row.next_steps ?? row.nextsteps ?? [],
        rawAiText: row.rawAiText ?? row.raw_ai_text ?? row.rawaitext ?? '',
        createdAt: row.createdAt ?? row.created_at
      })) as Assessment[];
      await saveCache(uid, mapped);
      return mapped;
    }
  } catch (backendErr) {
    if (isLikelyNetworkFailure(backendErr)) {
      warnOnce(
        'assessment-list-network',
        '[Assessment API] Backend unavailable. Falling back to Supabase/cache.'
      );
    } else {
      warnOnce(
        'assessment-list-error',
        '[Assessment API Fallback to Supabase]',
        backendErr
      );
    }
  }

  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('uid', uid)
    .order('created_at', { ascending: false });

  if (!error && data) {
    const mapped = data.map((row: any) => ({
      id: row.id,
      uid: row.uid,
      symptom: row.symptom,
      answers: row.answers,
      diagnosis: row.diagnosis,
      riskScore: row.riskScore ?? row.risk_score ?? row.riskscore,
      riskLevel: row.riskLevel ?? row.risk_level ?? row.risklevel,
      nextSteps: row.nextSteps ?? row.next_steps ?? row.nextsteps ?? [],
      rawAiText: row.rawAiText ?? row.raw_ai_text ?? row.rawaitext ?? '',
      createdAt: row.created_at ?? row.createdAt
    })) as Assessment[];
    await saveCache(uid, mapped);
    return mapped;
  }

  // fallback to cache
  return loadCache(uid);
}

export async function getRecentAssessments(
  uid: string,
  n = 5
): Promise<Assessment[]> {
  const list = await getUserAssessments(uid);
  return list.slice(0, n);
}
