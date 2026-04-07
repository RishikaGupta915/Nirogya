import { ScrollView, StyleSheet, Text } from 'react-native';

export default function ExploreScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Explore</Text>
      <Text style={styles.body}>
        This tab is a placeholder. Replace it with your own content or remove the tab if unused.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#fff',
    gap: 12
  },
  title: {
    fontSize: 22,
    fontWeight: '700'
  },
  body: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20
  }
});
