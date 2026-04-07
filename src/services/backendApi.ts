import { Platform } from 'react-native';
import { supabase } from './supabaseClient';

const EXPLICIT_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();

function getFallbackBackendUrl() {
  // Android emulators cannot reach localhost directly.
  return Platform.OS === 'android'
    ? 'http://10.0.2.2:4000'
    : 'http://localhost:4000';
}

function getBackendBaseUrl() {
  const raw = EXPLICIT_BACKEND_URL || getFallbackBackendUrl();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export async function backendFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error('You must be signed in to call backend APIs.');
  }

  const response = await fetch(`${getBackendBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });

  if (!response.ok) {
    let message = `Backend request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      const text = await response.text();
      if (text?.trim()) {
        message = text.slice(0, 220);
      }
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
