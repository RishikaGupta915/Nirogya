import { supabase } from './supabaseClient';

const EXPLICIT_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

function sanitizeBackendUrl(raw: string) {
  return raw.replace(/\s+/g, '');
}

function normalizeBaseUrl(raw: string) {
  const cleaned = sanitizeBackendUrl(String(raw || '').trim());
  return cleaned.endsWith('/') ? cleaned.slice(0, -1) : cleaned;
}

function getCandidateBackendBaseUrls() {
  const explicit = normalizeBaseUrl(EXPLICIT_BACKEND_URL || '');
  if (!explicit) {
    throw new Error(
      'EXPO_PUBLIC_BACKEND_URL is required. Set it in .env to your backend URL.'
    );
  }
  return [explicit];
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
      const headers = new Headers(init.headers || {});
      headers.set('Authorization', `Bearer ${accessToken}`);

      const isFormDataBody =
        typeof FormData !== 'undefined' && init.body instanceof FormData;

      if (!isFormDataBody && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(`${baseUrl}${normalizedPath}`, {
        ...init,
        headers
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
        console.warn('[AI API NETWORK ERROR]', {
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
    `Cannot reach backend API at EXPO_PUBLIC_BACKEND_URL (${baseUrls.join(', ')}). ` +
      `Original error: ${details}`
  );
}
