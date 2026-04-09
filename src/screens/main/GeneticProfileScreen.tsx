import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import ScreenWrapper from '../../components/ScreenWrapper';
import { GradientButton } from '../../components/UI';
import { COLORS, FONTS } from '../../constants/theme';
import { UI_CLASSES, UI_SHADOWS } from '../../constants/ui';
import {
  GeneticFlag,
  GeneticProfile,
  getGeneticProfile,
  uploadGenomicVcf
} from '../../services/genomicService';
import { useEntranceAnimation } from '../../hooks/useEntranceAnimation';

type PrsKey = 't2d' | 'cad' | 'htn';

function getPrsRiskBand(key: PrsKey, score: number) {
  const thresholds: Record<PrsKey, { medium: number; high: number }> = {
    t2d: { medium: 0.25, high: 0.5 },
    cad: { medium: 0.2, high: 0.4 },
    htn: { medium: 0.18, high: 0.35 }
  };

  const { medium, high } = thresholds[key];
  if (score >= high) {
    return {
      label: 'HIGH',
      bg: COLORS.redBg,
      text: COLORS.red
    };
  }
  if (score >= medium) {
    return {
      label: 'MEDIUM',
      bg: COLORS.amberBg,
      text: COLORS.amber
    };
  }
  return {
    label: 'LOW',
    bg: COLORS.tealBg,
    text: COLORS.teal
  };
}

function getFlagTone(severity: string) {
  const normalized = String(severity || '').toUpperCase();
  if (normalized === 'HIGH') {
    return { bg: COLORS.redBg, text: COLORS.red };
  }
  if (normalized === 'MEDIUM') {
    return { bg: COLORS.amberBg, text: COLORS.amber };
  }
  return { bg: COLORS.tealBg, text: COLORS.teal };
}

