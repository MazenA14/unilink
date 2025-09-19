import { AuthManager } from '@/utils/auth';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const isAuthenticated = await AuthManager.isAuthenticated();
        setAuthed(isAuthenticated);
        
        // If user is already authenticated, preload schedule data
        if (isAuthenticated) {
          const { SchedulePreloader } = await import('@/utils/schedulePreloader');
          SchedulePreloader.preloadSchedule().catch(error => {
            // Don't show error to user - preloading is optional
          });
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return null;

  return <Redirect href={authed ? '/(tabs)/dashboard' : '/login'} />;
}