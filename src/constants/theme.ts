// src/constants/theme.ts

export const COLORS = {
  // Backgrounds
  bg:         '#f4f8ff',
  bgCard:     'rgba(255,255,255,0.82)',
  bgCardHover:'#ffffff',
  bgOverlay:  '#edf4ff',

  // Brand gradient stops
  gradStart:  '#ff6b8a',
  gradMid:    '#ff9f5a',
  gradEnd:    '#4bc6d7',

  // Accent colours (per category)
  pink:       '#d5457a',
  pinkBg:     'rgba(255,107,138,0.14)',
  pinkBorder: 'rgba(255,107,138,0.34)',

  purple:     '#7c5cf5',
  purpleBg:   'rgba(124,92,245,0.14)',
  purpleBorder:'rgba(124,92,245,0.32)',

  teal:       '#0f9c9f',
  tealBg:     'rgba(75,198,215,0.14)',
  tealBorder: 'rgba(75,198,215,0.3)',

  amber:      '#bc7800',
  amberBg:    'rgba(255,179,71,0.16)',
  amberBorder:'rgba(255,179,71,0.34)',

  indigo:     '#4169e1',
  indigoBg:   'rgba(65,105,225,0.14)',
  indigoBorder:'rgba(65,105,225,0.3)',

  red:        '#dd3f5e',
  redBg:      'rgba(221,63,94,0.13)',
  redBorder:  'rgba(221,63,94,0.32)',

  blue:       '#1f7acc',
  blueBg:     'rgba(31,122,204,0.13)',
  blueBorder: 'rgba(31,122,204,0.32)',

  // Text
  textPrimary:   '#17233b',
  textSecondary: '#324261',
  textMuted:     '#5f7398',
  textHint:      '#8ea2c4',

  // Borders
  border:        'rgba(34,63,115,0.14)',
  borderMed:     'rgba(34,63,115,0.2)',

  // Risk levels
  riskLow:       '#34d399',
  riskMed:       '#fbbf24',
  riskHigh:      '#f87171',
};

export const FONTS = {
  serif:       'Fraunces',
  sans:        'PlusJakartaSans',
  sansBold:    'PlusJakartaSans-SemiBold',
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
};

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 999,
};

export const BRAND_GRADIENT = [
  COLORS.gradStart,
  COLORS.gradMid,
  COLORS.gradEnd
] as const;

export const SCREEN_BG_GRADIENT = ['#f7fbff', '#eff5ff', '#f8f6ff'] as const;

export type CategoryColor =
  | 'pink'
  | 'purple'
  | 'teal'
  | 'amber'
  | 'indigo'
  | 'red'
  | 'blue';

export const CATEGORY_COLORS: Record<
  CategoryColor,
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

export const RISK_COLORS: Record<'low' | 'medium' | 'high', string> = {
  low: COLORS.riskLow,
  medium: COLORS.riskMed,
  high: COLORS.riskHigh
};

export const SYMPTOM_CATEGORIES = [
  { id: 'headache',   label: 'Headache',     sub: 'Head, migraine',    color: 'pink',   icon: 'head-cog-outline' },
  { id: 'fatigue',    label: 'Fatigue',      sub: 'Energy, sleep',     color: 'purple', icon: 'lightning-bolt' },
  { id: 'periods',    label: 'Periods',      sub: 'Cycle, PCOS',       color: 'teal',   icon: 'calendar-heart' },
  { id: 'skin',       label: 'Skin & hair',  sub: 'Acne, hairfall',    color: 'amber',  icon: 'face-woman' },
  { id: 'chest',      label: 'Chest & heart',sub: 'Palpitations',      color: 'red',    icon: 'heart-pulse' },
  { id: 'joints',     label: 'Joint pain',   sub: 'Knees, back',       color: 'blue',   icon: 'bone' },
  { id: 'stomach',    label: 'Stomach',      sub: 'Digestion, nausea', color: 'indigo', icon: 'stomach' },
  { id: 'mental',     label: 'Mental health',sub: 'Mood, anxiety',     color: 'purple', icon: 'brain' },
];

export const LANGUAGES = [
  { code: 'ta', native: 'தமிழ்',    english: 'Tamil' },
  { code: 'hi', native: 'हिन्दी',   english: 'Hindi' },
  { code: 'te', native: 'తెలుగు',   english: 'Telugu' },
  { code: 'bn', native: 'বাংলা',    english: 'Bengali' },
  { code: 'kn', native: 'ಕನ್ನಡ',   english: 'Kannada' },
  { code: 'ml', native: 'മലയാളം',  english: 'Malayalam' },
  { code: 'mr', native: 'मराठी',    english: 'Marathi' },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ',  english: 'Punjabi' },
  { code: 'or', native: 'ଓଡ଼ିଆ',   english: 'Odia' },
  { code: 'en', native: 'English',   english: 'English' },
];

export const GREETINGS: Record<string, string> = {
  ta: 'வணக்கம்',
  hi: 'नमस्ते',
  te: 'నమస్కారం',
  bn: 'নমস্কার',
  kn: 'ನಮಸ್ಕಾರ',
  ml: 'നമസ്കാരം',
  mr: 'नमस्कार',
  gu: 'નમસ્તે',
  pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
  or: 'ନମସ୍କାର',
  en: 'Hello',
};