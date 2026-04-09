import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../../components/ScreenWrapper';
import {
  CATEGORY_COLORS,
  COLORS,
  FONTS,
  RISK_COLORS,
  SYMPTOM_CATEGORIES
} from '../../constants/theme';
import { UI_CLASSES, UI_SHADOWS } from '../../constants/ui';
import { useApp } from '../../context/AppContext';
import { auth } from '../../services/authService';
import {
  Assessment,
  getRecentAssessments
} from '../../services/assessmentService';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';
import { t } from '../../localization/i18n';

function extractFirstName(value?: string | null): string {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  const token = trimmed.split(/[\s@._-]+/).filter(Boolean)[0];
  if (!token) return '';

  return token.charAt(0).toUpperCase() + token.slice(1);
}

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { userProfile } = useApp();
  const language = userProfile.language ?? 'en';
  const [search, setSearch] = useState('');
  const [recent, setRecent] = useState<Assessment[]>([]);
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    let active = true;

    const loadRecent = async () => {
      if (!uid) {
        if (active) setRecent([]);
        return;
      }

      try {
        const assessments = await getRecentAssessments(uid, 3);
        if (active) setRecent(assessments);
      } catch (err) {
        console.warn('[Home] Failed to load recent assessments', err);
      }
    };

    void loadRecent();

    return () => {
      active = false;
    };
  }, [uid]);
  const heroAnim = useEntranceAnimation(0, 10);
  const recentAnim = useEntranceAnimation(90, 12);
  const contentAnim = useEntranceAnimation(170, 14);

  useEffect(() => {
    const updateHour = () => setCurrentHour(new Date().getHours());
    const timer = setInterval(updateHour, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setCurrentHour(new Date().getHours());
    }, [])
  );

  const timeOfDay =
    currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';
  const firstName =
    extractFirstName(userProfile.name) ||
    extractFirstName(auth.currentUser?.displayName) ||
    extractFirstName(auth.currentUser?.email) ||
    'Friend';
  const greetingByTime =
    timeOfDay === 'morning'
      ? t(language, 'home_good_morning')
      : timeOfDay === 'afternoon'
        ? t(language, 'home_good_afternoon')
        : t(language, 'home_good_evening');
  const wellnessSparks = [
    t(language, 'home_wellness_hydration'),
    t(language, 'home_wellness_sleep'),
    t(language, 'home_wellness_stress')
  ];

  const handleSymptomSearch = () => {
    if (search.trim()) {
      nav.navigate('Assessment', { symptom: search.trim() });
      setSearch('');
    }
  };

  const handleCategory = (cat: (typeof SYMPTOM_CATEGORIES)[0]) => {
    nav.navigate('Assessment', { symptom: cat.label });
  };

  const openNiraChat = () => {
    nav.navigate('NiraChat');
  };

  const openSavedChats = () => {
    nav.navigate('NiraChat', { openHistoryAt: Date.now() });
  };

  const openGeneticProfile = () => {
    nav.navigate('GeneticProfile');
  };

  return (
    <ScreenWrapper>
      <Animated.View style={heroAnim}>
        <View className="mb-5 flex-row items-center justify-between pt-2">
          <View>
            <Text
              className="text-[31px] text-textPrimary dark:text-slate-100"
              style={{
                fontFamily: FONTS.serif,
                fontWeight: '600',
                letterSpacing: -0.5
              }}
            >
              {`Hi, ${firstName}!!`}
            </Text>
            <Text
              className="mt-[2px] text-[12px] text-textSecondary dark:text-slate-200"
              style={{ fontFamily: FONTS.sans }}
            >
              {greetingByTime}
            </Text>
          </View>
          <TouchableOpacity
            className="h-[40px] w-[40px] items-center justify-center rounded-full bg-white/85 dark:bg-slate-900/72"
            style={UI_SHADOWS.medium}
            onPress={() => nav.navigate('Profile')}
          >
            <Text
              className="text-[16px] text-brandStart"
              style={{ fontFamily: FONTS.serif, fontWeight: '600' }}
            >
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mb-4 flex-row flex-wrap gap-2">
          {wellnessSparks.map((spark) => (
            <View
              key={spark}
              className="rounded-full bg-white/80 dark:bg-slate-900/68 px-[13px] py-[8px]"
              style={UI_SHADOWS.soft}
            >
              <Text
                className="text-[11px] tracking-[0.1px] text-textSecondary dark:text-slate-200"
                style={{ fontFamily: FONTS.sans }}
              >
                {spark}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={recentAnim}>
        {recent.length > 0 && (
          <TouchableOpacity
            className={`mb-4 ${UI_CLASSES.cardShell} px-4 py-[14px]`}
            style={UI_SHADOWS.strong}
            onPress={() => nav.navigate('History')}
            activeOpacity={0.85}
          >
            <View className="mb-[2px] flex-row items-center justify-between">
              <Text
                className="text-[10px] uppercase tracking-[1.2px] text-textHint dark:text-slate-400"
                style={{ fontFamily: FONTS.sansBold }}
              >
                {t(language, 'home_last_check')}
              </Text>
              <View
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    RISK_COLORS[recent[0].riskLevel] ?? COLORS.pink
                }}
              />
            </View>
            <Text
              className="mb-[4px] text-[18px] leading-[23px] text-textPrimary dark:text-slate-100"
              style={{ fontFamily: FONTS.serif, fontWeight: '600' }}
            >
              {recent[0].symptom}
            </Text>
            <Text
              className="mb-[6px] text-[12px] leading-[18px] text-textSecondary dark:text-slate-200"
              style={{ fontFamily: FONTS.sans }}
            >
              {recent[0].diagnosis}
            </Text>
            <Text
              className="text-[10px] text-textMuted dark:text-slate-300"
              style={{ fontFamily: FONTS.sans }}
            >
              {t(language, 'home_tap_history')}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <Animated.View style={contentAnim}>
        <Text
          className={UI_CLASSES.sectionEyebrow}
          style={{ fontFamily: FONTS.sansBold }}
        >
          {t(language, 'home_type_symptom')}
        </Text>
        <View
          className="mb-5 flex-row items-center gap-2 rounded-xl2 bg-card dark:bg-slate-900/72 px-3 py-[11px]"
          style={UI_SHADOWS.medium}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={16}
            color={COLORS.textMuted}
          />
          <TextInput
            className="flex-1 text-[13px] text-textPrimary dark:text-slate-100"
            style={{ fontFamily: FONTS.sans }}
            placeholder={t(language, 'home_search_placeholder')}
            placeholderTextColor={COLORS.textHint}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSymptomSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={handleSymptomSearch} className="px-2">
              <Text
                className="text-[12px] text-[#d5457a]"
                style={{ fontFamily: FONTS.sansBold }}
              >
                {t(language, 'home_go')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="mb-5">
          <TouchableOpacity
            className="overflow-hidden rounded-2xl"
            style={UI_SHADOWS.brandGlow}
            onPress={openNiraChat}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[COLORS.gradStart, COLORS.gradMid, COLORS.gradEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="flex-row items-center px-4 py-3"
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/22">
                <MaterialCommunityIcons
                  name="robot-excited-outline"
                  size={21}
                  color="#fff"
                />
              </View>
              <View className="ml-3 flex-1">
                <Text
                  className="text-[15px] text-white"
                  style={{ fontFamily: FONTS.sansBold }}
                >
                  Diagnos with Nira
                </Text>
                <Text
                  className="mt-[1px] text-[11px] text-white/90"
                  style={{ fontFamily: FONTS.sans }}
                >
                  Chat for guided follow-up and instant care direction.
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#fff"
              />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-[9px] flex-row items-center self-start rounded-full border border-borderSoft bg-card dark:bg-slate-900/72 px-3 py-[7px]"
            style={UI_SHADOWS.soft}
            onPress={openSavedChats}
            activeOpacity={0.84}
          >
            <MaterialCommunityIcons
              name="archive-outline"
              size={14}
              color={COLORS.textSecondary}
            />
            <Text
              className="ml-[6px] text-[11px] text-textSecondary dark:text-slate-200"
              style={{ fontFamily: FONTS.sansBold }}
            >
              Open previous chats quickly
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-[9px] flex-row items-center self-start rounded-full border px-3 py-[7px]"
            style={{
              ...UI_SHADOWS.soft,
              borderColor: COLORS.pinkBorder,
              backgroundColor: COLORS.pinkBg
            }}
            onPress={openGeneticProfile}
            activeOpacity={0.84}
          >
            <MaterialCommunityIcons
              name="dna"
              size={14}
              color={COLORS.pink}
            />
            <Text
              className="ml-[6px] text-[11px]"
              style={{ color: COLORS.pink, fontFamily: FONTS.sansBold }}
            >
              Open genetic profile
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          className={UI_CLASSES.sectionEyebrow}
          style={{ fontFamily: FONTS.sansBold }}
        >
          {t(language, 'home_choose_category')}
        </Text>
        <View className="flex-row flex-wrap gap-[10px]">
          {SYMPTOM_CATEGORIES.map((cat) => {
            const c =
              CATEGORY_COLORS[cat.color as keyof typeof CATEGORY_COLORS] ??
              CATEGORY_COLORS.pink;
            return (
              <TouchableOpacity
                key={cat.id}
                className="w-[47%] rounded-xl2 px-4 py-[13px]"
                style={{
                  backgroundColor: c.bg,
                  ...UI_SHADOWS.soft
                }}
                onPress={() => handleCategory(cat)}
                activeOpacity={0.8}
              >
                <View
                  className="mb-2 h-[34px] w-[34px] items-center justify-center rounded-md"
                  style={{ backgroundColor: `${c.bg}99` }}
                >
                  <MaterialCommunityIcons
                    name={cat.icon as any}
                    size={18}
                    color={c.icon}
                  />
                </View>
                <Text
                  className="mb-[2px] text-[12px]"
                  style={{ color: c.text, fontFamily: FONTS.sansBold }}
                >
                  {cat.label}
                </Text>
                <Text
                  className="text-[10px] leading-[15px] text-textMuted dark:text-slate-300"
                  style={{ fontFamily: FONTS.sans }}
                >
                  {cat.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </ScreenWrapper>
  );
}
