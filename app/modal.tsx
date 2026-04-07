import { StyleSheet, View, Text } from 'react-native';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>This is a modal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  link: {
    marginTop: 15,
    paddingVertical: 15
  },
  title: { fontSize: 22, fontWeight: '600' },
  linkText: { color: '#9d4edd', fontWeight: '600' }
});
