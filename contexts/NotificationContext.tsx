import { fetchNotifications } from '@/utils/handlers/notificationHandler';
import { parseNotifications, processNotifications } from '@/utils/parsers/notificationParser';
import { notificationBackendService } from '@/utils/services/notificationBackendService';
import { pushNotificationService } from '@/utils/services/pushNotificationService';
import {
    Notification,
    NotificationActions,
    NotificationCacheEntry,
    NotificationState
} from '@/utils/types/notificationTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { AppState } from 'react-native';

// Storage keys
const NOTIFICATIONS_STORAGE_KEY = 'notifications_cache';
const NOTIFICATIONS_READ_STATUS_KEY = 'notifications_read_status';

// Cache duration (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Initial state
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  lastFetched: null,
  pushToken: null,
  pushPermissionGranted: false,
};

// Action types
type NotificationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'SET_LAST_FETCHED'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_PUSH_TOKEN'; payload: string | null }
  | { type: 'SET_PUSH_PERMISSION'; payload: boolean };

// Reducer
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.isRead).length,
        loading: false,
        error: null,
      };
    
    case 'MARK_AS_READ':
      const updatedNotifications = state.notifications.map(notification =>
        notification.id === action.payload
          ? { ...notification, isRead: true }
          : notification
      );
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.isRead).length,
      };
    
    case 'MARK_ALL_AS_READ':
      const allReadNotifications = state.notifications.map(notification => ({
        ...notification,
        isRead: true,
      }));
      return {
        ...state,
        notifications: allReadNotifications,
        unreadCount: 0,
      };
    
    case 'SET_LAST_FETCHED':
      return { ...state, lastFetched: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'SET_PUSH_TOKEN':
      return { ...state, pushToken: action.payload };
    
    case 'SET_PUSH_PERMISSION':
      return { ...state, pushPermissionGranted: action.payload };
    
    default:
      return state;
  }
}

// Context
const NotificationContext = createContext<(NotificationState & NotificationActions) | null>(null);

