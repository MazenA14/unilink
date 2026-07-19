import { AppBar } from '@/components/navigation/AppBar';
import StatisticsSection from '@/components/StatisticsSection';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ScrollView, View } from 'react-native';

export default function StatisticsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="Statistics" variant="back" showNotifications={false} large />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <StatisticsSection />
      </ScrollView>
    </View>
  );
}
