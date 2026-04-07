// src/screens/onboarding/SignInScreen.tsx

import { useState } from 'react';
import { View, Text, Alert, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { GradientButton, GhostButton } from '../../components/UI';
import { COLORS, FONTS } from '../../constants/theme';
import { saveLanguage, signIn } from '../../services/authService';
import { useApp } from '../../context/AppContext';

export default function SignInScreen() {
  const nav = useNavigation<any>();
  const { userProfile } = useApp();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailSignIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }
    if (!password) {
      Alert.alert('Missing password', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const user = await signIn(trimmedEmail, password);
      if (userProfile.language) {
        await saveLanguage(user.uid, userProfile.language);
      }
    } catch (err: any) {
      Alert.alert('Sign in failed', err?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View className="items-center py-6">
        <Text
          className="text-[28px] text-textPrimary dark:text-slate-100"
          style={{ fontFamily: FONTS.serif, fontWeight: '600' }}
        >
          Nirogya
        </Text>
      </View>

      <Text
        className="mb-2 text-[22px] text-textPrimary dark:text-slate-100"
        style={{ fontFamily: FONTS.serif, fontWeight: '600' }}
      >
        Welcome back
      </Text>
      <Text
        className="mb-6 text-[12px] text-textMuted dark:text-slate-300"
        style={{ fontFamily: FONTS.sans }}
      >
        Sign in with your email to continue your health journey.
      </Text>

      <TextInput
        className="mb-3 rounded-[14px] bg-card dark:bg-slate-900/72 px-[14px] py-3 text-[14px] text-textPrimary dark:text-slate-100"
        style={{
          fontFamily: FONTS.sans,
          shadowColor: '#2f4b84',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 2
        }}
        placeholder="you@example.com"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        className="mb-3 rounded-[14px] bg-card dark:bg-slate-900/72 px-[14px] py-3 text-[14px] text-textPrimary dark:text-slate-100"
        style={{
          fontFamily: FONTS.sans,
          shadowColor: '#2f4b84',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 2
        }}
        placeholder="Enter your password"
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={() => {
          void handleEmailSignIn();
        }}
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



