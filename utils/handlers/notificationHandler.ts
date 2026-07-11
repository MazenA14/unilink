import { makeGucRequest as makeProxyRequest } from '@/utils/gucRequest';
import { NotificationApiResponse } from '@/utils/types/notificationTypes';

const NOTIFICATIONS_ENDPOINT = 'https://apps.guc.edu.eg/student_ext/Main/Notifications.aspx';

/**
 * Fetches notifications from the GUC API using the native NTLM client
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
    return {
      htmlContent: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}


