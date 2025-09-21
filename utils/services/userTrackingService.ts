import { SUPABASE_CONFIG } from '../config/supabaseConfig';
import { supabase } from '../supabase';

// Types based on your database schema
export interface UserData {
  username: string;
  guc_id: string;
  date_joined_app: string;
  joined_season?: string;
  major?: string;
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
    joined_season?: string;
  }> {
    try {
      if (!userId) {
        return {};
      }
      
      // Extract joined season from user ID (split by "-" and get first element)
      const joinedSeason = userId.split('-')[0];
      
      // Get user info (user ID and faculty) from index page - much faster than transcript
      const { GUCAPIProxy } = await import('../gucApiProxy');
      const userInfo = await GUCAPIProxy.getUserInfo();
      
      const major = userInfo.faculty || undefined;
      
      return {
        user_id: userId,
        major,
        joined_season: joinedSeason
      };
      
    } catch {
      return {};
    }
  }

  /**
   * Track user login - add user to database if not exists, update last opened date
   */
  async trackUserLogin(username: string, gucId?: string, userId?: string): Promise<void> {
    // Prevent multiple simultaneous tracking calls for the same user
    if (this.trackingInProgress.has(username)) {
      return;
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
        
        // User doesn't exist, create new user with academic data
        const newUser: UserData = {
          username,
          guc_id: userId || '',
          date_joined_app: now,
          joined_season: academicData.joined_season,
          major: academicData.major
        };
        
        await supabase
          .from(SUPABASE_CONFIG.TABLES.USERDATA)
          .insert([newUser])
          .select();
      } else if (existingUser) {
        // User already exists in database
      } else {
        // Unexpected state: No user found but no error either
      }
    } catch {
      // Unexpected error in trackUserLogin
    } finally {
      // Always release the lock
      this.trackingInProgress.delete(username);
    }
  }

  /**
   * Update user GPA
   */
  async updateUserGPA(username: string, gpa: number): Promise<void> {
    try {
      await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .update({ gpa })
        .eq('username', username);
    } catch {
      // Unexpected error updating GPA
    }
  }

  /**
   * Update user major and season
   */
  async updateUserInfo(username: string, major?: string, season?: string): Promise<void> {
    try {
      const updateData: any = {};
      if (major) updateData.major = major;
      if (season) updateData.joined_season = season;

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
      await supabase
        .from(SUPABASE_CONFIG.TABLES.FEEDBACK)
        .insert([feedback]);
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
}

// Export singleton instance
export const userTrackingService = new UserTrackingService();
