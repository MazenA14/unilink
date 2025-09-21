import { Colors } from '@/constants/Colors';
import { useNotifications } from '@/contexts/NotificationContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { pushNotificationService } from '@/utils/services/pushNotificationService';
import { Ionicons } from '@expo/vector-icons';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

/**
 * Test component for push notifications (for development/testing only)
 * Remove this component in production builds
 */
export default function NotificationTest() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { pushPermissionGranted, requestPushPermissions } = useNotifications();
  const isExpoGo = pushNotificationService.isExpoGo();

  const testBasicNotification = async () => {
    if (!pushPermissionGranted) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications first.',
        [{ text: 'OK' }]
      );
      return;
    }

    await pushNotificationService.scheduleLocalNotification(
      'Test Notification',
      'This is a test notification from UniLink!',
      { test: true }
    );
  };

  const testNotification = async () => {
    if (!pushPermissionGranted) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications first.',
        [{ text: 'OK' }]
      );
      return;
    }

    const mockNotification = {
      id: 'test-' + Date.now(),
      title: 'Important Announcement',
      body: 'This is a test of the notification system with proper styling and importance levels.',
      date: new Date().toISOString(),
      staff: 'Test Staff Member',
      importance: 'High',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    await pushNotificationService.scheduleGUCNotification(mockNotification);
  };

  const testBatchNotification = async () => {
    if (!pushPermissionGranted) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications first.',
        [{ text: 'OK' }]
      );
      return;
    }

    await pushNotificationService.scheduleBatchNotification(3);
  };

  const testReminderNotification = async () => {
    if (!pushPermissionGranted) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications first.',
        [{ text: 'OK' }]
      );
      return;
    }

    await pushNotificationService.scheduleReminderNotification(
      'Exam Tomorrow',
      'Don\'t forget about your exam at 10 AM in Building A',
      'exam'
    );
  };

  const requestPermissions = async () => {
    await requestPushPermissions();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.header}>
        <Ionicons name="flask" size={24} color={colors.tint} />
        <Text style={[styles.title, { color: colors.mainFont }]}>
          Notification Test Panel
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.description, { color: colors.secondaryFont }]}>
          Test different types of push notifications. Make sure notifications are enabled first.
        </Text>

        {isExpoGo && (
          <View style={[styles.expoGoWarning, { backgroundColor: colors.gradeFailing + '20', borderColor: colors.gradeFailing }]}>
            <Ionicons name="warning" size={20} color={colors.gradeFailing} />
            <Text style={[styles.expoGoWarningText, { color: colors.gradeFailing }]}>
              {pushNotificationService.getExpoGoWarning()}
            </Text>
          </View>
        )}

        <View style={styles.statusContainer}>
          <Ionicons 
            name={pushPermissionGranted ? "checkmark-circle" : "close-circle"} 
            size={20} 
            color={pushPermissionGranted ? colors.gradeGood : colors.gradeFailing} 
          />
          <Text style={[
            styles.statusText, 
            { color: pushPermissionGranted ? colors.gradeGood : colors.gradeFailing }
          ]}>
            {pushPermissionGranted ? 'Notifications Enabled' : 'Notifications Disabled'}
          </Text>
        </View>

        {!pushPermissionGranted && (
          <TouchableOpacity 
            style={[styles.permissionButton, { backgroundColor: colors.tint }]}
            onPress={requestPermissions}
          >
            <Ionicons name="notifications" size={20} color="white" />
            <Text style={styles.permissionButtonText}>Enable Notifications</Text>
          </TouchableOpacity>
        )}

        <View style={styles.testButtons}>
          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: colors.gradeGood + '20', borderColor: colors.gradeGood }]}
            onPress={testBasicNotification}
            disabled={!pushPermissionGranted}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.gradeGood} />
            <Text style={[styles.testButtonText, { color: colors.gradeGood }]}>
              Basic Notification
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: colors.gradeFailing + '20', borderColor: colors.gradeFailing }]}
            onPress={testNotification}
            disabled={!pushPermissionGranted}
          >
            <Ionicons name="school-outline" size={20} color={colors.gradeFailing} />
            <Text style={[styles.testButtonText, { color: colors.gradeFailing }]}>
              Test Notification
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: colors.gradeAverage + '20', borderColor: colors.gradeAverage }]}
            onPress={testBatchNotification}
            disabled={!pushPermissionGranted}
          >
            <Ionicons name="layers-outline" size={20} color={colors.gradeAverage} />
            <Text style={[styles.testButtonText, { color: colors.gradeAverage }]}>
              Batch Notification
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}
            onPress={testReminderNotification}
            disabled={!pushPermissionGranted}
          >
            <Ionicons name="alarm-outline" size={20} color={colors.tint} />
            <Text style={[styles.testButtonText, { color: colors.tint }]}>
              Reminder Notification
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.note, { color: colors.secondaryFont }]}>
          Note: This test panel is for development only. Remove in production builds.
        </Text>

        {isExpoGo && (
          <Text style={[styles.devBuildNote, { color: colors.tint }]}>
            💡 For full push notification support, create a development build using: npx expo install --fix
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  content: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  testButtons: {
    gap: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  note: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
  expoGoWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  expoGoWarningText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  devBuildNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
});