import { AuthManager } from './auth';

export class DebugUtils {
  /**
   * Check authentication status and log details
   */
  static async checkAuthStatus() {
    
    const sessionCookie = await AuthManager.getSessionCookie();
    
    if (sessionCookie) {
      
      // Check if it looks like a valid cookie format
      const hasCookieName = sessionCookie.includes('=');
      const hasValidFormat = sessionCookie.includes('ASP.NET_SessionId') || sessionCookie.includes('ASPXAUTH');
      
    } else {
    }
    
  }

  /**
   * Test a simple request to GUC portal
   */
  static async testGUCConnection() {
    
    try {
      const response = await fetch(
        'https://apps.guc.edu.eg/student_ext/Grade/CheckGradePerviousSemester_01.aspx',
        {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GUC-Connect-App)',
          }
        }
      );
      
      
      if (response.status === 302) {
        const location = response.headers.get('location');
      }
      
      const html = await response.text();
      
    } catch (error) {
    }
    
  }

  /**
   * Clear all stored data (for testing)
   */
  static async clearAllData() {
    await AuthManager.clearSessionCookie();
  }
}
