import { AuthManager } from '@/utils/auth';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setAuthed(await AuthManager.isAuthenticated());
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return null;

  return <Redirect href={authed ? '/(tabs)/dashboard' : '/login'} />;
}