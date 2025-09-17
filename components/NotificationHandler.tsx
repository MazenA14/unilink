import { useNotifications } from '@/contexts/NotificationContext';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

/**
 * Component to handle push notification interactions
 * Should be placed at the root level of the app
 */
export default function NotificationHandler() {
  const { requestPushPermissions } = useNotifications();

  useEffect(() => {
    // Set up notification response listener
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      
      // Navigate to notifications screen when notification is tapped
      if (data?.navigateToNotifications) {
        router.push('/notifications');
      }
    });

    // Request permissions on app start (optional - you might want to do this elsewhere)
    // requestPushPermissions();

    return () => {
      // Note: In newer versions of expo-notifications, subscriptions are automatically cleaned up
      // when the component unmounts, so we don't need to manually remove them
    };
  }, [requestPushPermissions]);

  // This component doesn't render anything
  return null;
}
