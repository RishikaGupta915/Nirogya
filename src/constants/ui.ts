import type { ViewStyle } from 'react-native';

export const UI_CLASSES = {
  cardShell: 'rounded-xl2 bg-card dark:bg-slate-900/70',
  profileBlock: 'mb-2 rounded-xl2 bg-card dark:bg-slate-900/70 px-3',
  sectionEyebrow: 'mb-[8px] mt-2 text-[9px] uppercase tracking-[1.5px] text-textHint dark:text-slate-400'
} as const;

export const UI_SHADOWS = {
  soft: {
    shadowColor: '#1f3e72',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2
  } satisfies ViewStyle,
  medium: {
    shadowColor: '#1f3e72',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 3
  } satisfies ViewStyle,
  strong: {
    shadowColor: '#1a3768',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.13,
    shadowRadius: 26,
    elevation: 5
  } satisfies ViewStyle,
  cool: {
    shadowColor: '#28497f',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 3
  } satisfies ViewStyle,
  brandGlow: {
    shadowColor: '#ff6b8a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 4
  } satisfies ViewStyle,
  tabBar: {
    shadowColor: '#213768',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10
  } satisfies ViewStyle
} as const;