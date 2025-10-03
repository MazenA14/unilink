import { useCustomAlert } from '@/components/CustomAlert';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
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
  // Push notifications removed
  
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleNotifications = async () => {
    showAlert({
      title: 'Push Notifications Disabled',
      message: 'Push notifications are currently disabled in this build.',
      type: 'info',
      buttons: [{ text: 'OK' }]
    });
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
            value={false}
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


