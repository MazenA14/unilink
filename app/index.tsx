import { AuthManager } from '@/utils/auth';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Check if this is the first time opening the app
        const firstTimeOpen = await AuthManager.isFirstTimeOpen();
        setIsFirstTime(firstTimeOpen);
        
        if (firstTimeOpen) {
          // First time opening - always go to login
          setAuthed(false);
        } else {
          // Not first time - check authentication
          const isAuthenticated = await AuthManager.isAuthenticated();
          setAuthed(isAuthenticated);
          
          // If user is already authenticated, preload schedule and grades data
          if (isAuthenticated) {
            const { SchedulePreloader } = await import('@/utils/schedulePreloader');
            SchedulePreloader.preloadSchedule().catch(error => {
              // Don't show error to user - preloading is optional
            });
            
            const { GradesPreloader } = await import('@/utils/gradesPreloader');
            GradesPreloader.preloadCurrentGrades().catch(error => {
              // Don't show error to user - preloading is optional
            });
            
            const { AttendancePreloader } = await import('@/utils/attendancePreloader');
            AttendancePreloader.preloadAttendance().catch(error => {
              // Don't show error to user - preloading is optional
            });
          }
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return null;

  // First time opening - always redirect to login
  if (isFirstTime) {
    return <Redirect href="/login" />;
  }

  // Not first time - use normal authentication flow
  return <Redirect href={authed ? '/(tabs)/dashboard' : '/login'} />;
}