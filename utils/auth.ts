import AsyncStorage from '@react-native-async-storage/async-storage';
import { userTrackingService } from './services/userTrackingService';

export class AuthManager {
  private static SESSION_COOKIE_KEY = 'sessionCookie';
  private static USERNAME_KEY = 'gucUsername';
  private static PASSWORD_KEY = 'gucPassword';
  private static NICKNAME_KEY = 'displayNickname';
  private static USER_ID_KEY = 'gucUserId';
  private static SHIFTED_SCHEDULE_KEY = 'shiftedScheduleEnabled';
  private static DEFAULT_SCREEN_KEY = 'defaultScreen';

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
      const { pushNotificationService } = await import('./services/pushNotificationService');
      await pushNotificationService.clearCachedToken();
      
      // Clear What's New cache
      await Promise.all([
        AsyncStorage.removeItem('whats_new_shown'),
        AsyncStorage.removeItem('whats_new_version')
      ]);
      
      // Clear any other potential cache keys
      await Promise.all([
        AsyncStorage.removeItem('shiftedScheduleEnabled'),
        AsyncStorage.removeItem('defaultScreen')
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
          this.clearShiftedSchedulePreference(),
          this.clearDefaultScreen()
        ]);
        
        // Clear all application cache
        await this.clearAllCache();
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
        this.clearShiftedSchedulePreference(),
        this.clearDefaultScreen()
      ]);
      
    } catch (error) {
      throw error;
    }
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
            
            await userTrackingService.trackUserLogin(username.trim(), undefined, userId || undefined);
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
}