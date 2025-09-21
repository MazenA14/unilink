import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { SUPABASE_CONFIG } from './config/supabaseConfig';

console.log('🔧 [Supabase] Initializing Supabase client...');
console.log('🌐 [Supabase] URL:', process.env.EXPO_PUBLIC_SUPABASE_URL || SUPABASE_CONFIG.URL);
console.log('🔑 [Supabase] Key configured:', (process.env.EXPO_PUBLIC_SUPABASE_KEY || SUPABASE_CONFIG.KEY) ? 'Yes' : 'No');

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || SUPABASE_CONFIG.URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY || SUPABASE_CONFIG.KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  })

console.log('✅ [Supabase] Client initialized successfully');