export default function GeneticProfileScreen() {
  const nav = useNavigation<any>();
  const [profile, setProfile] = useState<GeneticProfile | null>(null);
  const [flags, setFlags] = useState<GeneticFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const heroAnim = useEntranceAnimation(0, 10);
  const cardAnim = useEntranceAnimation(70, 12);
  const contentAnim = useEntranceAnimation(130, 14);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = await getGeneticProfile();
      setProfile(payload.geneticProfile);
      setFlags(Array.isArray(payload.flags) ? payload.flags : []);
    } catch (err: any) {
      console.warn('[Genomics] Failed to load profile', err);
      Alert.alert(
        'Could not load genetic profile',
        err?.message || 'Please try again in a moment.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const handleUpload = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['*/*']
    });

    if (picked.canceled) return;

    const file = picked.assets?.[0];
    if (!file?.uri) {
      Alert.alert('Upload failed', 'Could not access the selected file.');
      return;
    }

    const filename = String(file.name || 'genome.vcf').trim();
    if (!filename.toLowerCase().endsWith('.vcf')) {
      Alert.alert('Invalid file type', 'Please choose a .vcf genomic file.');
      return;
    }

    setIsUploading(true);
    try {
      const payload = await uploadGenomicVcf({
        uri: file.uri,
        name: file.name || 'genome.vcf',
        mimeType: file.mimeType || undefined
      });

      setProfile(payload.geneticProfile);
      setFlags(Array.isArray(payload.flags) ? payload.flags : []);

      const total =
        payload.summary?.rsIdCount || payload.geneticProfile?.rsIds?.length || 0;

      Alert.alert(
        'Analysis completed',
        `Processed ${total} variants and updated your genetic profile.`
      );
    } catch (err: any) {
      console.warn('[Genomics] Upload failed', err);
      Alert.alert('Upload failed', err?.message || 'Unable to process this VCF.');
    } finally {
      setIsUploading(false);
    }
  };

  const prsCards = [
    {
      key: 't2d' as const,
      label: 'Type 2 Diabetes',
      score: Number(profile?.prsT2d || 0)
    },
    {
      key: 'cad' as const,
      label: 'Coronary Artery Disease',
      score: Number(profile?.prsCad || 0)
    },
    {
      key: 'htn' as const,
      label: 'Hypertension',
      score: Number(profile?.prsHtn || 0)
    }
  ];

  return (
    <ScreenWrapper>
      <Animated.View style={heroAnim}>
        <View className="mb-4 flex-row items-center justify-between pt-1">
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full bg-white/85 dark:bg-slate-900/70"
            style={UI_SHADOWS.soft}
            onPress={() => nav.goBack()}
            activeOpacity={0.82}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            className="rounded-full bg-white/85 dark:bg-slate-900/70 px-3 py-[7px]"
            style={UI_SHADOWS.soft}
            onPress={() => {
              if (!isLoading && !isUploading) {
                void loadProfile();
              }
            }}
            activeOpacity={0.82}
          >
            <Text
              className="text-[11px] text-textSecondary dark:text-slate-200"
              style={{ fontFamily: FONTS.sansBold }}
            >
              Refresh
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          className="text-[29px] text-textPrimary dark:text-slate-100"
          style={{ fontFamily: FONTS.serif, fontWeight: '600', letterSpacing: -0.4 }}
        >
          Genetic Profile
        </Text>
        <Text
          className="mt-1 text-[12px] leading-[18px] text-textSecondary dark:text-slate-200"
          style={{ fontFamily: FONTS.sans }}
        >
          Upload your VCF file to generate a genetics-informed health risk summary.
        </Text>
      </Animated.View>

      <Animated.View style={cardAnim}>
        <View className={`mt-4 ${UI_CLASSES.cardShell} px-4 py-4`} style={UI_SHADOWS.medium}>
          <View className="mb-3 flex-row items-center">
            <View
              className="h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: COLORS.pinkBg }}
            >
              <MaterialCommunityIcons
                name="dna"
                size={20}
                color={COLORS.pink}
              />
            </View>
            <View className="ml-3 flex-1">
              <Text
                className="text-[14px] text-textPrimary dark:text-slate-100"
                style={{ fontFamily: FONTS.sansBold }}
              >
                Upload VCF
              </Text>
              <Text
                className="mt-[2px] text-[11px] text-textMuted dark:text-slate-300"
                style={{ fontFamily: FONTS.sans }}
              >
                We only process rsID-based variants for health risk interpretation.
              </Text>
            </View>
          </View>

          <GradientButton
            label={isUploading ? 'Analyzing genome...' : 'Select VCF file'}
            onPress={() => {
              void handleUpload();
            }}
            loading={isUploading}
            disabled={isUploading}
          />
        </View>
      </Animated.View>

      <Animated.View style={contentAnim}>
        {isLoading ? (
          <View className="mt-10 items-center">
            <ActivityIndicator size="large" color={COLORS.gradStart} />
            <Text
              className="mt-3 text-[12px] text-textMuted dark:text-slate-300"
              style={{ fontFamily: FONTS.sans }}
            >
              Loading genetic insights...
            </Text>
          </View>
        ) : (
          <>
            <Text
              className="mb-2 mt-5 text-[9px] uppercase tracking-[1.4px] text-textHint dark:text-slate-400"
              style={{ fontFamily: FONTS.sansBold }}
            >
              Polygenic Risk Scores
            </Text>

            <View className="gap-2">
              {prsCards.map((card) => {
                const band = getPrsRiskBand(card.key, card.score);
                return (
                  <View
                    key={card.key}
                    className={`${UI_CLASSES.cardShell} flex-row items-center justify-between px-4 py-3`}
                    style={UI_SHADOWS.soft}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        className="text-[12px] text-textSecondary dark:text-slate-200"
                        style={{ fontFamily: FONTS.sansBold }}
                      >
                        {card.label}
                      </Text>
                      <Text
                        className="mt-[2px] text-[11px] text-textMuted dark:text-slate-300"
                        style={{ fontFamily: FONTS.sans }}
                      >
                        Score: {card.score.toFixed(4)}
                      </Text>
                    </View>
                    <View
                      className="rounded-full px-3 py-[6px]"
                      style={{ backgroundColor: band.bg }}
                    >
                      <Text style={{ color: band.text, fontFamily: FONTS.sansBold, fontSize: 11 }}>
                        {band.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <Text
              className="mb-2 mt-5 text-[9px] uppercase tracking-[1.4px] text-textHint dark:text-slate-400"
              style={{ fontFamily: FONTS.sansBold }}
            >
              Genetic Risk Flags
            </Text>

            {flags.length === 0 ? (
              <View className={`${UI_CLASSES.cardShell} px-4 py-4`} style={UI_SHADOWS.soft}>
                <Text
                  className="text-[12px] leading-[18px] text-textSecondary dark:text-slate-200"
                  style={{ fontFamily: FONTS.sans }}
                >
                  No actionable flags yet. Upload a VCF file to generate personalized findings.
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {flags.map((flag, index) => {
                  const tone = getFlagTone(flag.severity);
                  const key = `${flag.type}-${flag.gene || 'na'}-${index}`;

                  return (
                    <View
                      key={key}
                      className={`${UI_CLASSES.cardShell} px-4 py-4`}
                      style={UI_SHADOWS.soft}
                    >
                      <View className="mb-[7px] flex-row items-center justify-between">
                        <Text
                          className="text-[12px] text-textPrimary dark:text-slate-100"
                          style={{ fontFamily: FONTS.sansBold }}
                        >
                          {flag.gene || 'Polygenic risk insight'}
                        </Text>
                        <View
                          className="rounded-full px-3 py-[5px]"
                          style={{ backgroundColor: tone.bg }}
                        >
                          <Text
                            className="text-[10px]"
                            style={{ color: tone.text, fontFamily: FONTS.sansBold }}
                          >
                            {String(flag.severity || 'LOW').toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <Text
                        className="text-[12px] leading-[18px] text-textSecondary dark:text-slate-200"
                        style={{ fontFamily: FONTS.sans }}
                      >
                        {flag.plainLanguage}
                      </Text>

                      {!!flag.conditions?.length && (
                        <Text
                          className="mt-[7px] text-[11px] text-textMuted dark:text-slate-300"
                          style={{ fontFamily: FONTS.sans }}
                        >
                          Conditions: {flag.conditions.join(', ')}
                        </Text>
                      )}

                      {!!flag.drugWarning && (
                        <View
                          className="mt-[8px] rounded-lg px-3 py-[8px]"
                          style={{ backgroundColor: COLORS.amberBg }}
                        >
                          <Text
                            className="text-[11px] leading-[16px]"
                            style={{ color: COLORS.amber, fontFamily: FONTS.sans }}
                          >
                            {flag.drugWarning}
                          </Text>
                        </View>
                      )}

                      <View
                        className="mt-[8px] rounded-lg px-3 py-[8px]"
                        style={{ backgroundColor: COLORS.tealBg }}
                      >
                        <Text
                          className="text-[11px] leading-[16px]"
                          style={{ color: COLORS.teal, fontFamily: FONTS.sans }}
                        >
                          {flag.actionRequired}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View className={`${UI_CLASSES.cardShell} mb-8 mt-4 px-4 py-3`} style={UI_SHADOWS.soft}>
              <Text
                className="text-[11px] leading-[17px] text-textMuted dark:text-slate-300"
                style={{ fontFamily: FONTS.sans }}
              >
                Genetic insights are supportive, not diagnostic. Always confirm decisions with a licensed clinician.
              </Text>
            </View>
          </>
        )}
      </Animated.View>
    </ScreenWrapper>
  );
}
