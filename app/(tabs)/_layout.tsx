import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';

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
  const router = useRouter();

  // Memoize icon components to prevent re-creation and improve performance
  const tabIcons = useMemo(() => ({
    dashboard: (color: string, focused: boolean) => <MaterialIcons name="dashboard" size={24} color={color} />,
    courses: (color: string, focused: boolean) => <Ionicons name={focused ? 'book' : 'book-outline'} size={23} color={color} />,
    schedule: (color: string, focused: boolean) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={23} color={color} />,
    transcript: (color: string, focused: boolean) => <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={23} color={color} />,
    settings: (color: string, focused: boolean) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={23} color={color} />,
  }), []);

  // Navigate to the default screen when it's loaded and different from dashboard
  useEffect(() => {
    if (!isLoading && defaultScreen && defaultScreen !== 'dashboard') {
      // Use a small delay to ensure the tabs are fully mounted
      const timer = setTimeout(() => {
        router.replace(`/(tabs)/${defaultScreen}`);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, defaultScreen, router]);

  // Determine the initial route name - use defaultScreen if loaded, otherwise dashboard
  const initialRouteName = isLoading ? "dashboard" : defaultScreen;

  return (
    <AuthGuard>
      <Tabs
        initialRouteName={initialRouteName}
        screenOptions={{
          tabBarActiveTintColor: colors.tabIconSelected,
          tabBarInactiveTintColor: colors.tabIconDefault,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          // Bottom tab bar is hidden — navigation is driven by the slide-in
          // Sidebar. The Tabs navigator is kept so screen state is preserved
          // when switching between the primary views.
          tabBarStyle: { display: 'none' },
        }}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, focused }) => tabIcons.dashboard(color, focused),
          }}
        />
        <Tabs.Screen
          name="grades"
          options={{
            title: 'Grades',
            tabBarIcon: ({ color, focused }) => tabIcons.courses(color, focused),
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ color, focused }) => tabIcons.schedule(color, focused),
          }}
        />
        <Tabs.Screen
          name="transcript"
          options={{
            title: 'Transcript',
            tabBarIcon: ({ color, focused }) => tabIcons.transcript(color, focused),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => tabIcons.settings(color, focused),
          }}
        />
      </Tabs>
    </AuthGuard>
  );
}