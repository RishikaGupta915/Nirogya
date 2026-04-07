// src/constants/theme.ts

export const COLORS = {
  // Backgrounds
  bg:         '#0f0914',
  bgCard:     'rgba(255,255,255,0.04)',
  bgCardHover:'rgba(255,255,255,0.07)',
  bgOverlay:  'rgba(15,9,20,0.95)',

  // Brand gradient stops
  gradStart:  '#e879a0',
  gradMid:    '#c084fc',
  gradEnd:    '#818cf8',

  // Accent colours (per category)
  pink:       '#f9a8c9',
  pinkBg:     'rgba(232,121,160,0.12)',
  pinkBorder: 'rgba(232,121,160,0.35)',

  purple:     '#c084fc',
  purpleBg:   'rgba(192,132,252,0.12)',
  purpleBorder:'rgba(192,132,252,0.3)',

  teal:       '#6ee7b7',
  tealBg:     'rgba(52,211,153,0.10)',
  tealBorder: 'rgba(52,211,153,0.28)',

  amber:      '#fde68a',
  amberBg:    'rgba(251,191,36,0.10)',
  amberBorder:'rgba(251,191,36,0.25)',

  indigo:     '#a5b4fc',
  indigoBg:   'rgba(129,140,248,0.12)',
  indigoBorder:'rgba(129,140,248,0.3)',

  red:        '#fca5a5',
  redBg:      'rgba(251,113,133,0.10)',
  redBorder:  'rgba(251,113,133,0.25)',

  blue:       '#93c5fd',
  blueBg:     'rgba(96,165,250,0.07)',
  blueBorder: 'rgba(96,165,250,0.3)',

  // Text
  textPrimary:   'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.60)',
  textMuted:     'rgba(255,255,255,0.35)',
  textHint:      'rgba(255,255,255,0.22)',

  // Borders
  border:        'rgba(255,255,255,0.08)',
  borderMed:     'rgba(255,255,255,0.12)',

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
