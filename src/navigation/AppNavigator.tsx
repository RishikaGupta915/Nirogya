// src/navigation/AppNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS, FONTS } from '../constants/theme';
import { UI_SHADOWS } from '../constants/ui';
import { useApp } from '../context/AppContext';

// Onboarding
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import ChooseLanguageScreen from '../screens/onboarding/ChooseLanguageScreen';
import SignUpScreen from '../screens/onboarding/SignUpScreen';
import SignInScreen from '../screens/onboarding/SignInScreen';
import AboutYou1Screen from '../screens/onboarding/AboutYou1Screen';
import AboutYou2Screen from '../screens/onboarding/AboutYou2Screen';
import AboutYou3Screen from '../screens/onboarding/AboutYou3Screen';
import AboutYou4Screen from '../screens/onboarding/AboutYou4Screen';
import AboutYou5Screen from '../screens/onboarding/AboutYou5Screen';
import ProfileReadyScreen from '../screens/onboarding/ProfileReadyScreen';

// Main
import HomeScreen from '../screens/main/HomeScreen';
import NiraChatScreen from '../screens/main/NiraChatScreen';
import HistoryScreen from '../screens/main/HistoryScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Assessment
import AssessmentScreen from '../screens/assessment/AssessmentScreen';
import ResultsScreen from '../screens/assessment/ResultsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ── Bottom Tab Navigator ───────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.94)',
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 16,
          paddingTop: 10,
          height: 68,
          ...UI_SHADOWS.tabBar,
        },
        tabBarActiveTintColor: COLORS.gradStart,
        tabBarInactiveTintColor: COLORS.textHint,
        tabBarLabelStyle: {
          fontFamily: FONTS.sans,
          fontSize: 10,
          marginTop: 2
        },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, string> = {
            Home: focused ? 'home' : 'home-outline',
            History: focused ? 'clipboard-text' : 'clipboard-text-outline',
            Profile: focused ? 'account' : 'account-outline'
          };
          return (
            <MaterialCommunityIcons
              name={(icons[route.name] ?? 'circle') as any}
              size={22}
              color={color}
            />
          );
        }
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarLabel: 'History' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// ── Root Stack Navigator ───────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useApp();

  if (loading) return null; // splash handled by expo-splash-screen

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.bg }
      }}
    >
      {!user ? (
        // ── Auth / Onboarding stack ──
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen
            name="ChooseLanguage"
            component={ChooseLanguageScreen}
          />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="AboutYou1" component={AboutYou1Screen} />
          <Stack.Screen name="AboutYou2" component={AboutYou2Screen} />
          <Stack.Screen name="AboutYou3" component={AboutYou3Screen} />
          <Stack.Screen name="AboutYou4" component={AboutYou4Screen} />
          <Stack.Screen name="AboutYou5" component={AboutYou5Screen} />
          <Stack.Screen name="ProfileReady" component={ProfileReadyScreen} />
        </>
      ) : (
        // ── Authenticated stack ──
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Assessment" component={AssessmentScreen} />
          <Stack.Screen name="Results" component={ResultsScreen} />
          <Stack.Screen name="NiraChat" component={NiraChatScreen} />
          {/* Allow re-entering profile edit from settings */}
          <Stack.Screen name="AboutYou1" component={AboutYou1Screen} />
          <Stack.Screen name="AboutYou2" component={AboutYou2Screen} />
          <Stack.Screen name="AboutYou3" component={AboutYou3Screen} />
          <Stack.Screen name="AboutYou4" component={AboutYou4Screen} />
          <Stack.Screen name="AboutYou5" component={AboutYou5Screen} />
        </>
      )}
    </Stack.Navigator>
  );
}