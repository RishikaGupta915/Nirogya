// src/context/AppContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyTheme, ThemeMode } from '../constants/theme';
import {
  auth,
  getUserProfile,
  initializeAuthState,
  onAuthStateChanged,
  User
} from '../services/authService';

interface UserProfile {
  name?: string;
  language?: string;
  ageGroup?: string;
  lifeStage?: string;
  city?: string;
  activityLevel?: string;
  exerciseTypes?: string[];
  exerciseDays?: number;
  dietType?: string;
  mealsPerDay?: number;
  dietHabits?: string[];
  supplements?: string[];
  sleepHours?: number;
  sleepQuality?: string[];
  stressLevel?: string;
  moodSwings?: boolean;
  anxiety?: boolean;
  lowMotivation?: boolean;
  conditions?: string[];
  familyHistory?: string[];
  medications?: string;
  allergies?: string[];
}

interface AppContextType {
  user: User | null;
  userProfile: UserProfile;
  themeMode: ThemeMode;
  loading: boolean;
  setUserProfile: (p: Partial<UserProfile>) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  refreshProfile: () => Promise<void>;
}

const THEME_MODE_KEY = 'nirogya.theme.mode';

const AppContext = createContext<AppContextType>({
  user: null,
  userProfile: {},
  themeMode: 'light',
  loading: true,
  setUserProfile: () => {},
  setThemeMode: () => {},
  toggleTheme: () => {},
  refreshProfile: async () => {}
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setProfile] = useState<UserProfile>({});
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrateTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (!isMounted) return;
        const nextMode: ThemeMode = stored === 'dark' ? 'dark' : 'light';
        setThemeModeState(nextMode);
      } catch {
        if (isMounted) setThemeModeState('light');
      }
    };

    void hydrateTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    applyTheme(themeMode);
    void AsyncStorage.setItem(THEME_MODE_KEY, themeMode).catch(() => {});
  }, [themeMode]);

  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    const data = await getUserProfile(auth.currentUser.uid);
    if (data) {
      setProfile((prev) => ({
        ...prev,
        name: data.name,
        language: data.language,
        ...data.profile
      }));
    }
  };

  useEffect(() => {
    let isMounted = true;

    const unsub = onAuthStateChanged(async (u) => {
      if (!isMounted) return;

      setUser(u);

      if (!u) {
        setProfile({});
        setLoading(false);
        return;
      }

      try {
        const data = await getUserProfile(u.uid);
        if (!isMounted) return;
        if (data) {
          setProfile({
            name: data.name,
            language: data.language,
            ...data.profile
          });
        }
      } catch (err) {
        console.warn('Profile load failed during auth state update:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    const boot = async () => {
      try {
        await initializeAuthState();
      } catch (err) {
        console.error('Auth bootstrap failed:', err);
        if (isMounted) setLoading(false);
      }
    };

    void boot();

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const setUserProfile = (partial: Partial<UserProfile>) =>
    setProfile((prev) => ({ ...prev, ...partial }));

  const setThemeMode = (mode: ThemeMode) => setThemeModeState(mode);
  const toggleTheme = () =>
    setThemeModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <AppContext.Provider
      value={{
        user,
        userProfile,
        themeMode,
        loading,
        setUserProfile,
        setThemeMode,
        toggleTheme,
        refreshProfile
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
