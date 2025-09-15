import { AuthManager } from '@/utils/auth';
import { NotificationApiResponse } from '@/utils/types/notificationTypes';

const NOTIFICATIONS_ENDPOINT = 'https://apps.guc.edu.eg/student_ext/Main/Notifications.aspx';
const PROXY_BASE_URL = 'https://guc-connect-login.vercel.app/api';

/**
 * Make authenticated request through proxy server
 */
async function makeProxyRequest(url: string, method: string = 'GET', body?: any): Promise<any> {
  const sessionCookie = await AuthManager.getSessionCookie();
  const { username, password } = await AuthManager.getCredentials();

  const payload: any = {
    url,
    method,
    cookies: sessionCookie || '',
    body,
  };

  // If we have creds, enable NTLM per-request as fallback
  if (username && password) {
    payload.useNtlm = true;
    payload.username = username;
    payload.password = password;
  }

  const response = await fetch(`${PROXY_BASE_URL}/proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Proxy request failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.status === 401) {
    await AuthManager.clearSessionCookie();
    throw new Error('Session expired. Please login again.');
  }

  if (data.status !== 200) {
    throw new Error(`Request failed: ${data.status}`);
  }

  return data;
}

/**
 * Fetches notifications from the GUC API using proxy server
 * @returns Promise with HTML content from notifications page
 */
export async function fetchNotifications(): Promise<NotificationApiResponse> {
  try {
    // Use the proxy server to fetch notifications
    const data = await makeProxyRequest(NOTIFICATIONS_ENDPOINT, 'GET');

    return {
      htmlContent: data.body,
      success: true,
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return {
      htmlContent: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
