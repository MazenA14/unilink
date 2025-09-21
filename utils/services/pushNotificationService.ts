import { Notification } from '@/utils/types/notificationTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  AndroidNotificationPriority,
  dismissAllNotificationsAsync,
  getExpoPushTokenAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationHandler
} from 'expo-notifications';
import { NotificationDesignService } from './notificationDesignService';

// Storage keys
const EXPO_PUSH_TOKEN_KEY = 'expo_push_token';
const NOTIFICATION_PERMISSION_KEY = 'notification_permission_granted';

// Configure how notifications are handled when the app is in the foreground
setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationService {
  requestPermissions: () => Promise<boolean>;
  getExpoPushToken: () => Promise<string | null>;
  registerForPushNotifications: () => Promise<string | null>;
  scheduleLocalNotification: (title: string, body: string, data?: any) => Promise<void>;
  scheduleGUCNotification: (notification: Notification) => Promise<void>;
  scheduleBatchNotification: (count: number) => Promise<void>;
  scheduleReminderNotification: (title: string, message: string, reminderType: 'exam' | 'assignment' | 'payment' | 'general') => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  isPermissionGranted: () => Promise<boolean>;
  setupNotificationListeners: () => () => void;
  isExpoGo: () => boolean;
  getExpoGoWarning: () => string;
}

class PushNotificationServiceImpl implements PushNotificationService {
  private expoPushToken: string | null = null;

  /**
   * Check if running in Expo Go
   */
  isExpoGo(): boolean {
    return Constants.appOwnership === 'expo';
  }

  /**
   * Get Expo Go warning message
   */
  getExpoGoWarning(): string {
    return 'Push notifications are not fully supported in Expo Go. Please use a development build for full functionality.';
  }

  /**
   * Request notification permissions from the user
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        return false;
      }

      // Check if running in Expo Go
      if (this.isExpoGo()) {
        // In Expo Go, we can still request permissions for local notifications
        // but we should check the actual system permission
        const { status } = await getPermissionsAsync();
        const isGranted = status === 'granted';
        
        // Store permission status
        await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, JSON.stringify(isGranted));
        
        if (!isGranted) {
          // Request permissions even in Expo Go for local notifications
          const { status: newStatus } = await requestPermissionsAsync();
          const newIsGranted = newStatus === 'granted';
          await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, JSON.stringify(newIsGranted));
          return newIsGranted;
        }
        
        return isGranted;
      }

      const { status: existingStatus } = await getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await requestPermissionsAsync();
        finalStatus = status;
      }

      const isGranted = finalStatus === 'granted';
      
      // Store permission status
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, JSON.stringify(isGranted));
      
      if (isGranted) {
      } else {
      }

      return isGranted;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the Expo push token for this device
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      // Check if running in Expo Go - return early to avoid the error
      if (this.isExpoGo()) {
        return null;
      }

      // Check if we already have a cached token
      const cachedToken = await AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
      if (cachedToken) {
        this.expoPushToken = cachedToken;
        return cachedToken;
      }

      // Get the project ID from app.json
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'b55d50f1-a6f1-4e96-90d8-c59a5eb8e733';
      
      // Only call getExpoPushTokenAsync if not in Expo Go
      if (!this.isExpoGo()) {
        const token = await getExpoPushTokenAsync({
          projectId,
        });

        this.expoPushToken = token.data;
        
        // Cache the token
        await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token.data);
        
        return token.data;
      }
      
      return null;
    } catch (error) {
      // Suppress the specific Expo Go error
      if (error instanceof Error && error.message.includes('expo-notifications')) {
        return null;
      }
      return null;
    }
  }

  /**
   * Register for push notifications (request permissions + get token)
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const token = await this.getExpoPushToken();
      return token;
    } catch (error) {
      return null;
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string, 
    body: string, 
    data?: any
  ): Promise<void> {
    try {
      await scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
    }
  }

  /**
   * Schedule a beautifully designed notification for GUC notifications
   */
  async scheduleGUCNotification(notification: Notification): Promise<void> {
    try {
      const content = NotificationDesignService.createNotificationContent(notification);
      
      await scheduleNotificationAsync({
        content,
        trigger: null, // Show immediately
      });
    } catch (error) {
    }
  }

  /**
   * Schedule a batch notification for multiple new notifications
   */
  async scheduleBatchNotification(count: number): Promise<void> {
    try {
      const content = NotificationDesignService.createBatchNotification(count);
      
      await scheduleNotificationAsync({
        content,
        trigger: null, // Show immediately
      });
    } catch (error) {
    }
  }

  /**
   * Schedule a reminder notification
   */
  async scheduleReminderNotification(
    title: string,
    message: string,
    reminderType: 'exam' | 'assignment' | 'payment' | 'general'
  ): Promise<void> {
    try {
      const content = NotificationDesignService.createReminderNotification(
        title,
        message,
        reminderType
      );
      
      await scheduleNotificationAsync({
        content,
        trigger: null, // Show immediately
      });
    } catch (error) {
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await dismissAllNotificationsAsync();
    } catch (error) {
    }
  }

  /**
   * Check if notification permission is granted
   * Always checks the actual system permission, not cached value
   */
  async isPermissionGranted(): Promise<boolean> {
    try {
      // Always check the actual system permission, not cached value
      const { status } = await getPermissionsAsync();
      const isGranted = status === 'granted';
      
      // Update cache with current status
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, JSON.stringify(isGranted));
      
      return isGranted;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners() {
    // Handle notification received while app is in foreground
    addNotificationReceivedListener(notification => {
    });

    // Handle notification tapped
    addNotificationResponseReceivedListener(response => {
      
      // Navigate to notifications screen when notification is tapped
      const data = response.notification.request.content.data;
      if (data?.navigateToNotifications) {
        // This will be handled by the app's navigation system
        // We'll emit an event that the app can listen to
        this.emitNotificationTappedEvent(data);
      }
    });

    return () => {
      // Note: In newer versions of expo-notifications, subscriptions are automatically cleaned up
      // when the component unmounts, so we don't need to manually remove them
    };
  }

  /**
   * Emit notification tapped event for navigation
   */
  private emitNotificationTappedEvent(data: any) {
    // Create a custom event that the app can listen to
    const event = new CustomEvent('notificationTapped', { detail: data });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }

  /**
   * Clear cached token (useful for logout)
   */
  async clearCachedToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(EXPO_PUSH_TOKEN_KEY);
      await AsyncStorage.removeItem(NOTIFICATION_PERMISSION_KEY);
      this.expoPushToken = null;
    } catch (error) {
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationServiceImpl();