/**
 * Notification data structure
 */
export interface Notification {
  /** Unique identifier for the notification */
  id: string;
  /** Notification title/subject */
  title: string;
  /** Date when the notification was sent */
  date: string;
  /** Staff member who sent the notification */
  staff: string;
  /** Importance level (High, Medium, Low) */
  importance: string;
  /** Full notification body content */
  body: string;
  /** Whether the notification has been read */
  isRead: boolean;
  /** When this notification was created/fetched */
  createdAt: string;
}

/**
 * Notification context state
 */
export interface NotificationState {
  /** Array of all notifications */
  notifications: Notification[];
  /** Number of unread notifications */
  unreadCount: number;
  /** Whether notifications are currently being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Last time notifications were fetched */
  lastFetched: string | null;
  /** Expo push token for this device */
  pushToken: string | null;
  /** Whether push notification permission is granted */
  pushPermissionGranted: boolean;
}

/**
 * Notification context actions
 */
export interface NotificationActions {
  /** Fetch notifications from the API */
  fetchNotifications: () => Promise<void>;
  /** Mark a notification as read */
  markAsRead: (notificationId: string) => void;
  /** Mark all notifications as read */
  markAllAsRead: () => void;
  /** Refresh notifications */
  refreshNotifications: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
  /** Clear cache (for testing) */
  clearCache: () => Promise<void>;
  /** Request push notification permissions */
  requestPushPermissions: () => Promise<string | null>;
  /** Send local notification */
  sendLocalNotification: (notification: Notification) => Promise<void>;
  /** Check for new notifications and send push notifications */
  checkForNewNotifications: (notifications: Notification[]) => Promise<void>;
}

/**
 * Notification API response
 */
export interface NotificationApiResponse {
  /** HTML content from the notifications page */
  htmlContent: string;
  /** Success status */
  success: boolean;
  /** Error message if any */
  error?: string;
}

/**
 * Notification cache entry
 */
export interface NotificationCacheEntry {
  /** Cached notifications */
  notifications: Notification[];
  /** When the cache was created */
  cachedAt: string;
  /** Cache expiration time */
  expiresAt: string;
}

/**
 * Notification importance levels
 */
export enum NotificationImportance {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

/**
 * Notification filter options
 */
export interface NotificationFilters {
  /** Filter by read status */
  isRead?: boolean;
  /** Filter by importance level */
  importance?: NotificationImportance;
  /** Filter by staff member */
  staff?: string;
  /** Date range filter */
  dateRange?: {
    start: string;
    end: string;
  };
}
