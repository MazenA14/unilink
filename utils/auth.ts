import AsyncStorage from '@react-native-async-storage/async-storage';
import { userTrackingService } from './services/userTrackingService';

export class AuthManager {
  private static SESSION_COOKIE_KEY = 'sessionCookie';
  private static USERNAME_KEY = 'gucUsername';
  private static PASSWORD_KEY = 'gucPassword';
  private static NICKNAME_KEY = 'displayNickname';
  private static USER_ID_KEY = 'gucUserId';
  private static JOINED_SEASON_KEY = 'joinedSeason';
  private static SHIFTED_SCHEDULE_KEY = 'shiftedScheduleEnabled';
  private static DEFAULT_SCREEN_KEY = 'defaultScreen';
  private static FIRST_TIME_OPEN_KEY = 'isFirstTimeOpen';
  private static DASHBOARD_SLOTS_KEY = 'dashboardSlots';
  private static NEXT_SLOT_REMINDER_MINUTES_KEY = 'nextSlotReminderMinutes';
  private static LAST_USER_INFO_REFRESH_KEY = 'lastUserInfoRefresh';

  /**
   * Store session cookie from login response
   */
  static async storeSessionCookie(cookie: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SESSION_COOKIE_KEY, cookie);
    } catch (error) {
    }
  }

  /**
   * Retrieve stored session cookie
   */
  static async getSessionCookie(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.SESSION_COOKIE_KEY);
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear stored session cookie (for logout)
   */
  static async clearSessionCookie(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SESSION_COOKIE_KEY);
    } catch (error) {
    }
  }

  /**
   * Store user credentials (for NTLM-proxied requests)
   */
  static async storeCredentials(username: string, password: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USERNAME_KEY, username);
      await AsyncStorage.setItem(this.PASSWORD_KEY, password);
    } catch (error) {
    }
  }

  /**
   * Retrieve stored credentials
   */
  static async getCredentials(): Promise<{ username: string | null; password: string | null }> {
    try {
      const [username, password] = await Promise.all([
        AsyncStorage.getItem(this.USERNAME_KEY),
        AsyncStorage.getItem(this.PASSWORD_KEY),
      ]);
      return { username, password };
    } catch (error) {
      return { username: null, password: null };
    }
  }

  /**
   * Clear stored credentials
   */
  static async clearCredentials(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.USERNAME_KEY);
      await AsyncStorage.removeItem(this.PASSWORD_KEY);
    } catch (error) {
    }
  }

  /**
   * Store a user-defined display nickname
   */
  static async storeNickname(nickname: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.NICKNAME_KEY, nickname);
    } catch (error) {
    }
  }

  /**
   * Retrieve the stored display nickname, if any
   */
  static async getNickname(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.NICKNAME_KEY);
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear the stored display nickname
   */
  static async clearNickname(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.NICKNAME_KEY);
    } catch (error) {
    }
  }

  /**
   * Persist the user's unique application ID from the portal
   */
  static async storeUserId(userId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USER_ID_KEY, userId);
    } catch (error) {
    }
  }

  static async getUserId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.USER_ID_KEY);
    } catch (error) {
      return null;
    }
  }

  static async clearUserId(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.USER_ID_KEY);
    } catch (error) {
    }
  }

  /**
   * Store the user's joined season (extracted from user ID)
   */
  static async storeJoinedSeason(joinedSeason: string | number): Promise<void> {
    try {
      // Ensure the value is always stored as a string
      await AsyncStorage.setItem(this.JOINED_SEASON_KEY, String(joinedSeason));
    } catch (error) {
    }
  }

  /**
   * Retrieve the stored joined season
   */
  static async getJoinedSeason(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.JOINED_SEASON_KEY);
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear the stored joined season
   */
  static async clearJoinedSeason(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.JOINED_SEASON_KEY);
    } catch (error) {
    }
  }

  /**
   * Get the user's academic year based on joined season
   * Returns the academic year (e.g., "2024" for "Fall 2024" joined season)
   */
  static async getAcademicYear(): Promise<string | null> {
    try {
      const joinedSeason = await this.getJoinedSeason();
      if (!joinedSeason) {
        return null;
      }
      
      // Extract year from joined season (e.g., "Fall 2024" -> "2024")
      const yearMatch = joinedSeason.match(/(\d{4})/);
      return yearMatch ? yearMatch[1] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Make authenticated API request with stored session cookie
   */
  static async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const sessionCookie = await this.getSessionCookie();
    
    const headers = {
      ...options.headers,
      ...(sessionCookie && { Cookie: sessionCookie }),
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }

  /**
   * Check if user is authenticated (has valid session cookie)
   */
  static async isAuthenticated(): Promise<boolean> {
    const sessionCookie = await this.getSessionCookie();
    return sessionCookie !== null;
  }

  /**
   * Clear the shifted schedule preference
   */
  static async clearShiftedSchedulePreference(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SHIFTED_SCHEDULE_KEY);
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Store the default screen preference
   */
  static async storeDefaultScreen(screen: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.DEFAULT_SCREEN_KEY, screen);
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Retrieve the stored default screen preference
   */
  static async getDefaultScreen(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.DEFAULT_SCREEN_KEY);
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear the default screen preference
   */
  static async clearDefaultScreen(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.DEFAULT_SCREEN_KEY);
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Clear all application cache and user data - comprehensive cleanup
   */
  static async clearAllCache(): Promise<void> {
    try {
      // Import GradeCache to access its cache clearing methods
      const { GradeCache } = await import('./gradeCache');
      
      // Clear all grade and transcript cache
      await GradeCache.clearAllCacheIncludingPreviousGrades();
      
      // Clear notification cache
      await Promise.all([
        AsyncStorage.removeItem('notifications_cache'),
        AsyncStorage.removeItem('notifications_read_status'),
        AsyncStorage.removeItem('seen_notification_ids')
      ]);
      
      // Clear push notification cache using the service
      // const { pushNotificationService } = await import('./services/pushNotificationService');
      // await pushNotificationService.clearCachedToken();
      
      // Clear What's New cache
      await Promise.all([
        AsyncStorage.removeItem('whats_new_shown'),
        AsyncStorage.removeItem('whats_new_version')
      ]);
      
      // Clear any other potential cache keys
      await Promise.all([
        AsyncStorage.removeItem('shiftedScheduleEnabled'),
        AsyncStorage.removeItem('defaultScreen'),
        AsyncStorage.removeItem(this.DASHBOARD_SLOTS_KEY)
      ]);
      
    } catch (error) {
      // Continue even if some cache clearing fails
    }
  }

  /**
   * Nuclear option: Clear ALL AsyncStorage data (use with extreme caution)
   * This will remove everything stored in AsyncStorage, including app preferences
   */
  static async clearAllAsyncStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length > 0) {
        await AsyncStorage.multiRemove(keys);
      }
    } catch (error) {
      // Continue even if clearing fails
    }
  }

  /**
   * Debug method: Get all remaining AsyncStorage keys after logout
   * Useful for verifying that all cache has been cleared
   */
  static async getRemainingStorageKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys as string[];
    } catch (error) {
      return [];
    }
  }

  /**
   * User logout - clear all stored data and cache (for when user explicitly logs out)
   * @param nuclear - If true, will clear ALL AsyncStorage data (use with caution)
   */
  static async userLogout(nuclear: boolean = false): Promise<void> {
    try {
      
      if (nuclear) {
        // Nuclear option: Clear everything
        await this.clearAllAsyncStorage();
      } else {
        // User logout: Clear authentication data and cache
        await Promise.all([
          this.clearSessionCookie(),
          this.clearCredentials(),
          this.clearNickname(),
          this.clearUserId(),
          this.clearJoinedSeason(),
          this.clearShiftedSchedulePreference(),
          this.clearDefaultScreen(),
          this.clearLastUserInfoRefresh()
        ]);
        
        // Clear all application cache
        await this.clearAllCache();
        
        // Clear Quick Media files
        await this.clearQuickMediaFiles();
        
        // Note: Grade tracking data will be cleared when the user logs in again
        // This avoids potential import issues during logout
      }
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Session reset logout - clear only authentication data (for logout/login cycle)
   * This is used internally for session recovery and does NOT clear cache
   */
  static async sessionResetLogout(): Promise<void> {
    try {
      // Only clear authentication data, keep cache intact
      await Promise.all([
        this.clearSessionCookie(),
        this.clearCredentials(),
        this.clearNickname(),
        this.clearUserId(),
        this.clearJoinedSeason(),
        this.clearShiftedSchedulePreference(),
        this.clearDefaultScreen(),
        this.clearDashboardSlots(),
        this.clearLastUserInfoRefresh()
      ]);
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Store number of dashboard slots to display (5-8)
   */
  static async storeDashboardSlots(slots: number): Promise<void> {
    try {
      const safe = Math.min(8, Math.max(5, Math.floor(slots)));
      await AsyncStorage.setItem(this.DASHBOARD_SLOTS_KEY, String(safe));
    } catch (error) {
    }
  }

  /**
   * Retrieve stored dashboard slots preference. Returns null if not set.
   */
  static async getDashboardSlots(): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(this.DASHBOARD_SLOTS_KEY);
      if (!value) return null;
      const num = parseInt(value, 10);
      if (isNaN(num)) return null;
      return Math.min(8, Math.max(5, num));
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear dashboard slots preference
   */
  static async clearDashboardSlots(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.DASHBOARD_SLOTS_KEY);
    } catch (error) {
    }
  }

  /**
   * Store preferred reminder lead time in minutes for next-slot notifications
   */
  static async storeNextSlotReminderMinutes(minutes: number): Promise<void> {}

  /**
   * Retrieve preferred reminder lead time minutes. Returns null if not set.
   */
  static async getNextSlotReminderMinutes(): Promise<number | null> { return null; }

  /**
   * Clear the next-slot reminder preference
   */
  static async clearNextSlotReminderMinutes(): Promise<void> {}

  /**
   * Store the last user info refresh timestamp
   */
  static async storeLastUserInfoRefresh(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(this.LAST_USER_INFO_REFRESH_KEY, String(timestamp));
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Retrieve the last user info refresh timestamp
   */
  static async getLastUserInfoRefresh(): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(this.LAST_USER_INFO_REFRESH_KEY);
      if (!value) return null;
      const timestamp = parseInt(value, 10);
      return isNaN(timestamp) ? null : timestamp;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear the last user info refresh timestamp
   */
  static async clearLastUserInfoRefresh(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.LAST_USER_INFO_REFRESH_KEY);
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Check if user info should be refreshed (30 days have passed)
   */
  static async shouldRefreshUserInfo(): Promise<boolean> {
    try {
      const lastRefresh = await this.getLastUserInfoRefresh();
      if (!lastRefresh) return true; // Never refreshed before
      
      const now = Date.now();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      
      return (now - lastRefresh) >= thirtyDaysInMs;
    } catch (error) {
      return true; // Default to refresh on error
    }
  }

  /**
   * Test function to simulate monthly refresh check
   * This can be used for testing the monthly refresh functionality
   */
  static async testMonthlyRefresh(): Promise<{
    shouldRefresh: boolean;
    lastRefresh: number | null;
    daysSinceLastRefresh: number | null;
  }> {
    const shouldRefresh = await this.shouldRefreshUserInfo();
    const lastRefresh = await this.getLastUserInfoRefresh();
    
    let daysSinceLastRefresh: number | null = null;
    if (lastRefresh) {
      const now = Date.now();
      const daysInMs = now - lastRefresh;
      daysSinceLastRefresh = Math.floor(daysInMs / (24 * 60 * 60 * 1000));
    }
    
    return {
      shouldRefresh,
      lastRefresh,
      daysSinceLastRefresh
    };
  }

  /**
   * @deprecated Use userLogout() for user-initiated logout or sessionResetLogout() for session recovery
   * This method is kept for backward compatibility but will use userLogout() behavior
   */
  static async logout(nuclear: boolean = false): Promise<void> {
    return this.userLogout(nuclear);
  }

  /**
   * Perform login with username and password
   */
  static async login(username: string, password: string): Promise<boolean> {
    try {
      
      const response = await fetch('https://guc-connect-login.vercel.app/api/ntlm-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      // Safely parse response (may be JSON or text)
      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      let rawText = '';
      
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          rawText = await response.text();
        }
      } else {
        rawText = await response.text();
        try {
          data = JSON.parse(rawText);
        } catch {
          // keep data as null
        }
      }

      const status = data?.status ?? response.status;

      // Check if this is a successful login
      const isSuccessful = status === 200 || (response.status === 200 && !data?.error);

      if (isSuccessful) {
        // Try to extract cookies from multiple possible shapes
        let cookieString: string | null = null;
        const cookiesFromJson = data?.cookies || data?.headers?.['set-cookie'] || data?.headers?.['Set-Cookie'];

        if (Array.isArray(cookiesFromJson) && cookiesFromJson.length > 0) {
          cookieString = cookiesFromJson[0];
        } else if (typeof cookiesFromJson === 'string') {
          cookieString = cookiesFromJson;
        } else {
          const hdrSetCookie = response.headers.get('set-cookie');
          if (hdrSetCookie) cookieString = hdrSetCookie;
        }

        if (cookieString) {
          await this.storeSessionCookie(cookieString);
          await this.storeCredentials(username.trim(), password);
          
          // Track user login in Supabase database
          try {
            // Get user ID for tracking (import GUCAPIProxy dynamically to avoid circular dependency)
            const { GUCAPIProxy } = await import('./gucApiProxy');
            const userId = await GUCAPIProxy.getUserId();
            
            const joinedSeason = await userTrackingService.trackUserLogin(username.trim(), undefined, userId || undefined);
            
            // Cache the joined season if available
            if (joinedSeason) {
              await this.storeJoinedSeason(String(joinedSeason));
            }
          } catch (error) {
            // Don't fail login if tracking fails
          }
          
          // Start preloading schedule data in the background
          const { SchedulePreloader } = await import('./schedulePreloader');
          SchedulePreloader.preloadSchedule().catch(error => {
            // Don't show error to user - preloading is optional
          });
          
          return true;
        } else {
          return false;
        }
      } else {
        const msg = data?.error || rawText || `HTTP ${response.status}`;
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform full logout and login cycle
   */
  static async logoutAndLogin(): Promise<boolean> {
    try {
      
      // Get current credentials before logout
      const { username, password } = await this.getCredentials();
      
      if (!username || !password) {
        return false;
      }
      
      // Perform session reset logout (clears auth but keeps cache)
      await this.sessionResetLogout();
      
      // Wait a bit for logout to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Perform login
      const loginSuccess = await this.login(username, password);
      
      if (loginSuccess) {
      } else {
      }
      
      return loginSuccess;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if this is the first time the app is being opened
   */
  static async isFirstTimeOpen(): Promise<boolean> {
    try {
      const firstTimeOpen = await AsyncStorage.getItem(this.FIRST_TIME_OPEN_KEY);
      return firstTimeOpen === null; // null means first time
    } catch (error) {
      return true; // Default to first time if error
    }
  }

  /**
   * Mark that the app has been opened before (call this after successful login)
   */
  static async markAppOpened(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.FIRST_TIME_OPEN_KEY, 'false');
    } catch (error) {
    }
  }

  /**
   * Reset first time open flag (useful for testing or if you want to show onboarding again)
   */
  static async resetFirstTimeOpen(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.FIRST_TIME_OPEN_KEY);
    } catch (error) {
    }
  }

  /**
   * Clear Quick Media files and storage
   */
  static async clearQuickMediaFiles(): Promise<void> {
    try {
      // Import required modules
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const { getInfoAsync, deleteAsync, documentDirectory } = await import('expo-file-system/legacy');
      
      const MEDIA_FILES_KEY = 'quick_media_files';
      const MEDIA_DIRECTORY = `${documentDirectory}quick_media/`;
      
      // Get stored files list
      const storedFiles = await AsyncStorage.default.getItem(MEDIA_FILES_KEY);
      if (storedFiles) {
        const files = JSON.parse(storedFiles);
        
        // Delete all physical files
        for (const file of files) {
          try {
            const fileInfo = await getInfoAsync(file.uri);
            if (fileInfo.exists) {
              await deleteAsync(file.uri);
            }
          } catch (error) {
            // Continue with other files if one fails
          }
        }
      }
      
      // Remove the files list from storage
      await AsyncStorage.default.removeItem(MEDIA_FILES_KEY);
      
      // Try to remove the media directory if it exists
      try {
        const dirInfo = await getInfoAsync(MEDIA_DIRECTORY);
        if (dirInfo.exists) {
          await deleteAsync(MEDIA_DIRECTORY);
        }
      } catch (error) {
        // Directory might not exist or be in use, that's okay
      }
      
    } catch (error) {
      // Don't throw error - logout should continue even if media cleanup fails
    }
  }
}