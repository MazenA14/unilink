/**
 * Supabase Configuration
 * 
 * Replace the placeholder values with your actual Supabase project URL and publishable key
 * You can find these in your Supabase dashboard under Settings > API
 */
export const SUPABASE_CONFIG = {
  // Your Supabase project URL
  URL: 'https://vszmhisprukshoprutkm.supabase.co',
  
  // Your Supabase publishable key (preferred for mobile apps)
  KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzem1oaXNwcnVrc2hvcHJ1dGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTE5OTYsImV4cCI6MjA3Mzk4Nzk5Nn0.yO0sFbYllEO9n90BXp7YOsQb61Dy30j-qvX8Hyuzq_4',
  
  // Database table names
  TABLES: {
    USERDATA: 'Users',
    FEEDBACK: 'Feedback',
    SCHEDULES: 'Schedules'
  }
};
