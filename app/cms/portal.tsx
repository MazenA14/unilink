import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CMSPortalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Portal</Text>
      <Text style={styles.subtitle}>Place portal content here.</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)/dashboard')}>
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14 },
  button: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#4A90E2' },
  buttonText: { color: 'white', fontWeight: '600' },
});


