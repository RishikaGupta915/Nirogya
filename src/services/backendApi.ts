import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabaseClient';

const EXPLICIT_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();

function normalizeBaseUrl(raw: string) {
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function maybeRewriteAndroidLoopback(raw: string) {
  if (Platform.OS !== 'android') return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      url.hostname = '10.0.2.2';
      return url.toString();
    }
  } catch {
    // Keep the original raw URL if parsing fails.
  }

  return raw;
}

function extractHostFromUri(uri?: string | null) {
  if (!uri || typeof uri !== 'string') return null;
  try {
    const withScheme = uri.includes('://') ? uri : `http://${uri}`;
    const parsed = new URL(withScheme);
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

function getExpoLanHost() {
  const manifestAny = (Constants as any)?.manifest;
  const manifest2Any = (Constants as any)?.manifest2;

  const candidates = [
    (Constants as any)?.expoConfig?.hostUri,
    manifestAny?.debuggerHost,
    manifest2Any?.extra?.expoClient?.hostUri
  ];

  for (const candidate of candidates) {
    const host = extractHostFromUri(candidate);
    if (
      host &&
      host !== 'localhost' &&
      host !== '127.0.0.1' &&
      host !== '::1'
    ) {
      return host;
    }
  }

  return null;
}

function getCandidateBackendBaseUrls() {
  const candidates: string[] = [];

  if (EXPLICIT_BACKEND_URL) {
    candidates.push(
      normalizeBaseUrl(maybeRewriteAndroidLoopback(EXPLICIT_BACKEND_URL))
    );
    candidates.push(normalizeBaseUrl(EXPLICIT_BACKEND_URL));
  }

  candidates.push(
    normalizeBaseUrl(
      Platform.OS === 'android'
        ? 'http://10.0.2.2:4000'
        : 'http://localhost:4000'
    )
  );

  const lanHost = getExpoLanHost();
  if (lanHost) {
    candidates.push(normalizeBaseUrl(`http://${lanHost}:4000`));
  }

  return [...new Set(candidates.filter(Boolean))];
}

function isLikelyNetworkFailure(err: unknown) {
  const message = String((err as any)?.message ?? err);
  return /(network request failed|failed to fetch|econnrefused|enotfound|timed out|load failed)/i.test(
    message
  );
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

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrls = getCandidateBackendBaseUrls();
  const method = (init.method || 'GET').toUpperCase();

  let lastNetworkError: unknown = null;
  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(`${baseUrl}${normalizedPath}`, {
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
    } catch (err) {
      if (isLikelyNetworkFailure(err)) {
        console.warn('[AI API NETWORK RETRY]', {
          method,
          path: normalizedPath,
          baseUrl,
          error: String((err as any)?.message ?? err)
        });
        lastNetworkError = err;
        continue;
      }

      console.error('[AI API ERROR]', {
        method,
        path: normalizedPath,
        baseUrl,
        error: String((err as any)?.message ?? err)
      });
      throw err;
    }
  }

  const details = String(
    (lastNetworkError as any)?.message ?? 'Network request failed'
  );
  console.error('[AI API UNREACHABLE]', {
    method,
    path: normalizedPath,
    triedBaseUrls: baseUrls,
    error: details
  });
  throw new Error(
    `Cannot reach backend API. Tried: ${baseUrls.join(', ')}. ` +
      `If using Android emulator use http://10.0.2.2:4000. ` +
      `If using a physical device set EXPO_PUBLIC_BACKEND_URL to your computer LAN URL (for example http://192.168.x.x:4000). ` +
      `Original error: ${details}`
  );
}
