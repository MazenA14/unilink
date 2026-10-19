import { AttendancePreloader } from '@/utils/attendancePreloader';
import { AuthManager } from '@/utils/auth';
import { GradesPreloader } from '@/utils/gradesPreloader';
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
          
          // Warm the attendance and grades caches on every cold start so those
          // screens open instantly (the dashboard joins these same runs).
          if (isAuthenticated) {
            AttendancePreloader.preloadAttendance().catch(() => {});
            GradesPreloader.preloadCurrentGrades().catch(() => {});
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