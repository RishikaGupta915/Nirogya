// src/components/ScreenWrapper.tsx

import React from 'react';
import {
  View, ScrollView, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/theme';

interface Props {
  children:    React.ReactNode;
  scrollable?: boolean;
  style?:      ViewStyle;
  padded?:     boolean;
}

export default function ScreenWrapper({ children, scrollable = true, style, padded = true }: Props) {
  const inner = (
    <View style={[styles.bg, style]}>
      {scrollable
        ? (
          <ScrollView
            contentContainerStyle={[padded && styles.padded, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        )
        : (
          <View style={[padded && styles.padded, { flex: 1 }]}>
            {children}
          </View>
        )
      }
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  bg:     { flex: 1, backgroundColor: COLORS.bg },
  padded: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
});
