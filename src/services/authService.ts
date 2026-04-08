import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { isSupabaseConfigured, supabase } from './supabaseClient';

WebBrowser.maybeCompleteAuthSession();

const SESSION_KEY = 'nirogya.supabase.session';
const PROFILE_KEY_PREFIX = 'nirogya.profile.';

type PersistedSession = {
  access_token: string;
  refresh_token: string;
};

export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export type SignUpResult = {
  user: User;
  requiresEmailVerification: boolean;
};

export const auth: { currentUser: User | null } = {
  currentUser: null
};

type Listener = (user: User | null) => void;
const listeners = new Set<Listener>();
let isHydrated = false;

function ensureSupabaseConfigured() {
  if (isSupabaseConfigured) return;
  throw new Error(
    'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env and restart Expo.'
  );
}

function profileKey(uid: string) {
  return `${PROFILE_KEY_PREFIX}${uid}`;
}

function emitAuthState() {
  listeners.forEach((l) => l(auth.currentUser));
}

function mapSupabaseUser(u: any | null): User | null {
  if (!u) return null;
  return {
    uid: u.id,
    email: u.email ?? null,
    displayName: u.user_metadata?.full_name ?? u.email ?? null,
    photoURL: u.user_metadata?.avatar_url ?? null
  };
}

function getRedirectUri() {
  // Use a single, explicit redirect with path for both Expo Go (proxy) and builds.
  // Ensure this value is allow-listed in Supabase Redirect URLs and Google Web OAuth client.
  if (Constants.appOwnership === 'expo') {
    return AuthSession.makeRedirectUri({
      path: 'auth/callback'
    });
  }

  const override = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI?.trim();
  if (override) return override;

  return AuthSession.makeRedirectUri({
    scheme: 'nirogya',
    path: 'auth/callback'
  });
}

function getParamFromUrl(urlStr: string, key: string) {
  try {
    const url = new URL(urlStr);
    const queryVal = url.searchParams.get(key);
    if (queryVal) return queryVal;

    const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    if (!hash) return null;
    const params = new URLSearchParams(hash);
    return params.get(key);
  } catch {
    return null;
  }
}

function toPersistedSession(session: any): PersistedSession | null {
  if (!session?.access_token || !session?.refresh_token) return null;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token
  };
}

async function persistSession(session: any | null) {
  const compact = toPersistedSession(session);
  if (!compact) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(compact));
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(`${label} timed out. Check internet and Supabase settings.`)
      );
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function initializeAuthState() {
  if (isHydrated) return;
  isHydrated = true;

  if (!isSupabaseConfigured) {
    auth.currentUser = null;
    emitAuthState();
    return;
  }

  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (raw) {
      try {
        const stored = JSON.parse(raw);
        if (stored?.access_token && stored?.refresh_token) {
          await supabase.auth.setSession(stored);
        }
      } catch {
        await SecureStore.deleteItemAsync(SESSION_KEY);
      }
    }

    const { data } = await supabase.auth.getSession();
    auth.currentUser = mapSupabaseUser(data.session?.user ?? null);
    emitAuthState();

    supabase.auth.onAuthStateChange(async (_event, session) => {
      auth.currentUser = mapSupabaseUser(session?.user ?? null);
      try {
        await persistSession(session);
      } catch (storageErr) {
        console.warn('Session persistence failed:', storageErr);
      }
      emitAuthState();
    });
  } catch (err) {
    console.error('initializeAuthState failed:', err);
    auth.currentUser = null;
    emitAuthState();
  }
}

export function onAuthStateChanged(listener: Listener) {
  listeners.add(listener);
  listener(auth.currentUser);
  return () => listeners.delete(listener);
}