// Provider component
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Check permission status
  const checkPermissionStatus = useCallback(async () => {
    try {
      const hasPermission = await pushNotificationService.isPermissionGranted();
      dispatch({ type: 'SET_PUSH_PERMISSION', payload: hasPermission });
      
      if (hasPermission) {
        const token = await pushNotificationService.getExpoPushToken();
        dispatch({ type: 'SET_PUSH_TOKEN', payload: token });
      } else {
        dispatch({ type: 'SET_PUSH_TOKEN', payload: null });
      }
    } catch (error) {
      console.error('Error checking permission status:', error);
    }
  }, []);

  // Load notifications from cache
  const loadCachedNotifications = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (cachedData) {
        const cacheEntry: NotificationCacheEntry = JSON.parse(cachedData);
        
        // Check if cache is still valid
        const now = new Date().getTime();
        const cacheTime = new Date(cacheEntry.cachedAt).getTime();
        
        if (now - cacheTime < CACHE_DURATION) {
          // Load read status
          const readStatusData = await AsyncStorage.getItem(NOTIFICATIONS_READ_STATUS_KEY);
          const readStatus: { [key: string]: boolean } = readStatusData ? JSON.parse(readStatusData) : {};
          
          // Apply read status to cached notifications
          const notificationsWithReadStatus = cacheEntry.notifications.map(notification => ({
            ...notification,
            isRead: readStatus[notification.id] || false,
          }));
          
          dispatch({ type: 'SET_NOTIFICATIONS', payload: notificationsWithReadStatus });
          dispatch({ type: 'SET_LAST_FETCHED', payload: cacheEntry.cachedAt });
          return;
        }
      }
    } catch (error) {
      console.warn('Error loading cached notifications:', error);
    }
  }, []);

  // Load cached notifications on mount
  useEffect(() => {
    loadCachedNotifications();
  }, [loadCachedNotifications]);

  // Initialize push notifications
  useEffect(() => {
    const initializePushNotifications = async () => {
      try {
        // Check if running in Expo Go
        if (pushNotificationService.isExpoGo()) {
          console.warn(pushNotificationService.getExpoGoWarning());
          // Still allow local notifications in Expo Go
          dispatch({ type: 'SET_PUSH_PERMISSION', payload: true });
          dispatch({ type: 'SET_PUSH_TOKEN', payload: null });
          
          // Set up notification listeners for local notifications
          const cleanup = pushNotificationService.setupNotificationListeners();
          return cleanup;
        }

        // Check permission status
        await checkPermissionStatus();

        // Set up notification listeners
        const cleanup = pushNotificationService.setupNotificationListeners();
        return cleanup;
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    const cleanup = initializePushNotifications();
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [checkPermissionStatus]);

  // Check permission status when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Check permission status when app becomes active
        checkPermissionStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [checkPermissionStatus]);

  // Check permission status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Check permission status when screen comes into focus
      checkPermissionStatus();
    }, [checkPermissionStatus])
  );

  // Save notifications to cache
  const saveNotificationsToCache = useCallback(async (notifications: Notification[]) => {
    try {
      const cacheEntry: NotificationCacheEntry = {
        notifications,
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CACHE_DURATION).toISOString(),
      };
      
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(cacheEntry));
    } catch (error) {
      console.warn('Error saving notifications to cache:', error);
    }
  }, []);

  // Save read status to cache
  const saveReadStatusToCache = useCallback(async (notifications: Notification[]) => {
    try {
      const readStatus: { [key: string]: boolean } = {};
      notifications.forEach(notification => {
        readStatus[notification.id] = notification.isRead;
      });
      
      await AsyncStorage.setItem(NOTIFICATIONS_READ_STATUS_KEY, JSON.stringify(readStatus));
    } catch (error) {
      console.warn('Error saving read status to cache:', error);
    }
  }, []);

  // Fetch notifications from API
  const fetchNotificationsFromAPI = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const response = await fetchNotifications();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch notifications');
      }

      // Parse notifications from HTML
      const parsedNotifications = parseNotifications(response.htmlContent);
      const processedNotifications = processNotifications(parsedNotifications);
      
      // Load existing read status
      const readStatusData = await AsyncStorage.getItem(NOTIFICATIONS_READ_STATUS_KEY);
      const readStatus: { [key: string]: boolean } = readStatusData ? JSON.parse(readStatusData) : {};
      
      // Apply read status to new notifications
      const notificationsWithReadStatus = processedNotifications.map(notification => ({
        ...notification,
        isRead: readStatus[notification.id] || false,
      }));

      dispatch({ type: 'SET_NOTIFICATIONS', payload: notificationsWithReadStatus });
      dispatch({ type: 'SET_LAST_FETCHED', payload: new Date().toISOString() });
      
      // Check for new notifications and send push notifications
      await checkForNewNotifications(processedNotifications);
      
      // Save to cache
      await saveNotificationsToCache(notificationsWithReadStatus);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Error fetching notifications:', error);
    }
  }, [saveNotificationsToCache]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    dispatch({ type: 'MARK_AS_READ', payload: notificationId });
    
    // Save updated read status to cache
    const updatedNotifications = state.notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    );
    await saveReadStatusToCache(updatedNotifications);
  }, [state.notifications, saveReadStatusToCache]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    dispatch({ type: 'MARK_ALL_AS_READ' });
    
    // Save updated read status to cache
    const allReadNotifications = state.notifications.map(notification => ({
      ...notification,
      isRead: true,
    }));
    await saveReadStatusToCache(allReadNotifications);
  }, [state.notifications, saveReadStatusToCache]);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await fetchNotificationsFromAPI();
  }, [fetchNotificationsFromAPI]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Clear cache (for testing)
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
      await AsyncStorage.removeItem(NOTIFICATIONS_READ_STATUS_KEY);
      
      // Reset state to initial
      dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
      dispatch({ type: 'SET_LAST_FETCHED', payload: '' });
      dispatch({ type: 'CLEAR_ERROR' });
      
      console.log('Notifications cache cleared successfully');
    } catch (error) {
      console.error('Error clearing notifications cache:', error);
    }
  }, []);

  // Request push notification permissions
  const requestPushPermissions = useCallback(async () => {
    try {
      const hasPermission = await pushNotificationService.requestPermissions();
      dispatch({ type: 'SET_PUSH_PERMISSION', payload: hasPermission });

      if (hasPermission) {
        const token = await pushNotificationService.getExpoPushToken();
        dispatch({ type: 'SET_PUSH_TOKEN', payload: token });
        
        // Register token with backend
        if (token) {
          await notificationBackendService.registerPushToken(token, 'current-user');
        }
        
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error requesting push permissions:', error);
      return null;
    }
  }, []);

  // Send local notification for new GUC notifications
  const sendLocalNotification = useCallback(async (notification: Notification) => {
    try {
      await pushNotificationService.scheduleGUCNotification(notification);
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }, []);

  // Check for new notifications and send push notifications
  const checkForNewNotifications = useCallback(async (newNotifications: Notification[]) => {
    try {
      // Get previously seen notification IDs
      const seenIdsData = await AsyncStorage.getItem('seen_notification_ids');
      const seenIds: Set<string> = seenIdsData ? new Set(JSON.parse(seenIdsData)) : new Set();

      // Find new notifications
      const newNotificationsToNotify = newNotifications.filter(
        notification => !seenIds.has(notification.id)
      );

      // Send push notifications for new notifications
      for (const notification of newNotificationsToNotify) {
        await sendLocalNotification(notification);
      }

      // Update seen notification IDs
      const allIds = new Set([...seenIds, ...newNotifications.map(n => n.id)]);
      await AsyncStorage.setItem('seen_notification_ids', JSON.stringify([...allIds]));
    } catch (error) {
      console.error('Error checking for new notifications:', error);
    }
  }, [sendLocalNotification]);

  const contextValue: NotificationState & NotificationActions = {
    ...state,
    fetchNotifications: fetchNotificationsFromAPI,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    clearError,
    clearCache,
    requestPushPermissions,
    sendLocalNotification,
    checkForNewNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}