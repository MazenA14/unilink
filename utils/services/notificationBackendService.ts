import { APP_VERSION } from '@/constants/Version';
import { AuthManager } from '@/utils/auth';

// Backend API endpoints
const BACKEND_BASE_URL = 'https://guc-connect-login.vercel.app/api';
const REGISTER_TOKEN_ENDPOINT = `${BACKEND_BASE_URL}/register-push-token`;
const SEND_NOTIFICATION_ENDPOINT = `${BACKEND_BASE_URL}/send-notification`;

export interface PushTokenRegistration {
  token: string;
  userId: string;
  deviceInfo: {
    platform: string;
    version: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
  tokens?: string[];
}

/**
 * Service for backend integration with push notifications
 */
export class NotificationBackendService {
  /**
   * Register a device's push token with the backend
   */
  async registerPushToken(token: string, userId: string): Promise<boolean> {
    try {
      const sessionCookie = await AuthManager.getSessionCookie();
      const { username } = await AuthManager.getCredentials();

      const payload: PushTokenRegistration = {
        token,
        userId: username || userId,
        deviceInfo: {
          platform: 'expo',
          version: APP_VERSION,
        },
      };

      const response = await fetch(REGISTER_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie || '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Push token registration endpoint not found. Backend may not be configured for push notifications yet.
          return false;
        }
        throw new Error(`Failed to register token: ${response.status}`);
      }

      const result = await response.json();
      return true;
    } catch (error) {
      // Error registering push token
      return false;
    }
  }

  /**
   * Send a push notification to specific devices
   */
  async sendPushNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      const sessionCookie = await AuthManager.getSessionCookie();

      const response = await fetch(SEND_NOTIFICATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie || '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to send notification: ${response.status}`);
      }

      const result = await response.json();
      return true;
    } catch (error) {
      // Error sending push notification
      return false;
    }
  }

  /**
   * Send notification to all registered devices for a user
   */
  async sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    const payload: NotificationPayload = {
      title,
      body,
      data,
      tokens: [], // Empty array means send to all user's devices
    };

    return this.sendPushNotification(payload);
  }

  /**
   * Unregister a device's push token
   */
  async unregisterPushToken(token: string): Promise<boolean> {
    try {
      const sessionCookie = await AuthManager.getSessionCookie();

      const response = await fetch(`${REGISTER_TOKEN_ENDPOINT}/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie || '',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error(`Failed to unregister token: ${response.status}`);
      }

      return true;
    } catch (error) {
      // Error unregistering push token
      return false;
    }
  }
}

// Export singleton instance
export const notificationBackendService = new NotificationBackendService();
