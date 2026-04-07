// src/components/ScreenWrapper.tsx

import React from 'react';
import {
  View, ScrollView, StatusBar,
  KeyboardAvoidingView, Platform, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SCREEN_BG_GRADIENT, SPACING } from '../constants/theme';

interface Props {
  children:    React.ReactNode;
  scrollable?: boolean;
  style?:      ViewStyle;
  padded?:     boolean;
}

export default function ScreenWrapper({ children, scrollable = true, style, padded = true }: Props) {
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
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
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
            <View className="absolute rounded-full bg-pinkSoft" style={{ width: 220, height: 220, right: -40, top: 20 }} />
            <View className="absolute rounded-full bg-tealSoft" style={{ width: 260, height: 260, left: -90, top: '32%' }} />
            <View className="absolute rounded-full bg-purpleSoft" style={{ width: 260, height: 260, right: -100, bottom: -20 }} />
          </View>

          {content}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}