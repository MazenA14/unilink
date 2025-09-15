import { fetchNotifications } from '@/utils/handlers/notificationHandler';
import { parseNotifications, processNotifications } from '@/utils/parsers/notificationParser';
import {
    Notification,
    NotificationActions,
    NotificationCacheEntry,
    NotificationState
} from '@/utils/types/notificationTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';

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
};

// Action types
type NotificationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'SET_LAST_FETCHED'; payload: string }
  | { type: 'CLEAR_ERROR' };

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
    
    default:
      return state;
  }
}

// Context
const NotificationContext = createContext<(NotificationState & NotificationActions) | null>(null);

// Provider component
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

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

  const contextValue: NotificationState & NotificationActions = {
    ...state,
    fetchNotifications: fetchNotificationsFromAPI,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    clearError,
    clearCache,
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
