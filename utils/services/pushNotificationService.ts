import { Notification } from '@/utils/types/notificationTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { NotificationDesignService } from './notificationDesignService';

// Storage keys
const EXPO_PUSH_TOKEN_KEY = 'expo_push_token';
const NOTIFICATION_PERMISSION_KEY = 'notification_permission_granted';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
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
        console.warn('Must use physical device for push notifications');
        return false;
      }

      // Check if running in Expo Go
      if (this.isExpoGo()) {
        console.warn(this.getExpoGoWarning());
        // In Expo Go, we can still request permissions for local notifications
        // but we should check the actual system permission
        const { status } = await Notifications.getPermissionsAsync();
        const isGranted = status === 'granted';
        
        // Store permission status
        await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, JSON.stringify(isGranted));
        
        if (!isGranted) {
          // Request permissions even in Expo Go for local notifications
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          const newIsGranted = newStatus === 'granted';
          await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, JSON.stringify(newIsGranted));
          return newIsGranted;
        }
        
        return isGranted;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      const isGranted = finalStatus === 'granted';
      
      // Store permission status
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, JSON.stringify(isGranted));
      
      if (isGranted) {
        console.log('Notification permissions granted');
      } else {
        console.log('Notification permissions denied');
      }

      return isGranted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get the Expo push token for this device
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for push notifications');
        return null;
      }

      // Check if running in Expo Go - return early to avoid the error
      if (this.isExpoGo()) {
        console.warn('Push tokens are not available in Expo Go. Use a development build for remote notifications.');
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
        const token = await Notifications.getExpoPushTokenAsync({
          projectId,
        });

        this.expoPushToken = token.data;
        
        // Cache the token
        await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token.data);
        
        console.log('Expo push token:', token.data);
        return token.data;
      }
      
      return null;
    } catch (error) {
      // Suppress the specific Expo Go error
      if (error instanceof Error && error.message.includes('expo-notifications')) {
        console.warn('Push notifications not available in Expo Go. Use a development build for full functionality.');
        return null;
      }
      console.error('Error getting Expo push token:', error);
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
      console.error('Error registering for push notifications:', error);
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
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  /**
   * Schedule a beautifully designed notification for GUC notifications
   */
  async scheduleGUCNotification(notification: Notification): Promise<void> {
    try {
      const content = NotificationDesignService.createNotificationContent(notification);
      
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error scheduling GUC notification:', error);
    }
  }

  /**
   * Schedule a batch notification for multiple new notifications
   */
  async scheduleBatchNotification(count: number): Promise<void> {
    try {
      const content = NotificationDesignService.createBatchNotification(count);
      
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error scheduling batch notification:', error);
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
      
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error scheduling reminder notification:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Check if notification permission is granted
   * Always checks the actual system permission, not cached value
   */
  async isPermissionGranted(): Promise<boolean> {
    try {
      // Always check the actual system permission, not cached value
      const { status } = await Notifications.getPermissionsAsync();
      const isGranted = status === 'granted';
      
      // Update cache with current status
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, JSON.stringify(isGranted));
      
      return isGranted;
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners() {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      
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
      console.error('Error clearing cached token:', error);
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationServiceImpl();