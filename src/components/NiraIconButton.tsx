import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants/theme';
import { UI_SHADOWS } from '../constants/ui';

export default function NiraIconButton() {
  const nav = useNavigation<any>();
  return (
    <TouchableOpacity
      className="m-3 overflow-hidden rounded-full"
      style={UI_SHADOWS.brandGlow}
      onPress={() => nav.navigate('NiraChat')}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={[COLORS.gradStart, COLORS.gradMid, COLORS.gradEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-row items-center px-4 py-[10px]"
      >
        <MaterialCommunityIcons name="robot-excited" size={24} color="#fff" />
        <Text
          className="ml-2 text-[14px] tracking-[0.3px] text-white"
          style={{ fontFamily: FONTS.sansBold }}
        >
          Ask Nira
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}