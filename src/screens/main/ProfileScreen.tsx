// src/screens/main/ProfileScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  LANGUAGES
} from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { auth, logOut, saveLanguage } from '../../services/authService';

export default function ProfileScreen() {
  const nav = useNavigation<any>();
  const { userProfile, setUserProfile } = useApp();

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

  return (
    <ScreenWrapper>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{auth.currentUser?.email ?? ''}</Text>
        {userProfile.ageGroup && (
          <Text style={styles.meta}>
            {userProfile.ageGroup} yrs · {userProfile.city ?? 'India'}
          </Text>
        )}
      </View>

      {/* Language */}
      <Text style={styles.sectionLabel}>LANGUAGE</Text>
      <View style={styles.card}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 4 }}
        >
          <View style={styles.langRow}>
            {LANGUAGES.map((lang) => {
              const isSel = selectedLang === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langChip, isSel && styles.langChipSel]}
                  onPress={() => handleLangChange(lang.code)}
                >
                  <Text
                    style={[
                      styles.langChipText,
                      isSel && styles.langChipTextSel
                    ]}
                  >
                    {lang.native}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Profile info shortcut */}
      <Text style={styles.sectionLabel}>MY PROFILE</Text>
      <View style={styles.card}>
        {[
          { label: 'Activity level', value: userProfile.activityLevel ?? '—' },
          { label: 'Diet type', value: userProfile.dietType ?? '—' },
          {
            label: 'Known conditions',
            value: userProfile.conditions?.join(', ') || 'None'
          }
        ].map((row, i, arr) => (
          <View
            key={row.label}
            style={[styles.settingRow, i < arr.length - 1 && styles.rowBorder]}
          >
            <Text style={styles.settingLabel}>{row.label}</Text>
            <Text style={styles.settingVal}>{row.value}</Text>
          </View>
        ))}
        <TouchableOpacity
          style={[
            styles.settingRow,
            { borderTopWidth: 0.5, borderTopColor: COLORS.border }
          ]}
          onPress={() => nav.navigate('AboutYou1')}
        >
          <Text style={[styles.settingLabel, { color: COLORS.pink }]}>
            Edit profile →
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications */}
      <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
      <View style={styles.card}>
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
        ].map((item, i, arr) => (
          <View
            key={item.label}
            style={[styles.settingRow, i < arr.length - 1 && styles.rowBorder]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{item.label}</Text>
              <Text style={styles.settingSubLabel}>{item.sub}</Text>
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

      {/* Data & Privacy */}
      <Text style={styles.sectionLabel}>LEGAL</Text>
      <View style={styles.card}>
        {['Privacy policy', 'Terms of service', 'Data & permissions'].map(
          (item, i, arr) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.settingRow,
                i < arr.length - 1 && styles.rowBorder
              ]}
            >
              <Text style={styles.settingLabel}>{item}</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={16}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={16} color={COLORS.red} />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>
        Nirogya v1.0 · Made with care for Indian women
      </Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  avatarSection: { alignItems: 'center', paddingVertical: SPACING.xl },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.pinkBg,
    borderWidth: 1.5,
    borderColor: COLORS.pinkBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md
  },
  avatarText: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    color: COLORS.pink,
    fontWeight: '600'
  },
  name: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  email: {
    fontSize: 12,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    marginBottom: 2
  },
  meta: { fontSize: 11, fontFamily: FONTS.sans, color: COLORS.textHint },

  sectionLabel: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.textHint,
    fontFamily: FONTS.sansBold,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm
  },
  langRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.md
  },
  langChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard
  },
  langChipSel: {
    backgroundColor: COLORS.pinkBg,
    borderColor: COLORS.pinkBorder
  },
  langChipText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONTS.sans
  },
  langChipTextSel: { color: COLORS.pink, fontFamily: FONTS.sansBold },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md
  },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  settingLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.textSecondary
  },
  settingSubLabel: {
    fontSize: 10,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    marginTop: 2
  },
  settingVal: { fontSize: 12, fontFamily: FONTS.sans, color: COLORS.textMuted },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg
  },
  logoutText: { fontSize: 14, fontFamily: FONTS.sansBold, color: COLORS.red },
  version: {
    fontSize: 10,
    fontFamily: FONTS.sans,
    color: COLORS.textHint,
    textAlign: 'center',
    paddingBottom: SPACING.lg
  }
});
