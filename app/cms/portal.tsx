import { AppBar } from '@/components/navigation/AppBar';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CMSPortalScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="Portal" />
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.mainFont }]}>Portal</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryFont }]}>Place portal content here.</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.tint }]} onPress={() => router.replace('/(tabs)/dashboard')}>
          <Text style={styles.buttonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14 },
  button: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  buttonText: { color: 'white', fontWeight: '600' },
});


