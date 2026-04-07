// src/screens/onboarding/SignInScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { GradientButton, GhostButton } from '../../components/UI';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { saveLanguage, signIn } from '../../services/authService';
import { useApp } from '../../context/AppContext';

export default function SignInScreen() {
  const nav = useNavigation<any>();
  const { userProfile } = useApp();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailSignIn = async () => {
    setLoading(true);
    try {
      const user = await signIn(email, password);
      if (userProfile.language) {
        await saveLanguage(user.uid, userProfile.language);
      }
    } catch (err: any) {
      Alert.alert('Sign in failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.logoRow}>
        <Text style={styles.logo}>Nirogya</Text>
      </View>

      <Text style={styles.heading}>Welcome back</Text>
      <Text style={styles.sub}>
        Sign in with your email to continue your health journey.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />

      <GradientButton
        label="Sign in →"
        onPress={handleEmailSignIn}
        loading={loading}
      />
      <GhostButton label="Back" onPress={() => nav.navigate('Welcome')} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  logoRow: { alignItems: 'center', paddingVertical: SPACING.xl },
  logo: {
    fontFamily: FONTS.serif,
    fontSize: 28,
    color: COLORS.pink,
    fontWeight: '600'
  },
  heading: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm
  },
  sub: {
    fontSize: 12,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontFamily: FONTS.sans,
    fontSize: 14
  }
});
