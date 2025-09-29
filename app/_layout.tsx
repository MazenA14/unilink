import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import NotificationHandler from '@/components/NotificationHandler';
import { DefaultScreenProvider } from '@/contexts/DefaultScreenContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ScheduleProvider } from '@/contexts/ScheduleContext';
import { ShiftedScheduleProvider } from '@/contexts/ShiftedScheduleContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { consumeAttendanceNavigateFlag, initializeAttendanceBackgroundTask } from '@/utils/services/backgroundTaskService';
import { router } from 'expo-router';
import { useEffect } from 'react';

function AppContent() {
  const colorScheme = useColorScheme();
  
  useEffect(() => {
    initializeAttendanceBackgroundTask();
  }, []);
  
  useEffect(() => {
    const checkAndNavigate = async () => {
      const shouldNavigate = await consumeAttendanceNavigateFlag();
      if (shouldNavigate) {
        router.push('/attendance');
      }
    };
    checkAndNavigate();
  });
  
  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NotificationHandler />
      <Stack initialRouteName="login">
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="instructors" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="exam-seats" options={{ headerShown: false }} />
        <Stack.Screen name="attendance" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider>
      <NotificationProvider>
        <ShiftedScheduleProvider>
          <ScheduleProvider>
            <DefaultScreenProvider>
              <AppContent />
            </DefaultScreenProvider>
          </ScheduleProvider>
        </ShiftedScheduleProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
