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
    console.log('🧪 [UserTracking] ===== TESTING CONNECTION =====');
    console.log('🧪 [UserTracking] Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL || 'Using config fallback');
    console.log('🧪 [UserTracking] Supabase Key configured:', (process.env.EXPO_PUBLIC_SUPABASE_KEY || 'config fallback') ? 'Yes' : 'No');
    console.log('🧪 [UserTracking] Target table:', SUPABASE_CONFIG.TABLES.USERDATA);
    
    try {
      // Test a simple query to see if we can connect
      const { data, error } = await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ [UserTracking] Connection test failed:', error);
      } else {
        console.log('✅ [UserTracking] Connection test successful:', data);
      }
    } catch (error) {
      console.error('💥 [UserTracking] Connection test error:', error);
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
    console.log('🎓 [UserTracking] Fetching user academic data from GUC portal...');
    
    try {
      console.log('🆔 [UserTracking] User ID provided:', userId);
      
      if (!userId) {
        console.warn('⚠️ [UserTracking] No user ID provided');
        return {};
      }
      
      // Extract joined season from user ID (split by "-" and get first element)
      const joinedSeason = userId.split('-')[0];
      console.log('📅 [UserTracking] Joined season extracted from user ID:', joinedSeason);
      
      // Get user info (user ID and faculty) from index page - much faster than transcript
      console.log('📄 [UserTracking] Fetching user info from index page...');
      const { GUCAPIProxy } = await import('../gucApiProxy');
      const userInfo = await GUCAPIProxy.getUserInfo();
      console.log('📄 [UserTracking] User info received:', userInfo);
      
      const major = userInfo.faculty || undefined;
      console.log('🎓 [UserTracking] Major (faculty) extracted from index page:', major);
      
      console.log('🎓 [UserTracking] Academic data extracted:');
      console.log('   - User ID:', userId);
      console.log('   - Major:', major);
      console.log('   - Joined Season:', joinedSeason);
      
      return {
        user_id: userId,
        major,
        joined_season: joinedSeason
      };
      
    } catch (error) {
      console.error('❌ [UserTracking] Error fetching academic data:', error);
      console.warn('⚠️ [UserTracking] Continuing without academic data...');
      return {};
    }
  }

  /**
   * Track user login - add user to database if not exists, update last opened date
   */
  async trackUserLogin(username: string, gucId?: string, userId?: string): Promise<void> {
    // Prevent multiple simultaneous tracking calls for the same user
    if (this.trackingInProgress.has(username)) {
      console.log('⏳ [UserTracking] Tracking already in progress for user:', username);
      return;
    }
    
    this.trackingInProgress.add(username);
    console.log('🔒 [UserTracking] Lock acquired for user:', username);
    
    try {
      console.log('🚀 [UserTracking] ===== USER TRACKING FUNCTION CALLED =====');
      console.log('🔍 [UserTracking] Starting user login tracking...');
      console.log('📝 [UserTracking] Username:', username);
      console.log('🆔 [UserTracking] GUC ID:', gucId || 'Not provided');
      console.log('🆔 [UserTracking] User ID:', userId || 'Not provided');
      console.log('🗃️ [UserTracking] Target table:', SUPABASE_CONFIG.TABLES.USERDATA);
      console.log('📋 [UserTracking] This will either INSERT a new user or UPDATE existing user');
      console.log('🔧 [UserTracking] Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL || 'Using config fallback');
      console.log('🔧 [UserTracking] Supabase Key configured:', (process.env.EXPO_PUBLIC_SUPABASE_KEY || 'config fallback') ? 'Yes' : 'No');
      
      const now = new Date().toISOString();
      console.log('⏰ [UserTracking] Current timestamp:', now);
      
      console.log('🔍 [UserTracking] Checking if user exists in database...');
      console.log('🔍 [UserTracking] Query details:');
      console.log('   - Table:', SUPABASE_CONFIG.TABLES.USERDATA);
      console.log('   - Username to search:', username);
      console.log('   - Query: SELECT * FROM', SUPABASE_CONFIG.TABLES.USERDATA, 'WHERE username =', username);
      
      // Check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .select('*')
        .eq('username', username)
        .single();

      console.log('📊 [UserTracking] Database query result:');
      console.log('   - Existing user data:', existingUser);
      console.log('   - Fetch error:', fetchError);
      console.log('   - Error code:', fetchError?.code);
      console.log('   - Error message:', fetchError?.message);
      console.log('   - Error details:', fetchError?.details);

      if (fetchError && fetchError.code === 'PGRST116') {
        console.log('✨ [UserTracking] User does not exist (PGRST116 error), creating new user...');
        console.log('✨ [UserTracking] PGRST116 means: "The result contains 0 rows" - user not found');
        
        // Fetch academic data from GUC portal before creating user
        console.log('🎓 [UserTracking] Fetching academic data for new user...');
        const academicData = await this.fetchUserAcademicData(userId);
        
        // User doesn't exist, create new user with academic data
        const newUser: UserData = {
          username,
          guc_id: userId || '',
          date_joined_app: now,
          joined_season: academicData.joined_season,
          major: academicData.major
        };

        console.log('📝 [UserTracking] New user data to insert:', JSON.stringify(newUser, null, 2));
        console.log('🗃️ [UserTracking] Target table:', SUPABASE_CONFIG.TABLES.USERDATA);
        console.log('📋 [UserTracking] Complete row data being inserted:');
        console.log('   ┌─────────────────────────────────────────────────────────┐');
        console.log('   │                    NEW USER ROW                        │');
        console.log('   ├─────────────────────────────────────────────────────────┤');
        console.log(`   │ username: "${newUser.username}"`);
        console.log(`   │ guc_id: "${newUser.guc_id}"`);
        console.log(`   │ date_joined_app: "${newUser.date_joined_app}"`);
        console.log(`   │ joined_season: ${newUser.joined_season || 'Not available'}`);
        console.log(`   │ major: ${newUser.major || 'Not available'}`);
        console.log('   └─────────────────────────────────────────────────────────┘');
        console.log('🎓 [UserTracking] Academic data fetched from GUC portal:');
        console.log('   - Major:', academicData.major || 'Not available');
        console.log('   - Joined Season:', academicData.joined_season || 'Not available');

        console.log('💾 [UserTracking] Attempting to insert new user into database...');
        console.log('💾 [UserTracking] Insert operation details:');
        console.log('   - Table:', SUPABASE_CONFIG.TABLES.USERDATA);
        console.log('   - Data:', JSON.stringify(newUser, null, 2));
        
        const { data: insertData, error: insertError } = await supabase
          .from(SUPABASE_CONFIG.TABLES.USERDATA)
          .insert([newUser])
          .select();

        console.log('💾 [UserTracking] Insert operation completed');
        console.log('💾 [UserTracking] Insert result data:', insertData);
        console.log('💾 [UserTracking] Insert error:', insertError);

        if (insertError) {
          console.error('❌ [UserTracking] Error creating user:', insertError);
          console.error('❌ [UserTracking] Insert error details:', JSON.stringify(insertError, null, 2));
          console.error('❌ [UserTracking] Insert error code:', insertError.code);
          console.error('❌ [UserTracking] Insert error message:', insertError.message);
          console.error('❌ [UserTracking] Insert error details:', insertError.details);
          console.error('❌ [UserTracking] Insert error hint:', insertError.hint);
        } else {
          console.log('✅ [UserTracking] New user created successfully:', username);
          console.log('✅ [UserTracking] Inserted data:', insertData);
          console.log('🎉 [UserTracking] User tracking completed for new user');
          console.log('📊 [UserTracking] Database operation summary:');
          console.log('   ┌─────────────────────────────────────────────────────────┐');
          console.log('   │                    INSERT SUCCESS                      │');
          console.log('   ├─────────────────────────────────────────────────────────┤');
          console.log(`   │ Table: ${SUPABASE_CONFIG.TABLES.USERDATA}`);
          console.log(`   │ Operation: INSERT`);
          console.log(`   │ Username: ${username}`);
          console.log(`   │ Status: ✅ SUCCESS`);
          console.log('   └─────────────────────────────────────────────────────────┘');
        }
      } else if (existingUser) {
        console.log('👤 [UserTracking] User exists (found in database), no update needed...');
        console.log('👤 [UserTracking] User found with data:', existingUser);
        console.log('📊 [UserTracking] Existing user data:', JSON.stringify(existingUser, null, 2));
        console.log('🗃️ [UserTracking] Target table:', SUPABASE_CONFIG.TABLES.USERDATA);
        console.log('📋 [UserTracking] No update required for existing user');
        console.log('   ┌─────────────────────────────────────────────────────────┐');
        console.log('   │                  USER EXISTS                            │');
        console.log('   ├─────────────────────────────────────────────────────────┤');
        console.log(`   │ Username: ${username}`);
        console.log(`   │ Status: ✅ USER ALREADY EXISTS`);
        console.log('   └─────────────────────────────────────────────────────────┘');
        
        console.log('✅ [UserTracking] User already exists in database:', username);
        console.log('🎉 [UserTracking] User tracking completed for existing user');
      } else {
        console.warn('⚠️ [UserTracking] Unexpected state: No user found but no error either');
        console.warn('⚠️ [UserTracking] This should not happen - investigating...');
        console.warn('⚠️ [UserTracking] Fetch error code:', fetchError?.code);
        console.warn('⚠️ [UserTracking] Fetch error message:', fetchError?.message);
        console.warn('⚠️ [UserTracking] Existing user data:', existingUser);
        console.warn('⚠️ [UserTracking] This might indicate a database connection issue or table access problem');
      }
    } catch (error) {
      console.error('💥 [UserTracking] Unexpected error in trackUserLogin:', error);
      console.error('💥 [UserTracking] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    } finally {
      // Always release the lock
      this.trackingInProgress.delete(username);
      console.log('🔓 [UserTracking] Lock released for user:', username);
    }
  }

  /**
   * Update user GPA
   */
  async updateUserGPA(username: string, gpa: number): Promise<void> {
    console.log('📊 [UserTracking] Updating GPA for user:', username, 'GPA:', gpa);
    try {
      const { error } = await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .update({ gpa })
        .eq('username', username);

      if (error) {
        console.error('❌ [UserTracking] Error updating GPA:', error);
      } else {
        console.log('✅ [UserTracking] GPA updated successfully for user:', username);
      }
    } catch (error) {
      console.error('💥 [UserTracking] Unexpected error updating GPA:', error);
    }
  }

  /**
   * Update user major and season
   */
  async updateUserInfo(username: string, major?: string, season?: string): Promise<void> {
    console.log('👤 [UserTracking] Updating user info for:', username);
    console.log('📝 [UserTracking] Major:', major || 'Not provided');
    console.log('📅 [UserTracking] Season:', season || 'Not provided');
    
    try {
      const updateData: any = {};
      if (major) updateData.major = major;
      if (season) updateData.joined_season = season;

      console.log('📊 [UserTracking] Update data:', JSON.stringify(updateData, null, 2));

      const { error } = await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .update(updateData)
        .eq('username', username);

      if (error) {
        console.error('❌ [UserTracking] Error updating user info:', error);
      } else {
        console.log('✅ [UserTracking] User info updated successfully for:', username);
      }
    } catch (error) {
      console.error('💥 [UserTracking] Unexpected error updating user info:', error);
    }
  }

  /**
   * Submit feedback
   */
  async submitFeedback(feedback: FeedbackData): Promise<void> {
    console.log('💬 [UserTracking] Submitting feedback...');
    console.log('📝 [UserTracking] Feedback data:', JSON.stringify(feedback, null, 2));
    
    try {
      const { error } = await supabase
        .from(SUPABASE_CONFIG.TABLES.FEEDBACK)
        .insert([feedback]);

      if (error) {
        console.error('❌ [UserTracking] Error submitting feedback:', error);
      } else {
        console.log('✅ [UserTracking] Feedback submitted successfully');
      }
    } catch (error) {
      console.error('💥 [UserTracking] Unexpected error submitting feedback:', error);
    }
  }

  /**
   * Get user data
   */
  async getUserData(username: string): Promise<UserData | null> {
    console.log('🔍 [UserTracking] Fetching user data for:', username);
    
    try {
      const { data, error } = await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        console.error('❌ [UserTracking] Error fetching user data:', error);
        return null;
      }

      console.log('✅ [UserTracking] User data fetched successfully:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('💥 [UserTracking] Unexpected error fetching user data:', error);
      return null;
    }
  }

  /**
   * Get all users (for admin purposes)
   */
  async getAllUsers(): Promise<UserData[]> {
    console.log('👥 [UserTracking] Fetching all users...');
    
    try {
      const { data, error } = await supabase
        .from(SUPABASE_CONFIG.TABLES.USERDATA)
        .select('*')
        .order('date_joined_app', { ascending: false });

      if (error) {
        console.error('❌ [UserTracking] Error fetching all users:', error);
        return [];
      }

      console.log('✅ [UserTracking] All users fetched successfully. Count:', data?.length || 0);
      console.log('📊 [UserTracking] Users data:', JSON.stringify(data, null, 2));
      return data || [];
    } catch (error) {
      console.error('💥 [UserTracking] Unexpected error fetching all users:', error);
      return [];
    }
  }
}

// Export singleton instance
export const userTrackingService = new UserTrackingService();
