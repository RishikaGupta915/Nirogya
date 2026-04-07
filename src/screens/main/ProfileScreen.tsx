import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS, FONTS, LANGUAGES } from '../../constants/theme';
import { UI_CLASSES, UI_SHADOWS } from '../../constants/ui';
import { useApp } from '../../context/AppContext';
import { auth, logOut, saveLanguage } from '../../services/authService';

export default function ProfileScreen() {
  const nav = useNavigation<any>();
  const { userProfile, setUserProfile, themeMode, toggleTheme } = useApp();

  const [periodReminders, setPeriodReminders] = useState(true);
  const [weeklyNudge, setWeeklyNudge] = useState(true);
  const [shareWithDoc, setShareWithDoc] = useState(false);

  const name = userProfile.name ?? 'User';
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLangChange = async (code: string) => {
    setUserProfile({ language: code });
    const uid = auth.currentUser?.uid;
    if (uid) await saveLanguage(uid, code);
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logOut();
          nav.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        }
      }
    ]);
  };

  const selectedLang = userProfile.language ?? 'en';
  const completionScore = [
    userProfile.ageGroup,
    userProfile.activityLevel,
    userProfile.dietType,
    userProfile.city
  ].filter(Boolean).length;

  return (
    <ScreenWrapper>
      <View className="items-center py-6">
        <View
          className="mb-3 h-[62px] w-[62px] items-center justify-center rounded-full bg-card dark:bg-slate-900/72"
          style={{
            ...UI_SHADOWS.strong
          }}
        >
          <Text className="text-[22px] text-[#d5457a]" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
            {initials}
          </Text>
        </View>
        <Text className="mb-1 text-[21px] text-textPrimary dark:text-slate-100" style={{ fontFamily: FONTS.serif, fontWeight: '600' }}>
          {name}
        </Text>
        <Text className="mb-[2px] text-[12px] text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
          {auth.currentUser?.email ?? ''}
        </Text>
        {userProfile.ageGroup && (
          <Text className="text-[11px] text-textHint dark:text-slate-400" style={{ fontFamily: FONTS.sans }}>
            {userProfile.ageGroup} yrs · {userProfile.city ?? 'India'}
          </Text>
        )}
        <View className="mt-2 rounded-full bg-white/82 dark:bg-slate-900/70 px-3 py-[6px]" style={UI_SHADOWS.soft}>
          <Text className="text-[11px] text-textSecondary dark:text-slate-200" style={{ fontFamily: FONTS.sans }}>
            Profile strength: {completionScore}/4
          </Text>
        </View>
      </View>

      <Text className="mb-2 mt-4 text-[9px] uppercase tracking-[1px] text-textHint dark:text-slate-400" style={{ fontFamily: FONTS.sansBold }}>
        LANGUAGE
      </Text>
      <View
        className={UI_CLASSES.profileBlock}
        style={UI_SHADOWS.medium}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View className="flex-row gap-2 py-3">
            {LANGUAGES.map((lang) => {
              const isSel = selectedLang === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  className="rounded-full px-3 py-[6px]"
                  style={
                    isSel
                      ? { backgroundColor: COLORS.pinkBg }
                      : { backgroundColor: 'rgba(255,255,255,0.8)' }
                  }
                  onPress={() => handleLangChange(lang.code)}
                >
                  <Text
                    className="text-[13px]"
                    style={{
                      color: isSel ? COLORS.pink : COLORS.textMuted,
                      fontFamily: isSel ? FONTS.sansBold : FONTS.sans
                    }}
                  >
                    {lang.native}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <Text className="mb-2 mt-4 text-[9px] uppercase tracking-[1px] text-textHint dark:text-slate-400" style={{ fontFamily: FONTS.sansBold }}>
        MY PROFILE
      </Text>
      <View
        className={UI_CLASSES.profileBlock}
        style={UI_SHADOWS.medium}
      >
        {[
          { label: 'Activity level', value: userProfile.activityLevel ?? '—' },
          { label: 'Diet type', value: userProfile.dietType ?? '—' },
          {
            label: 'Known conditions',
            value: userProfile.conditions?.join(', ') || 'None'
          }
        ].map((row) => (
          <View
            key={row.label}
            className="flex-row items-center gap-3 py-3"
          >
            <Text className="flex-1 text-[13px] text-textSecondary dark:text-slate-200" style={{ fontFamily: FONTS.sans }}>
              {row.label}
            </Text>
            <Text className="text-[12px] text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
              {row.value}
            </Text>
          </View>
        ))}
        <TouchableOpacity
          className="flex-row items-center gap-3 py-3"
          onPress={() => nav.navigate('AboutYou1')}
        >
          <Text className="flex-1 text-[13px]" style={{ color: COLORS.pink, fontFamily: FONTS.sans }}>
            Edit profile →
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="mb-2 mt-4 text-[9px] uppercase tracking-[1px] text-textHint dark:text-slate-400" style={{ fontFamily: FONTS.sansBold }}>
        NOTIFICATIONS
      </Text>
      <View
        className={UI_CLASSES.profileBlock}
        style={UI_SHADOWS.medium}
      >
        {[
          {
            label: 'Period reminders',
            sub: 'Cycle tracking alerts',
            val: periodReminders,
            set: setPeriodReminders
          },
          {
            label: 'Weekly health nudge',
            sub: 'Tips based on your profile',
            val: weeklyNudge,
            set: setWeeklyNudge
          },
          {
            label: 'Share with doctor',
            sub: 'Export data to your doctor',
            val: shareWithDoc,
            set: setShareWithDoc
          }
        ].map((item) => (
          <View
            key={item.label}
            className="flex-row items-center gap-3 py-3"
          >
            <View style={{ flex: 1 }}>
              <Text className="text-[13px] text-textSecondary dark:text-slate-200" style={{ fontFamily: FONTS.sans }}>
                {item.label}
              </Text>
              <Text className="mt-[2px] text-[10px] text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
                {item.sub}
              </Text>
            </View>
            <Switch
              value={item.val}
              onValueChange={item.set}
              trackColor={{ true: COLORS.gradStart, false: COLORS.border }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>

      <Text className="mb-2 mt-4 text-[9px] uppercase tracking-[1px] text-textHint dark:text-slate-400" style={{ fontFamily: FONTS.sansBold }}>
        APPEARANCE
      </Text>
      <View
        className={UI_CLASSES.profileBlock}
        style={UI_SHADOWS.medium}
      >
        <View className="flex-row items-center gap-3 py-3">
          <View style={{ flex: 1 }}>
            <Text className="text-[13px] text-textSecondary dark:text-slate-200" style={{ fontFamily: FONTS.sans }}>
              Dark theme
            </Text>
            <Text className="mt-[2px] text-[10px] text-textMuted dark:text-slate-300" style={{ fontFamily: FONTS.sans }}>
              Switch to a night-friendly premium look
            </Text>
          </View>
          <Switch
            value={themeMode === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ true: COLORS.gradStart, false: COLORS.border }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <Text className="mb-2 mt-4 text-[9px] uppercase tracking-[1px] text-textHint dark:text-slate-400" style={{ fontFamily: FONTS.sansBold }}>
        LEGAL
      </Text>
      <View
        className={UI_CLASSES.profileBlock}
        style={UI_SHADOWS.medium}
      >
        {['Privacy policy', 'Terms of service', 'Data & permissions'].map((item) => (
          <TouchableOpacity
            key={item}
            className="flex-row items-center gap-3 py-3"
          >
            <Text className="flex-1 text-[13px] text-textSecondary dark:text-slate-200" style={{ fontFamily: FONTS.sans }}>
              {item}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity className="flex-row items-center justify-center gap-2 py-4" onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={16} color={COLORS.red} />
        <Text className="text-[14px]" style={{ color: COLORS.red, fontFamily: FONTS.sansBold }}>
          Sign out
        </Text>
      </TouchableOpacity>

      <Text className="pb-4 text-center text-[10px] text-textHint dark:text-slate-400" style={{ fontFamily: FONTS.sans }}>
        Nirogya v1.0 · Made with care for Indian women
      </Text>
    </ScreenWrapper>
  );
}


