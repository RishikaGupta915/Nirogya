import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabaseClient';

WebBrowser.maybeCompleteAuthSession();

const SESSION_KEY = 'nirogya.supabase.session';
const PROFILE_KEY_PREFIX = 'nirogya.profile.';

export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export const auth: { currentUser: User | null } = {
  currentUser: null
};

type Listener = (user: User | null) => void;
const listeners = new Set<Listener>();
let isHydrated = false;

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
      useProxy: true,
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

export async function initializeAuthState() {
  if (isHydrated) return;
  isHydrated = true;

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
    if (session) {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
    emitAuthState();
  });
}

export function onAuthStateChanged(listener: Listener) {
  listeners.add(listener);
  listener(auth.currentUser);
  return () => listeners.delete(listener);
}

export async function signInWithGoogle() {
  const redirectTo = getRedirectUri();
  console.log('[OAuth] appOwnership =', Constants.appOwnership);
  console.log('[OAuth] executionEnvironment =', Constants.executionEnvironment);
  console.log('[OAuth] redirectTo =', redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });
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
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));

  auth.currentUser = mapSupabaseUser(session.user);
  emitAuthState();
  return auth.currentUser!;
}

export async function signUp(_email: string, _password: string, name: string) {
  const email = _email.trim();
  const password = _password;

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name?.trim() || undefined
      }
    }
  });
  if (error) throw error;

  const session = data.session;
  if (!session?.user) {
    throw new Error(
      'Account created but no active session. Disable email confirmation in Supabase for immediate in-app sign-in.'
    );
  }

  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  auth.currentUser = mapSupabaseUser(session.user);
  emitAuthState();

  if (name?.trim()) {
    await saveUserProfile(auth.currentUser!.uid, {
      name: name.trim(),
      email
    });
  }

  return auth.currentUser!;
}

export async function signIn(_email: string, _password: string) {
  const email = _email.trim();
  const password = _password;

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;

  const session = data.session;
  if (!session?.user) throw new Error('No active session created.');

  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  auth.currentUser = mapSupabaseUser(session.user);
  emitAuthState();
  return auth.currentUser!;
}

export async function logOut() {
  await supabase.auth.signOut();
  auth.currentUser = null;
  await SecureStore.deleteItemAsync(SESSION_KEY);
  emitAuthState();
}

export async function resetPassword(_email: string) {
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
