// src/services/assessmentService.ts
// Supabase-backed storage with local cache fallback

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

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

export async function saveAssessment(data: Omit<Assessment, 'id' | 'createdAt'>) {
  const createdAt = new Date().toISOString();
  const payload = { ...data, created_at: createdAt, raw_ai_text: data.rawAiText };

  const { error } = await supabase.from('assessments').insert(payload);
  if (error) throw error;

  // Update cache
  const existing = await loadCache(data.uid);
  const entry: Assessment = { ...data, createdAt, id: undefined };
  const next = [entry, ...existing].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  );
  await saveCache(data.uid, next);
  return entry.createdAt;
}

export async function getUserAssessments(uid: string): Promise<Assessment[]> {
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
      riskScore: row.riskScore ?? row.risk_score,
      riskLevel: row.riskLevel ?? row.risk_level,
      nextSteps: row.nextSteps ?? row.next_steps ?? [],
      rawAiText: row.rawAiText ?? row.raw_ai_text ?? '',
      createdAt: row.created_at ?? row.createdAt
    })) as Assessment[];
    await saveCache(uid, mapped);
    return mapped;
  }

  // fallback to cache
  return loadCache(uid);
}

export async function getRecentAssessments(uid: string, n = 5): Promise<Assessment[]> {
  const list = await getUserAssessments(uid);
  return list.slice(0, n);
}