export async function signInWithGoogle() {
  ensureSupabaseConfigured();
  const redirectTo = getRedirectUri();
  console.log('[OAuth] appOwnership =', Constants.appOwnership);
  console.log('[OAuth] executionEnvironment =', Constants.executionEnvironment);
  console.log('[OAuth] redirectTo =', redirectTo);

  const { data, error } = await withTimeout(
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true
      }
    }),
    20000,
    'Google sign-in request'
  );
  if (error) throw error;
  if (!data?.url) throw new Error('No auth URL returned');
  console.log('[OAuth] authorizeUrl =', data.url);

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  console.log('[OAuth] result.type =', result.type);

  if (result.type !== 'success') {
    throw new Error('Google sign-in cancelled');
  }

  const callbackUrl = (result as any).url;
  if (!callbackUrl) {
    throw new Error('OAuth callback URL missing from auth result.');
  }

  const accessToken = getParamFromUrl(callbackUrl, 'access_token');
  const refreshToken = getParamFromUrl(callbackUrl, 'refresh_token');

  let session = null;

  if (accessToken && refreshToken) {
    const { data: setData, error: setErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (setErr) throw setErr;
    session = setData.session;
  } else {
    const { data: exchangeData, error: exchangeErr } =
      await supabase.auth.exchangeCodeForSession(callbackUrl);
    if (exchangeErr) throw exchangeErr;
    session = exchangeData.session;
  }

  if (!session?.user) throw new Error('No user in Supabase session');
  await persistSession(session);

  auth.currentUser = mapSupabaseUser(session.user);
  emitAuthState();
  return auth.currentUser!;
}

export async function signUp(
  _email: string,
  _password: string,
  name: string
): Promise<SignUpResult> {
  ensureSupabaseConfigured();
  const email = _email.trim();
  const password = _password;

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const { data, error } = await withTimeout(
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name?.trim() || undefined
        }
      }
    }),
    20000,
    'Create account request'
  );
  if (error) throw error;

  const mappedUser = mapSupabaseUser(data.user);
  if (!mappedUser) {
    throw new Error('Account created response was invalid. Please try again.');
  }

  const session = data.session;
  if (!session?.user) {
    return {
      user: mappedUser,
      requiresEmailVerification: true
    };
  }

  await persistSession(session);
  auth.currentUser = mapSupabaseUser(session.user);
  emitAuthState();

  if (name?.trim()) {
    await saveUserProfile(auth.currentUser!.uid, {
      name: name.trim(),
      email
    });
  }

  return {
    user: auth.currentUser!,
    requiresEmailVerification: false
  };
}

export async function signIn(_email: string, _password: string) {
  ensureSupabaseConfigured();
  const email = _email.trim();
  const password = _password;

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const { data, error } = await withTimeout(
    supabase.auth.signInWithPassword({
      email,
      password
    }),
    20000,
    'Sign-in request'
  );
  if (error) throw error;

  const session = data.session;
  if (!session?.user) throw new Error('No active session created.');

  await persistSession(session);
  auth.currentUser = mapSupabaseUser(session.user);
  emitAuthState();
  return auth.currentUser!;
}

export async function logOut() {
  if (!isSupabaseConfigured) {
    auth.currentUser = null;
    emitAuthState();
    return;
  }

  await supabase.auth.signOut();
  auth.currentUser = null;
  await persistSession(null);
  emitAuthState();
}

export async function resetPassword(_email: string) {
  ensureSupabaseConfigured();
  const email = _email.trim();
  if (!email) throw new Error('Email is required.');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getRedirectUri()
  });
  if (error) throw error;
}

export async function getUserProfile(uid: string) {
  const raw = await AsyncStorage.getItem(profileKey(uid));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveUserProfile(
  uid: string,
  profile: Record<string, any>
) {
  const existing = await getUserProfile(uid);
  const next = {
    ...(existing ?? {}),
    profile: {
      ...(existing?.profile ?? {}),
      ...profile
    },
    name: profile.name ?? existing?.name,
    updatedAt: new Date().toISOString()
  };
  await AsyncStorage.setItem(profileKey(uid), JSON.stringify(next));
}

export async function saveLanguage(uid: string, language: string) {
  const existing = await getUserProfile(uid);
  const next = {
    ...(existing ?? {}),
    language,
    updatedAt: new Date().toISOString()
  };
  await AsyncStorage.setItem(profileKey(uid), JSON.stringify(next));
}
