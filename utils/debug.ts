import { AuthManager } from './auth';

export class DebugUtils {
  /**
   * Check authentication status and log details
   */
  static async checkAuthStatus() {
    console.log('=== AUTH DEBUG ===');
    
    const sessionCookie = await AuthManager.getSessionCookie();
    console.log('Session cookie exists:', !!sessionCookie);
    
    if (sessionCookie) {
      console.log('Session cookie length:', sessionCookie.length);
      console.log('Session cookie preview:', sessionCookie.substring(0, 100) + '...');
      
      // Check if it looks like a valid cookie format
      const hasCookieName = sessionCookie.includes('=');
      const hasValidFormat = sessionCookie.includes('ASP.NET_SessionId') || sessionCookie.includes('ASPXAUTH');
      
      console.log('Has cookie format (name=value):', hasCookieName);
      console.log('Contains session identifiers:', hasValidFormat);
    } else {
      console.log('No session cookie found');
    }
    
    console.log('==================');
  }

  /**
   * Test a simple request to GUC portal
   */
  static async testGUCConnection() {
    console.log('=== CONNECTION TEST ===');
    
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
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.status === 302) {
        console.log('Redirect detected - likely needs authentication');
        const location = response.headers.get('location');
        console.log('Redirect location:', location);
      }
      
      const html = await response.text();
      console.log('Response HTML length:', html.length);
      console.log('Contains login form:', html.includes('login') || html.includes('Login'));
      
    } catch (error) {
      console.error('Connection test failed:', error);
    }
    
    console.log('=======================');
  }

  /**
   * Clear all stored data (for testing)
   */
  static async clearAllData() {
    console.log('Clearing all stored data...');
    await AuthManager.clearSessionCookie();
    console.log('All data cleared');
  }
}
