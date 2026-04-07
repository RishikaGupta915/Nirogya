// src/screens/onboarding/SignUpScreen.tsx

import React, { useState } from 'react';
import { Text, Alert, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ProgressDots, GradientButton, GhostButton } from '../../components/UI';
import { COLORS, FONTS } from '../../constants/theme';
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
      const result = await signUp(email, password, name);
      const user = result.user;
      if (userProfile.language) {
        await saveLanguage(user.uid, userProfile.language);
      }
      setUserProfile({ name: (name || user.displayName) ?? undefined });
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

      <Text className="mb-2 text-[22px] text-textPrimary" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
        Create your account
      </Text>
      <Text className="mb-6 text-[12px] leading-[18px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
        Create your account with email and password.
      </Text>

      <TextInput
        className="mb-3 rounded-[14px] border border-borderSoft bg-card px-[14px] py-3 text-[14px] text-textPrimary"
        style={{
          fontFamily: FONTS.sans,
          shadowColor: '#2f4b84',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 2
        }}
        placeholder="Full name"
        placeholderTextColor={COLORS.textMuted}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        className="mb-3 rounded-[14px] border border-borderSoft bg-card px-[14px] py-3 text-[14px] text-textPrimary"
        style={{
          fontFamily: FONTS.sans,
          shadowColor: '#2f4b84',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 2
        }}
        placeholder="Email"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        className="mb-3 rounded-[14px] border border-borderSoft bg-card px-[14px] py-3 text-[14px] text-textPrimary"
        style={{
          fontFamily: FONTS.sans,
          shadowColor: '#2f4b84',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 2
        }}
        placeholder="Password"
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />

      <Text className="mb-4 text-[11px] leading-[17px] text-textMuted" style={{ fontFamily: FONTS.sans }}>
        By continuing, you agree to our{' '}
        <Text style={{ color: COLORS.pink }}>Terms of Service</Text> and{' '}
        <Text style={{ color: COLORS.pink }}>Privacy Policy</Text>.
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