// src/constants/theme.ts

export type ThemeMode = 'light' | 'dark';

const LIGHT_COLORS = {
  // Backgrounds
  bg: '#f4f8ff',
  bgCard: 'rgba(255,255,255,0.74)',
  bgCardHover: '#ffffff',
  bgOverlay: '#edf4ff',

  // Brand gradient stops
  gradStart: '#ff6b8a',
  gradMid: '#ff9f5a',
  gradEnd: '#4bc6d7',

  // Accent colours (per category)
  pink: '#d5457a',
  pinkBg: 'rgba(255,107,138,0.14)',
  pinkBorder: 'rgba(255,107,138,0.34)',

  purple: '#7c5cf5',
  purpleBg: 'rgba(124,92,245,0.14)',
  purpleBorder: 'rgba(124,92,245,0.32)',

  teal: '#0f9c9f',
  tealBg: 'rgba(75,198,215,0.14)',
  tealBorder: 'rgba(75,198,215,0.3)',

  amber: '#bc7800',
  amberBg: 'rgba(255,179,71,0.16)',
  amberBorder: 'rgba(255,179,71,0.34)',

  indigo: '#4169e1',
  indigoBg: 'rgba(65,105,225,0.14)',
  indigoBorder: 'rgba(65,105,225,0.3)',

  red: '#dd3f5e',
  redBg: 'rgba(221,63,94,0.13)',
  redBorder: 'rgba(221,63,94,0.32)',

  blue: '#1f7acc',
  blueBg: 'rgba(31,122,204,0.13)',
  blueBorder: 'rgba(31,122,204,0.32)',

  // Text
  textPrimary: '#17233b',
  textSecondary: '#324261',
  textMuted: '#5f7398',
  textHint: '#8ea2c4',

  // Borders
  border: 'rgba(34,63,115,0.14)',
  borderMed: 'rgba(34,63,115,0.2)',

  // Risk levels
  riskLow: '#34d399',
  riskMed: '#fbbf24',
  riskHigh: '#f87171'
} as const;

const DARK_COLORS = {
  // Backgrounds
  bg: '#0a1122',
  bgCard: 'rgba(20,30,56,0.72)',
  bgCardHover: '#1f2d52',
  bgOverlay: '#111b34',

  // Brand gradient stops
  gradStart: '#ff7fa3',
  gradMid: '#f7b36c',
  gradEnd: '#64d5e8',

  // Accent colours (per category)
  pink: '#ff8ab1',
  pinkBg: 'rgba(255,138,177,0.2)',
  pinkBorder: 'rgba(255,138,177,0.36)',

  purple: '#a28dff',
  purpleBg: 'rgba(162,141,255,0.2)',
  purpleBorder: 'rgba(162,141,255,0.34)',

  teal: '#4ed2d4',
  tealBg: 'rgba(78,210,212,0.2)',
  tealBorder: 'rgba(78,210,212,0.34)',

  amber: '#f3b34f',
  amberBg: 'rgba(243,179,79,0.22)',
  amberBorder: 'rgba(243,179,79,0.36)',

  indigo: '#8ba2ff',
  indigoBg: 'rgba(139,162,255,0.2)',
  indigoBorder: 'rgba(139,162,255,0.34)',

  red: '#ff879d',
  redBg: 'rgba(255,135,157,0.2)',
  redBorder: 'rgba(255,135,157,0.36)',

  blue: '#6fb7ff',
  blueBg: 'rgba(111,183,255,0.2)',
  blueBorder: 'rgba(111,183,255,0.34)',

  // Text
  textPrimary: '#e7efff',
  textSecondary: '#c7d5f5',
  textMuted: '#9daed4',
  textHint: '#7f8fb7',

  // Borders
  border: 'rgba(167,188,232,0.2)',
  borderMed: 'rgba(167,188,232,0.3)',

  // Risk levels
  riskLow: '#49dca6',
  riskMed: '#ffc65a',
  riskHigh: '#ff8f9f'
} as const;

export const COLORS = { ...LIGHT_COLORS };

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

type GradientTuple = [string, string, ...string[]];

export const BRAND_GRADIENT: GradientTuple = [
  COLORS.gradStart,
  COLORS.gradMid,
  COLORS.gradEnd
];

export const SCREEN_BG_GRADIENT: GradientTuple = ['#f7fbff', '#eff5ff', '#f8f6ff'];

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

function syncDerivedColors(mode: ThemeMode) {
  BRAND_GRADIENT.splice(0, BRAND_GRADIENT.length, COLORS.gradStart, COLORS.gradMid, COLORS.gradEnd);

  const bg: GradientTuple = mode === 'dark'
    ? ['#0b1020', '#121a33', '#1a1230']
    : ['#f7fbff', '#eff5ff', '#f8f6ff'];
  SCREEN_BG_GRADIENT.splice(0, SCREEN_BG_GRADIENT.length, ...bg);

  CATEGORY_COLORS.pink = { bg: COLORS.pinkBg, border: COLORS.pinkBorder, text: COLORS.pink, icon: COLORS.pink };
  CATEGORY_COLORS.purple = { bg: COLORS.purpleBg, border: COLORS.purpleBorder, text: COLORS.purple, icon: COLORS.purple };
  CATEGORY_COLORS.teal = { bg: COLORS.tealBg, border: COLORS.tealBorder, text: COLORS.teal, icon: COLORS.teal };
  CATEGORY_COLORS.amber = { bg: COLORS.amberBg, border: COLORS.amberBorder, text: COLORS.amber, icon: COLORS.amber };
  CATEGORY_COLORS.indigo = { bg: COLORS.indigoBg, border: COLORS.indigoBorder, text: COLORS.indigo, icon: COLORS.indigo };
  CATEGORY_COLORS.red = { bg: COLORS.redBg, border: COLORS.redBorder, text: COLORS.red, icon: COLORS.red };
  CATEGORY_COLORS.blue = { bg: COLORS.blueBg, border: COLORS.blueBorder, text: COLORS.blue, icon: COLORS.blue };

  RISK_COLORS.low = COLORS.riskLow;
  RISK_COLORS.medium = COLORS.riskMed;
  RISK_COLORS.high = COLORS.riskHigh;
}

export function applyTheme(mode: ThemeMode) {
  const palette = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  Object.assign(COLORS, palette);
  syncDerivedColors(mode);
}

applyTheme('light');

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