// src/screens/onboarding/SignUpScreen.tsx

import React, { useState } from 'react';
import { Text, StyleSheet, Alert, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ProgressDots, GradientButton, GhostButton } from '../../components/UI';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { saveLanguage, signUp } from '../../services/authService';
import { useApp } from '../../context/AppContext';

export default function SignUpScreen() {
  const nav = useNavigation<any>();
  const { setUserProfile, userProfile } = useApp();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailSignUp = async () => {
    setLoading(true);
    try {
      const user = await signUp(email, password, name);
      if (userProfile.language) {
        await saveLanguage(user.uid, userProfile.language);
      }
      setUserProfile({ name: name || user.displayName ?? undefined });
      nav.navigate('AboutYou1');
    } catch (err: any) {
      Alert.alert('Sign up failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <ProgressDots total={4} current={2} />

      <Text style={styles.heading}>Create your account</Text>
      <Text style={styles.sub}>
        Create your account with email and password.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        placeholderTextColor={COLORS.textMuted}
        value={name}
        onChangeText={setName}
      />

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

      <Text style={styles.terms}>
        By continuing, you agree to our{' '}
        <Text style={styles.link}>Terms of Service</Text> and{' '}
        <Text style={styles.link}>Privacy Policy</Text>.
      </Text>

      <GradientButton
        label="Create account →"
        onPress={handleEmailSignUp}
        loading={loading}
      />
      <GhostButton
        label="I already have an account"
        onPress={() => nav.navigate('SignIn')}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
    lineHeight: 18,
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
  },
  terms: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.sans,
    lineHeight: 17,
    marginBottom: SPACING.lg
  },
  link: { color: COLORS.pink }
});
