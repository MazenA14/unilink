import AsyncStorage from '@react-native-async-storage/async-storage';

export class AuthManager {
  private static SESSION_COOKIE_KEY = 'sessionCookie';

  /**
   * Store session cookie from login response
   */
  static async storeSessionCookie(cookie: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SESSION_COOKIE_KEY, cookie);
    } catch (error) {
      console.error('Failed to store session cookie:', error);
    }
  }

  /**
   * Retrieve stored session cookie
   */
  static async getSessionCookie(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.SESSION_COOKIE_KEY);
    } catch (error) {
      console.error('Failed to retrieve session cookie:', error);
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
      console.error('Failed to clear session cookie:', error);
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
}
