import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center p-5">
      <LinearGradient
        colors={['#f7fbff', '#eef5ff', '#f7f2ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />
      <View
        className="w-full rounded-3xl border border-borderSoft bg-white/85 p-[22px]"
        style={{
          shadowColor: '#2f4b84',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 14,
          elevation: 4
        }}
      >
        <Text className="mb-1 text-[12px] uppercase tracking-[0.6px] text-brandStart" style={{ fontWeight: '600' }}>
          Nirogya
        </Text>
        <Text className="mb-[6px] text-[26px] font-bold text-textPrimary">This is a modal</Text>
        <Text className="text-[14px] leading-5 text-textMuted">
          Designed with a brighter and more expressive interface.
        </Text>
      </View>
    </View>
  );
}