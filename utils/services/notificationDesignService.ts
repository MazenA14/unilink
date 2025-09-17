import { Notification } from '@/utils/types/notificationTypes';
import * as Notifications from 'expo-notifications';

/**
 * Service for designing and customizing notification appearance
 */
export class NotificationDesignService {
  /**
   * Create a beautifully designed notification based on GUC notification data
   */
  static createNotificationContent(notification: Notification): Notifications.NotificationContentInput {
    const importance = notification.importance?.toLowerCase() || 'medium';
    
    // Design notification based on importance
    const design = this.getDesignForImportance(importance);
    
    return {
      title: notification.title,
      body: notification.body,
      data: {
        navigateToNotifications: true,
        notificationId: notification.id,
        importance: notification.importance,
        staff: notification.staff,
        date: notification.date,
      },
      sound: design.sound,
      priority: design.priority,
      vibrate: design.vibrate,
      badge: 1, // Show badge count
      categoryIdentifier: 'guc-notification',
      // iOS specific
      subtitle: `From: ${notification.staff}`,
      launchImageName: 'notification-icon',
      // Android specific
      color: design.color,
    };
  }

  /**
   * Get design configuration based on notification importance
   */
  private static getDesignForImportance(importance: string) {
    switch (importance) {
      case 'high':
        return {
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 500, 200, 500], // Strong vibration pattern
          color: '#FF3B30', // Red for high importance
        };
      case 'medium':
        return {
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250], // Medium vibration pattern
          color: '#FF9500', // Orange for medium importance
        };
      case 'low':
      default:
        return {
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          vibrate: [0, 200], // Light vibration pattern
          color: '#007AFF', // Blue for low importance
        };
    }
  }

  /**
   * Create a rich notification with custom styling
   */
  static createRichNotification(notification: Notification): Notifications.NotificationContentInput {
    const baseContent = this.createNotificationContent(notification);
    
    // Add rich content for better appearance
    return {
      ...baseContent,
      // Add more detailed information
      subtitle: `${notification.staff} • ${this.formatDate(notification.date)}`,
      // Custom data for rich display
      data: {
        ...baseContent.data,
        richContent: true,
        displayStyle: 'expanded',
      },
    };
  }

  /**
   * Create a notification for multiple new notifications
   */
  static createBatchNotification(count: number): Notifications.NotificationContentInput {
    return {
      title: 'New Notifications',
      body: `You have ${count} new notification${count > 1 ? 's' : ''}`,
      data: {
        navigateToNotifications: true,
        batchNotification: true,
        count,
      },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      vibrate: [0, 300, 200, 300],
      badge: count,
      categoryIdentifier: 'guc-batch-notification',
      subtitle: 'Tap to view all notifications',
      color: '#007AFF',
    };
  }

  /**
   * Create a reminder notification
   */
  static createReminderNotification(
    title: string,
    message: string,
    reminderType: 'exam' | 'assignment' | 'payment' | 'general'
  ): Notifications.NotificationContentInput {
    const design = this.getReminderDesign(reminderType);
    
    return {
      title,
      body: message,
      data: {
        navigateToNotifications: true,
        reminderType,
        isReminder: true,
      },
      sound: design.sound,
      priority: design.priority,
      vibrate: design.vibrate,
      categoryIdentifier: 'guc-reminder',
      subtitle: this.getReminderSubtitle(reminderType),
      color: design.color,
    };
  }

  /**
   * Get design for reminder notifications
   */
  private static getReminderDesign(reminderType: string) {
    switch (reminderType) {
      case 'exam':
        return {
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 400, 200, 400],
          color: '#FF3B30', // Red for exams
        };
      case 'assignment':
        return {
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 300, 200, 300],
          color: '#FF9500', // Orange for assignments
        };
      case 'payment':
        return {
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          color: '#34C759', // Green for payments
        };
      default:
        return {
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          vibrate: [0, 200],
          color: '#007AFF', // Blue for general
        };
    }
  }

  /**
   * Get subtitle for reminder notifications
   */
  private static getReminderSubtitle(reminderType: string): string {
    switch (reminderType) {
      case 'exam':
        return 'Exam Reminder';
      case 'assignment':
        return 'Assignment Due';
      case 'payment':
        return 'Payment Reminder';
      default:
        return 'App Reminder';
    }
  }

  /**
   * Format date for notification display
   */
  private static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return 'Today';
      } else if (diffDays === 2) {
        return 'Yesterday';
      } else if (diffDays <= 7) {
        return `${diffDays - 1} days ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {
      return dateString;
    }
  }

  /**
   * Create notification categories for better organization
   */
  static async setupNotificationCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('guc-notification', [
        {
          identifier: 'VIEW_ACTION',
          buttonTitle: 'View',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'MARK_READ_ACTION',
          buttonTitle: 'Mark as Read',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('guc-batch-notification', [
        {
          identifier: 'VIEW_ALL_ACTION',
          buttonTitle: 'View All',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('guc-reminder', [
        {
          identifier: 'SNOOZE_ACTION',
          buttonTitle: 'Snooze',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'DISMISS_ACTION',
          buttonTitle: 'Dismiss',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);
    } catch (error) {
      console.error('Error setting up notification categories:', error);
    }
  }
}

// Export singleton instance
export const notificationDesignService = new NotificationDesignService();
