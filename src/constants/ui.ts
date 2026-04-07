import type { ViewStyle } from 'react-native';

export const UI_CLASSES = {
  cardShell: 'rounded-xl2 border border-borderSoft bg-card',
  profileBlock: 'mb-2 rounded-xl2 border border-borderSoft bg-card px-3',
  sectionEyebrow: 'mb-[10px] mt-3 text-[10px] uppercase tracking-[1.1px] text-textHint'
} as const;

export const UI_SHADOWS = {
  soft: {
    shadowColor: '#2f4b84',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2
  } satisfies ViewStyle,
  medium: {
    shadowColor: '#2f4b84',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 3
  } satisfies ViewStyle,
  strong: {
    shadowColor: '#2f4b84',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5
  } satisfies ViewStyle,
  cool: {
    shadowColor: '#30518b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3
  } satisfies ViewStyle,
  brandGlow: {
    shadowColor: '#ff6b8a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
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