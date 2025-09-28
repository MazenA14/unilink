import { useCustomAlert } from '@/components/CustomAlert';
import { Colors } from '@/constants/Colors';
import { useNotifications } from '@/contexts/NotificationContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { pushNotificationService } from '@/utils/services/pushNotificationService';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface NotificationSettingsProps {
  onClose?: () => void;
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();
  const { 
    pushPermissionGranted, 
    requestPushPermissions 
  } = useNotifications();
  
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleNotifications = async () => {
    if (pushPermissionGranted) {
      // Show confirmation dialog
      showAlert({
                title: 'Device Settings Required',
                message: 'To disable notifications, please go to your device Settings > Apps > UniLink > Notifications and turn off notifications.',
                type: 'info',
                buttons: [{ text: 'OK' }]
              });
    } else {
      setIsLoading(true);
      try {
        // First check the actual system permission status
        const actualPermissionStatus = await pushNotificationService.isPermissionGranted();
        
        if (actualPermissionStatus) {
          // Permission is already granted, just update the state
          await requestPushPermissions();
          showAlert({
            title: 'Optimize for Notifications',
            message: 'For the best notification experience, we recommend disabling battery optimization for UniLink. This ensures you receive all announcements promptly.',
            type: 'info',
            buttons: [
              { text: 'Skip', style: 'cancel' },
              { 
                text: 'Show Guide', 
                style: 'default',
                onPress: showBatteryOptimizationGuide
              }
            ]
          });
        } else {
          // Permission is not granted, try to request it
          const hasPermission = await requestPushPermissions();
          
          if (hasPermission) {
            // Permission was granted
            showAlert({
              title: 'Optimize for Notifications',
              message: 'For the best notification experience, we recommend disabling battery optimization for UniLink. This ensures you receive all announcements promptly.',
              type: 'info',
              buttons: [
                { text: 'Skip', style: 'cancel' },
                { 
                  text: 'Show Guide', 
                  style: 'default',
                  onPress: showBatteryOptimizationGuide
                }
              ]
            });
          } else {
            // Permission was denied or not granted
            showAlert({
              title: 'Enable Notifications in Settings',
              message: 'Notifications are currently disabled. To enable them:\n\n• Go to your device Settings\n• Find "Apps" or "Application Manager"\n• Select "UniLink"\n• Tap "Notifications"\n• Turn on "Allow notifications"',
              type: 'info',
              buttons: [{ 
                text: 'Got it!',
                onPress: () => {
                }
              }]
            });
          }
        }
      } catch {
        showAlert({
          title: 'Permission Error',
          message: 'Failed to request notification permissions. Please try again.',
          type: 'error',
          buttons: [{ text: 'OK' }]
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const showBatteryOptimizationGuide = () => {
    showAlert({
      title: 'Battery Optimization Guide',
      message: 'To ensure you receive all notifications:\n\n• Go to Settings > Apps > UniLink\n• Tap "Battery" or "Battery Optimization"\n• Select "Don\'t optimize" or "Allow background activity"\n\nThis prevents your device from stopping UniLink notifications to save battery.',
      type: 'info',
      buttons: [{ text: 'Got it!' }]
    });
  };

  const showNotificationTips = () => {
    showAlert({
      title: 'Notification Tips',
      message: 'For reliable notifications:\n\n• Keep UniLink notifications enabled\n• Disable battery optimization for UniLink\n• Don\'t force-close the app\n• Ensure you have a stable internet connection',
      type: 'info',
      buttons: [{ text: 'OK' }]
    });
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.primaryText, { color: colors.mainFont }]}>
              Push Notifications
            </Text>
            <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>
              Receive alerts for new announcements
            </Text>
          </View>
          <Switch
            value={pushPermissionGranted}
            onValueChange={handleToggleNotifications}
            disabled={isLoading}
            trackColor={{ false: colors.border, true: colors.tabColor }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        
        <TouchableOpacity 
          style={[styles.infoButton, { backgroundColor: colors.tabColor + '10', borderColor: colors.tabColor + '30' }]}
          onPress={showNotificationTips}
        >
          <Ionicons name="information-circle-outline" size={18} color={colors.tabColor} />
          <Text style={[styles.infoButtonText, { color: colors.tabColor }]}>
            Notification tips for best experience
          </Text>
        </TouchableOpacity>
      </View>
      {AlertComponent()}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryText: {
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
});