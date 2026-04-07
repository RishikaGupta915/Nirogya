// src/components/ScreenWrapper.tsx

import type { ReactNode } from 'react';
import {
  View, ScrollView, StatusBar,
  KeyboardAvoidingView, Platform, StyleProp, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SCREEN_BG_GRADIENT, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';

interface Props {
  children:    ReactNode;
  scrollable?: boolean;
  style?:      StyleProp<ViewStyle>;
  padded?:     boolean;
}

export default function ScreenWrapper({ children, scrollable = true, style, padded = true }: Props) {
  const { themeMode } = useApp();
  const isDark = themeMode === 'dark';
  const padStyle = padded ? { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl } : undefined;

  const content = (
    <View className="flex-1" style={style}>
      {scrollable
        ? (
          <ScrollView
            contentContainerStyle={[padStyle, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        )
        : (
          <View style={[padStyle, { flex: 1 }]}> 
            {children}
          </View>
        )
      }
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1">
          <LinearGradient
            colors={SCREEN_BG_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="absolute inset-0"
          />

          <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
            <View
              className="absolute rounded-full"
              style={{
                width: 220,
                height: 220,
                right: -40,
                top: 20,
                backgroundColor: isDark ? 'rgba(255,127,163,0.17)' : 'rgba(255,217,226,0.92)'
              }}
            />
            <View
              className="absolute rounded-full"
              style={{
                width: 260,
                height: 260,
                left: -90,
                top: '32%',
                backgroundColor: isDark ? 'rgba(100,213,232,0.14)' : 'rgba(216,244,246,0.92)'
              }}
            />
            <View
              className="absolute rounded-full"
              style={{
                width: 260,
                height: 260,
                right: -100,
                bottom: -20,
                backgroundColor: isDark ? 'rgba(162,141,255,0.16)' : 'rgba(236,230,255,0.92)'
              }}
            />
          </View>

          {content}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}