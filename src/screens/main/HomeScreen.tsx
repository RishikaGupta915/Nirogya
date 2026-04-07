// src/screens/main/HomeScreen.tsx

import React, { useEffect, useState } from 'react';
import NiraIconButton from '../../components/NiraIconButton';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SYMPTOM_CATEGORIES
} from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import {
  getRecentAssessments,
  Assessment
} from '../../services/assessmentService';
import { auth } from '../../services/authService';

const COLOR_MAP: Record<
  string,
  { bg: string; border: string; text: string; icon: string }
> = {
  pink: {
    bg: COLORS.pinkBg,
    border: COLORS.pinkBorder,
    text: COLORS.pink,
    icon: COLORS.pink
  },
  purple: {
    bg: COLORS.purpleBg,
    border: COLORS.purpleBorder,
    text: COLORS.purple,
    icon: COLORS.purple
  },
  teal: {
    bg: COLORS.tealBg,
    border: COLORS.tealBorder,
    text: COLORS.teal,
    icon: COLORS.teal
  },
  amber: {
    bg: COLORS.amberBg,
    border: COLORS.amberBorder,
    text: COLORS.amber,
    icon: COLORS.amber
  },
  indigo: {
    bg: COLORS.indigoBg,
    border: COLORS.indigoBorder,
    text: COLORS.indigo,
    icon: COLORS.indigo
  },
  red: {
    bg: COLORS.redBg,
    border: COLORS.redBorder,
    text: COLORS.red,
    icon: COLORS.red
  },
  blue: {
    bg: COLORS.blueBg,
    border: COLORS.blueBorder,
    text: COLORS.blue,
    icon: COLORS.blue
  }
};

const RISK_COLORS: Record<string, string> = {
  low: COLORS.riskLow,
  medium: COLORS.riskMed,
  high: COLORS.riskHigh
};

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { userProfile } = useApp();
  const [search, setSearch] = useState('');
  const [recent, setRecent] = useState<Assessment[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      getRecentAssessments(uid, 3)
        .then(setRecent)
        .catch(() => {});
    }
  }, []);

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const handleSymptomSearch = () => {
    if (search.trim()) {
      nav.navigate('Assessment', { symptom: search.trim() });
      setSearch('');
    }
  };

  const handleCategory = (cat: (typeof SYMPTOM_CATEGORIES)[0]) => {
    nav.navigate('Assessment', { symptom: cat.label });
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Nirogya</Text>
          <Text style={styles.timeGreet}>
            Good {timeOfDay}, {userProfile.name?.split(' ')[0] ?? 'there'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => nav.navigate('Profile')}
        >
          <Text style={styles.avatarText}>
            {(userProfile.name ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Nira AI Chat Icon */}
      <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
        <NiraIconButton />
      </View>
      {/* Recent assessment card */}
      {recent.length > 0 && (
        <TouchableOpacity
          style={styles.recentCard}
          onPress={() => nav.navigate('History')}
          activeOpacity={0.85}
        >
          <View style={styles.recentTop}>
            <Text style={styles.recentTitle}>
              Last check: {recent[0].symptom}
            </Text>
            <View
              style={[
                styles.riskDot,
                { backgroundColor: RISK_COLORS[recent[0].riskLevel] }
              ]}
            />
          </View>
          <Text style={styles.recentDiag}>{recent[0].diagnosis}</Text>
          <Text style={styles.recentSub}>Tap to view history →</Text>
        </TouchableOpacity>
      )}

      {/* Search bar */}
      <Text style={styles.sectionLabel}>TYPE YOUR SYMPTOM</Text>
      <View style={styles.searchBox}>
        <MaterialCommunityIcons
          name="magnify"
          size={16}
          color={COLORS.textMuted}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="e.g. knee pain, hair loss, nausea…"
          placeholderTextColor={COLORS.textHint}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSymptomSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={handleSymptomSearch}
            style={styles.searchGo}
          >
            <Text style={styles.searchGoText}>Go →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <Text style={styles.sectionLabel}>OR CHOOSE A CATEGORY</Text>
      <View style={styles.catGrid}>
        {SYMPTOM_CATEGORIES.map((cat) => {
          const c = COLOR_MAP[cat.color] ?? COLOR_MAP.pink;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catCard,
                { backgroundColor: c.bg, borderColor: c.border }
              ]}
              onPress={() => handleCategory(cat)}
              activeOpacity={0.8}
            >
              <View style={[styles.catIcon, { backgroundColor: `${c.bg}99` }]}>
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={18}
                  color={c.icon}
                />
              </View>
              <Text style={[styles.catName, { color: c.text }]}>
                {cat.label}
              </Text>
              <Text style={styles.catSub}>{cat.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.sm
  },
  appName: {
    fontFamily: FONTS.serif,
    fontSize: 26,
    fontWeight: '600',
    color: COLORS.pink,
    letterSpacing: -0.5
  },
  timeGreet: {
    fontSize: 12,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    marginTop: 2
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.pinkBg,
    borderWidth: 1.5,
    borderColor: COLORS.pinkBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontFamily: FONTS.serif,
    fontSize: 16,
    color: COLORS.pink,
    fontWeight: '600'
  },

  recentCard: {
    backgroundColor: 'rgba(45,10,30,0.8)',
    borderWidth: 0.5,
    borderColor: COLORS.pinkBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg
  },
  recentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  recentTitle: { fontSize: 13, fontFamily: FONTS.sansBold, color: COLORS.pink },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  recentDiag: {
    fontSize: 11,
    fontFamily: FONTS.sans,
    color: COLORS.textMuted,
    marginBottom: 6
  },
  recentSub: {
    fontSize: 10,
    fontFamily: FONTS.sans,
    color: 'rgba(249,168,201,0.5)'
  },

  sectionLabel: {
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.textHint,
    fontFamily: FONTS.sansBold,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.sans,
    color: COLORS.textPrimary
  },
  searchGo: { paddingHorizontal: SPACING.sm },
  searchGoText: {
    fontSize: 12,
    fontFamily: FONTS.sansBold,
    color: COLORS.pink
  },

  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm
  },
  catCard: {
    width: '47%',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 0.5
  },
  catIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm
  },
  catName: { fontSize: 12, fontFamily: FONTS.sansBold, marginBottom: 2 },
  catSub: { fontSize: 10, fontFamily: FONTS.sans, color: COLORS.textMuted }
});
