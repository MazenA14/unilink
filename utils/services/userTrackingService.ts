import { APP_VERSION } from '@/constants/Version';
import { SUPABASE_CONFIG } from '../config/supabaseConfig';
import { supabase } from '../supabase';

// Types based on your database schema
export interface UserData {
  username: string;
  guc_id: string;
  date_joined_app: string;
  joined_season?: number;
  major?: string;
  last_open_time?: string;
  times_opened?: number;
  joined_version?: number;
  current_version?: number;
}

export interface FeedbackData {
  username: string;
  notes: string;
  season_joined: string;
  date: string;
  version: string;
}

class UserTrackingService {
  private trackingInProgress = new Set<string>();

  /**
   * Test function to verify the service is working
   */
  async testConnection(): Promise<void> {
    try {
      // Test a simple query to see if we can connect
      await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .select('count')
        .limit(1);
    } catch {
      // Connection test error
    }
  }
  /**
   * Fetch user academic data from GUC portal (user_id, major, joined season)
   */
  private async fetchUserAcademicData(userId?: string): Promise<{
    user_id?: string;
    major?: string;
    joined_season?: number;
  }> {
    try {
      if (!userId) {
        return {};
      }
      
      // Extract joined season from user ID (split by "-" and get first element)
      const joinedSeasonStr = userId.split('-')[0];
      const joinedSeason = parseInt(joinedSeasonStr, 10);
      
      // Get user info (user ID and faculty) from index page - much faster than transcript
      const { GUCAPIProxy } = await import('../gucApiProxy');
      const userInfo = await GUCAPIProxy.getUserInfo();
      
      const major = userInfo.faculty || undefined;
      
      return {
        user_id: userId,
        major,
        joined_season: isNaN(joinedSeason) ? undefined : joinedSeason
      };
      
    } catch {
      return {};
    }
  }

  /**
   * Track user login - add user to database if not exists, update last opened date
   * Returns the joined season if available for caching
   */
  async trackUserLogin(username: string, gucId?: string, userId?: string): Promise<number | null> {
    // Prevent multiple simultaneous tracking calls for the same user
    if (this.trackingInProgress.has(username)) {
      return null;
    }
    
    this.trackingInProgress.add(username);
    
    try {
      const now = new Date().toISOString();
      
      // Check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .select('*')
        .eq('username', username)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // Fetch academic data from GUC portal before creating user
        const academicData = await this.fetchUserAcademicData(userId);
        const joinedVersion = parseFloat(APP_VERSION);
        
        // User doesn't exist, create new user with academic data
        const newUser: UserData = {
          username,
          guc_id: userId || '',
          date_joined_app: now,
          joined_season: academicData.joined_season,
          major: academicData.major,
          last_open_time: now,
          times_opened: 1,
          joined_version: joinedVersion,
          current_version: joinedVersion
        };
        
        await supabase
          .from(SUPABASE_CONFIG.TABLES.USERDATA)
          .insert([newUser])
          .select();
        
        // Return joined season for caching
        return academicData.joined_season || null;
      } else if (existingUser) {
        // User already exists in database, update their tracking info
        const currentTimesOpened = existingUser.times_opened || 0;
        const currentVersion = parseFloat(APP_VERSION);
        
        await supabase
          .from(SUPABASE_CONFIG.TABLES.USERDATA)
          .update({
            last_open_time: now,
            times_opened: currentTimesOpened + 1,
            current_version: currentVersion
          })
          .eq('guc_id', existingUser.guc_id);
        
        // Return their joined season for caching
        return existingUser.joined_season || null;
      } else {
        // Unexpected state: No user found but no error either
        return null;
      }
    } catch {
      // Unexpected error in trackUserLogin
      return null;
    } finally {
      // Always release the lock
      this.trackingInProgress.delete(username);
    }
  }

  /**
   * Track app open - update last_open_time and increment times_opened for authenticated users
   * This should be called on every app startup, not just login
   */
  async trackAppOpen(): Promise<void> {
    try {
      // Check if user is authenticated
      const { AuthManager } = await import('../auth');
      const { username } = await AuthManager.getCredentials();
      
      if (!username) {
        // User not authenticated, skip tracking
        return;
      }
      
      // Get user ID for tracking
      const { GUCAPIProxy } = await import('../gucApiProxy');
      const userId = await GUCAPIProxy.getUserId();
      
      if (!userId) {
        // No user ID available, skip tracking
        return;
      }
      
      const now = new Date().toISOString();
      
      // First, get the current times_opened value
      const { data: currentUser, error: fetchError } = await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .select('times_opened')
        .eq('guc_id', userId)
        .single();
      
      if (fetchError || !currentUser) {
        // User not found, skip tracking
        return;
      }
      
      // Update existing user's tracking info
      await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .update({
          last_open_time: now,
          times_opened: (currentUser.times_opened || 0) + 1,
          current_version: parseFloat(APP_VERSION)
        })
        .eq('guc_id', userId);
        
    } catch {
      // Don't fail app startup if tracking fails
    }
  }

  /**
   * Update user GPA
   */
  async updateUserGPA(username: string, gpa: number): Promise<void> {
    try {
      await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .update({ gpa, current_version: parseFloat(APP_VERSION) })
        .eq('username', username);
    } catch {
      // Unexpected error updating GPA
    }
  }

  /**
   * Update user major and season
   */
  async updateUserInfo(username: string, major?: string, season?: number): Promise<void> {
    try {
      const updateData: any = {};
      if (major) updateData.major = major;
      if (season) updateData.joined_season = season;
      updateData.current_version = parseFloat(APP_VERSION);

      await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .update(updateData)
        .eq('username', username);
    } catch {
      // Unexpected error updating user info
    }
  }

  /**
   * Submit feedback
   */
  async submitFeedback(feedback: FeedbackData): Promise<void> {
    try {
      // Ensure version is always included with feedback
      const payload: FeedbackData = {
        ...feedback,
        version: feedback.version || APP_VERSION,
      };
      await supabase
        .from(SUPABASE_CONFIG.TABLES.FEEDBACK)
        .insert([payload]);
    } catch {
      // Unexpected error submitting feedback
    }
  }

  /**
   * Get user data
   */
  async getUserData(username: string): Promise<UserData | null> {
    try {
      const { data, error } = await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Get all users (for admin purposes)
   */
  async getAllUsers(): Promise<UserData[]> {
    try {
      const { data, error } = await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .select('*')
        .order('date_joined_app', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  }

  /**
   * Track easter egg access
   */
  async trackEasterEggAccess(): Promise<void> {
    try {
      // Get user information
      const { AuthManager } = await import('../auth');
      const [credentials, userId, nickname] = await Promise.all([
        AuthManager.getCredentials(),
        AuthManager.getUserId(),
        AuthManager.getNickname(),
      ]);

      const username = credentials?.username || '';
      const gucId = userId || '';
      const displayName = nickname || username.split('@')[0] || '';
      const currentDate = new Date().toISOString();

      // Log easter egg access to Feedback table
      await supabase
        .from(SUPABASE_CONFIG.TABLES.FEEDBACK)
        .insert({
          guc_id: gucId,
          username: username,
          notes: 'Easter Egg Seen',
          date: currentDate,
          version: APP_VERSION,
          joined_season: gucId ? gucId.split('-')[0] : null,
        });
    } catch {
      // Don't fail the easter egg if tracking fails
    }
  }
}

// Export singleton instance
export const userTrackingService = new UserTrackingService();
