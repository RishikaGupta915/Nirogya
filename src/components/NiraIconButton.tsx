import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function NiraIconButton() {
  const nav = useNavigation<any>();
  return (
    <TouchableOpacity
      style={styles.niraBtn}
      onPress={() => nav.navigate('NiraChat')}
      activeOpacity={0.85}
    >
      <MaterialCommunityIcons name="robot-excited" size={28} color="#fff" />
      <Text style={styles.niraLabel}>Nira</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  niraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9d4edd',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    margin: 10
  },
  niraLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
    letterSpacing: 0.5
  }
});
