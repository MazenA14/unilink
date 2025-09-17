import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { AuthGuard } from '@/components/AuthGuard';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useDefaultScreen } from '@/contexts/DefaultScreenContext';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { defaultScreen, isLoading } = useDefaultScreen();

  // Memoize icon components to prevent re-creation and improve performance
  const tabIcons = useMemo(() => ({
    dashboard: (color: string) => <MaterialIcons name="dashboard" size={28} color={color} />,
    courses: (color: string) => <Ionicons name="book" size={28} color={color} />,
    schedule: (color: string) => <Ionicons name="calendar" size={28} color={color} />,
    transcript: (color: string) => <Ionicons name="document-text" size={28} color={color} />,
    settings: (color: string) => <Ionicons name="settings" size={28} color={color} />,
  }), []);

  return (
    <AuthGuard>
      <Tabs
        initialRouteName={isLoading ? "dashboard" : defaultScreen}
        screenOptions={{
          tabBarActiveTintColor: colors.tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
            },
            default: {},
          }),
        }}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => tabIcons.dashboard(color),
          }}
        />
        <Tabs.Screen
          name="grades"
          options={{
            title: 'Grades',
            tabBarIcon: ({ color }) => tabIcons.courses(color),
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ color }) => tabIcons.schedule(color),
          }}
        />
        <Tabs.Screen
          name="transcript"
          options={{
            title: 'Transcript',
            tabBarIcon: ({ color }) => tabIcons.transcript(color),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => tabIcons.settings(color),
          }}
        />
      </Tabs>
    </AuthGuard>
  );
}