import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform } from 'react-native';

import { AuthGuard } from '@/components/AuthGuard';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Memoize icon components to prevent re-creation and improve performance
  const tabIcons = useMemo(() => ({
    dashboard: (color: string) => <IconSymbol size={28} name="house.fill" color={color} />,
    courses: (color: string) => <IconSymbol size={28} name="book.closed.fill" color={color} />,
    calendar: (color: string) => <IconSymbol size={28} name="calendar" color={color} />,
    profile: (color: string) => <IconSymbol size={28} name="person.fill" color={color} />,
  }), []);

  return (
    <AuthGuard>
      <Tabs
        initialRouteName="dashboard"
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
          name="courses"
          options={{
            title: 'Grades',
            tabBarIcon: ({ color }) => tabIcons.courses(color),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => tabIcons.calendar(color),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => tabIcons.profile(color),
          }}
        />
      </Tabs>
    </AuthGuard>
  );
}