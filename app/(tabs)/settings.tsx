import { useCustomAlert } from '@/components/CustomAlert';
import FeedbackModal from '@/components/FeedbackModal';
import NotificationTest from '@/components/NotificationTest';
import ResetPasswordModal from '@/components/ResetPasswordModal';
import UpdateModal from '@/components/UpdateModal';
import WhatsNewModal from '@/components/WhatsNewModal';
import { Colors } from '@/constants/Colors';
import { APP_VERSION } from '@/constants/Version';
import { getWhatsNewConfig } from '@/constants/WhatsNewFeatures';
import { DefaultScreenType, useDefaultScreen } from '@/contexts/DefaultScreenContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useShiftedSchedule } from '@/contexts/ShiftedScheduleContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { AuthManager } from '@/utils/auth';
import { GUCAPIProxy, PaymentItem } from '@/utils/gucApiProxy';
import { pushNotificationService } from '@/utils/services/pushNotificationService';
import { userTrackingService } from '@/utils/services/userTrackingService';
import { resetWhatsNewStatus } from '@/utils/whatsNewStorage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();
  const { themePreference, setThemePreference } = useTheme();
  const { isShiftedScheduleEnabled, setShiftedScheduleEnabled } = useShiftedSchedule();
  const { defaultScreen, setDefaultScreen } = useDefaultScreen();
  const { pushPermissionGranted, requestPushPermissions } = useNotifications();
  const [displayName, setDisplayName] = useState<string>('');
  const [editVisible, setEditVisible] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [payingIndex, setPayingIndex] = useState<number | null>(null);
  const [defaultScreenDropdownVisible, setDefaultScreenDropdownVisible] = useState(false);
  const [pillButtonLayout, setPillButtonLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const pillButtonRef = useRef<View>(null);
  const [showWhatsNewModal, setShowWhatsNewModal] = useState(false);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const testUserTracking = async () => {
    try {
      await userTrackingService.trackUserLogin('test_user', '12345678', '2020-12345');
    } catch {
      // Manual test failed
    }
  };

  const testConnection = async () => {
    try {
      await userTrackingService.testConnection();
    } catch {
      // Connection test failed
    }
  };
  
  // Version check functionality
  const {
    showUpdateModal,
    isChecking,
    checkForUpdates,
    handleUpdateModalClose,
    handleUpdateModalUpdate,
  } = useVersionCheck();

  const isDark = useMemo(() => themePreference === 'dark' || (themePreference === 'system' && (colorScheme === 'dark')), [themePreference, colorScheme]);

  // Get what's new config
  const whatsNewConfig = getWhatsNewConfig();

  // Function to manually show what's new modal (bypasses the "see once" rule)
  const showWhatsNewManually = () => {
    setShowWhatsNewModal(true);
  };

  // Function to close what's new modal
  const closeWhatsNewModal = () => {
    setShowWhatsNewModal(false);
  };

  // Notification toggle function
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
      setIsNotificationLoading(true);
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
        setIsNotificationLoading(false);
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

  const screenOptions: { value: DefaultScreenType; label: string }[] = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'grades', label: 'Grades' },
    { value: 'schedule', label: 'Schedule' },
    { value: 'transcript', label: 'Transcript' },
    { value: 'settings', label: 'Settings' },
  ];

  const getScreenLabel = (screen: DefaultScreenType) => {
    return screenOptions.find(option => option.value === screen)?.label || 'Dashboard';
  };

  useEffect(() => {
    (async () => {
      const [creds, nick, storedId] = await Promise.all([
        AuthManager.getCredentials(),
        AuthManager.getNickname(),
        AuthManager.getUserId(),
      ]);
      const username = creds.username || '';
      const formattedFromUsername = username
        .split('@')[0]
        .split('.')
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
      setDisplayName(nick || formattedFromUsername || '');
      setUserId(storedId);

      if (!storedId) {
        const fetched = await GUCAPIProxy.getUserId();
        if (fetched) {
          setUserId(fetched);
          await AuthManager.storeUserId(fetched);
        }
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingPayments(true);
      try {
        const fetched = await GUCAPIProxy.getOutstandingPayments();
        setPayments(fetched);
      } catch {
      } finally {
        setLoadingPayments(false);
      }
    })();
  }, []);

  const openEditNickname = () => {
    setEditValue(displayName);
    setEditVisible(true);
  };

  const saveNickname = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      showAlert({
        title: 'Invalid Nickname',
        message: 'Nickname cannot be empty.',
        type: 'error',
        buttons: [{ text: 'OK', style: 'cancel' }],
      });
      return;
    }
    await AuthManager.storeNickname(trimmed);
    setDisplayName(trimmed);
    setEditVisible(false);
  };

  const logout = async () => {
    showAlert({
      title: 'Logout',
      message: 'Are you sure you want to logout?\n Saved data will be cleared.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AuthManager.userLogout();
            router.replace('/login');
          },
        },
      ],
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.mainFont }]}>Settings</Text>
      </View>
      <View style={styles.content}>

        {/* Profile Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryFont, marginTop: 0 }]}>PROFILE</Text>
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}> 
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>
                {displayName || ' '}{userId ? `  ·  ${userId}` : ''}
              </Text>
              <TouchableOpacity onPress={openEditNickname}>
                <Text style={[styles.secondaryText, { color: colors.tabColor }]}>Edit Nickname</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Financials Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>FINANCIALS</Text>
        <View style={[styles.warningCard, { backgroundColor: colorScheme === 'dark' ? '#2a0a0a' : '#f8d7da', borderColor: colors.error }]}>
          <Text style={[styles.warningText, { color: colors.error }]}>
            Pay through the app at your own responsibility.
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}> 
          {loadingPayments ? (
            <View style={styles.rowBetween}>
              <ActivityIndicator size="small" color={colors.tabColor} />
            </View>
          ) : payments.length === 0 ? (
            <View style={styles.rowBetween}>
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>No outstanding payments</Text>
            </View>
          ) : (
            <View>
              {payments.map((p: any, idx: number) => (
                <View key={idx} style={[styles.paymentRow, { borderColor: colors.border, borderTopWidth: idx === 0 ? 0 : 1 }]}> 
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.primaryText, { color: colors.mainFont }]}>
                      {p.description}
                    </Text>
                    <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>
                      Due {p.dueDate}
                    </Text>
                  </View>
                  <Text style={[styles.paymentAmount, { color: colors.financials }]}>
                    {p.currency} {p.amount.toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    disabled={!p.eventTarget || payingIndex === idx}
                    onPress={async () => {
                      if (!p.eventTarget) return;
                      try {
                        setPayingIndex(idx);
                        const redirectUrl = await GUCAPIProxy.payOutstanding(p.eventTarget);
                        if (redirectUrl) {
                          const supported = await Linking.canOpenURL(redirectUrl);
                          if (supported) {
                            await Linking.openURL(redirectUrl);
                          } else {
                            showAlert({
                              title: 'Payment',
                              message: 'Unable to initiate payment. Please try again from the portal.',
                              type: 'error',
                              buttons: [{ text: 'Close', style: 'cancel' }],
                            });
                          }
                        } else {
                          // If no URL returned, refresh list anyway
                          const refreshed = await GUCAPIProxy.getOutstandingPayments();
                          setPayments(refreshed);
                        }
                      } catch {
                        showAlert({
                          title: 'Payment',
                          message: 'Unable to initiate payment. Please try again from the portal.',
                          type: 'error',
                          buttons: [{ text: 'Close', style: 'cancel' }],
                        });
                      } finally {
                        setPayingIndex(null);
                      }
                    }}
                    style={[styles.payBtn, { backgroundColor: (!p.eventTarget ? colors.border : colors.tabColor) }]}
                  >
                    {payingIndex === idx ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <Text style={[styles.payBtnText, { color: colors.background }]}>Pay</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}> 
          <View style={styles.rowBetween}>
            <Text style={[styles.primaryText, { color: colors.mainFont }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={(val) => setThemePreference(val ? 'dark' : 'light')}
              trackColor={{ false: colors.border, true: colors.tabColor }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>Delayed 3rd Slot</Text>
              <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>* For Pharmacy, Applied Arts and Law Students (11:45 -&gt; 12:00)</Text>
            </View>
            <Switch
              value={isShiftedScheduleEnabled}
              onValueChange={setShiftedScheduleEnabled}
              trackColor={{ false: colors.border, true: colors.tabColor }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>PREFERENCES</Text>
        
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}> 
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>Default Screen</Text>
              <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>
                Choose which screen to open when the app starts
              </Text>
            </View>
            <TouchableOpacity
              ref={pillButtonRef}
              style={[styles.pillButton, { backgroundColor: colors.tabColor }]}
              onPress={() => {
                pillButtonRef.current?.measureInWindow((x, y, width, height) => {
                  setPillButtonLayout({ x, y, width, height });
                  setDefaultScreenDropdownVisible(true);
                });
              }}
            >
              <Text style={[styles.pillText, { color: colors.background }]}>
                {getScreenLabel(defaultScreen)}
              </Text>
              <Text style={[styles.pillArrow, { color: colors.background }]}>▼</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.rowBetween}
            onPress={() => setShowResetPasswordModal(true)}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              {/* <Ionicons name="key-outline" size={20} color={colors.tabColor} style={{ marginRight: 12 }} /> */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.primaryText, { color: colors.mainFont }]}>
                  Reset Password
                </Text>
                <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>
                  Change your account password
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.secondaryFont} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
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
              disabled={isNotificationLoading}
              trackColor={{ false: colors.border, true: colors.tabColor }}
              thumbColor="#ffffff"
            />
          </View>
          
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

        {/* Development Section */}
        {__DEV__ && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>DEVELOPMENT</Text>

            <NotificationTest />

            <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}> 
              <TouchableOpacity
                style={styles.rowBetween}
                onPress={async () => {
                  await resetWhatsNewStatus();
                  showAlert({
                    title: 'What\'s New Reset',
                    message: 'What\'s New modal status has been reset. It will show again on next dashboard load.',
                    type: 'success',
                    buttons: [{ text: 'OK', style: 'cancel' }],
                  });
                }}
              >
                <Text style={[styles.primaryText, { color: colors.mainFont }]}>Reset What&apos;s New</Text>
                <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>
                  Show modal again
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}> 
              <TouchableOpacity
                style={styles.rowBetween}
                onPress={testConnection}
              >
                <Text style={[styles.primaryText, { color: colors.mainFont }]}>Test Supabase Connection</Text>
                <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>
                  Check Database
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}> 
              <TouchableOpacity
                style={styles.rowBetween}
                onPress={testUserTracking}
              >
                <Text style={[styles.primaryText, { color: colors.mainFont }]}>Test User Tracking</Text>
                <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>
                  Debug Supabase
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Support & Actions */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>SUPPORT</Text>
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}> 
          <TouchableOpacity
            style={styles.rowBetween}
            onPress={showWhatsNewManually}
          >
            <Text style={[styles.primaryText, { color: colors.mainFont }]}>See What&apos;s New</Text>
            {/* <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>
              View latest features
            </Text> */}
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.rowBetween}
            onPress={async () => {
              try {
                const updateAvailable = await checkForUpdates();
                
                // Only show "Up to Date" message if no update is available
                if (!updateAvailable) {
                  showAlert({
                    title: 'Up to Date',
                    message: 'You are using the latest version of UniLink.',
                    type: 'success',
                    buttons: [{ text: 'OK' }]
                  });
                }
                // If updateAvailable is true, the UpdateModal will be shown automatically
              } catch {
                showAlert({
                  title: 'Update Check Failed',
                  message: 'Unable to check for updates. Please try again later.',
                  type: 'error',
                  buttons: [{ text: 'OK' }]
                });
              }
            }}
            disabled={isChecking}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>Check for Updates</Text>
              {isChecking && (
                <ActivityIndicator 
                  size="small" 
                  color={colors.tabColor} 
                  style={{ marginLeft: 8 }} 
                />
              )}
            </View>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.rowBetween}
            onPress={() => setShowFeedbackModal(true)}
          >
            <Text style={[styles.primaryText, { color: colors.mainFont }]}>Give Feedback</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.rowBetween}
            onPress={async () => {
              const email = 'unilink058@gmail.com';
              showAlert({
                title: 'Contact',
                message: email,
                type: 'info',
                buttons: [
                  {
                    text: 'Close',
                    style: 'cancel',
                  },
                ],
              });
            }}
          >
            <Text style={[styles.primaryText, { color: colors.mainFont }]}>Contact</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.rowBetween}
            onPress={logout}
          >
            <Text style={[styles.primaryText, { color: colors.gradeFailing }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.secondaryFont }]}>
            UniLink v{APP_VERSION}
          </Text>
        </View>
      </View>

      <Modal
        visible={editVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.mainFont }]}>Edit Nickname</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.background, 
                color: colors.mainFont,
                borderColor: colors.border 
              }]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder="Enter nickname"
              placeholderTextColor={colors.secondaryFont}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setEditVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.mainFont }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.tabColor }]}
                onPress={saveNickname}
              >
                <Text style={[styles.modalButtonText, { color: colors.background }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Default Screen Selection Dropdown */}
      <Modal
        visible={defaultScreenDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDefaultScreenDropdownVisible(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setDefaultScreenDropdownVisible(false)}
        >
          {pillButtonLayout && (
            <View 
              style={[
                styles.dropdownContainer,
                {
                  top: pillButtonLayout.y + pillButtonLayout.height + 8,
                  left: pillButtonLayout.x,
                  width: pillButtonLayout.width,
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  shadowColor: colorScheme === 'dark' ? '#000000' : '#000000',
                }
              ]}
            >
              {screenOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    { 
                      backgroundColor: defaultScreen === option.value ? colors.tabColor + '20' : 'transparent',
                      borderBottomColor: index < screenOptions.length - 1 ? colors.border : 'transparent',
                      borderTopLeftRadius: index === 0 ? 12 : 0,
                      borderTopRightRadius: index === 0 ? 12 : 0,
                      borderBottomLeftRadius: index === screenOptions.length - 1 ? 12 : 0,
                      borderBottomRightRadius: index === screenOptions.length - 1 ? 12 : 0,
                    }
                  ]}
                  onPress={async () => {
                    await setDefaultScreen(option.value);
                    setDefaultScreenDropdownVisible(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    { 
                      color: defaultScreen === option.value ? colors.tabColor : colors.mainFont,
                      fontWeight: defaultScreen === option.value ? '600' : '400'
                    }
                  ]}>
                    {option.label}
                  </Text>
                  {defaultScreen === option.value && (
                    <Text style={[styles.checkmark, { color: colors.tabColor }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </Modal>

      {/* What's New Modal */}
      <WhatsNewModal
        visible={showWhatsNewModal}
        onClose={closeWhatsNewModal}
        features={whatsNewConfig.features}
        version={whatsNewConfig.version}
      />

      {/* Update Modal */}
      <UpdateModal
        visible={showUpdateModal}
        onClose={handleUpdateModalClose}
        onUpdate={handleUpdateModalUpdate}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        visible={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        onSuccess={async () => {
          // Logout user after successful password reset
          await AuthManager.userLogout();
          router.replace('/login');
        }}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSuccess={() => {
          showAlert({
            title: 'Thank You!',
            message: 'Your feedback has been submitted successfully. We appreciate your input!',
            type: 'success',
            buttons: [{ text: 'OK' }]
          });
        }}
        onError={(message) => {
          showAlert({
            title: 'Error',
            message: message,
            type: 'error',
            buttons: [{ text: 'OK' }]
          });
        }}
      />

      {AlertComponent()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    paddingTop: 60,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  warningCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'left',
    lineHeight: 16,
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
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  payBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  payBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pillContainer: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 120,
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  pillArrow: {
    fontSize: 10,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dropdownContainer: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 12,
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