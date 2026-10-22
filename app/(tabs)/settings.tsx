import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { SheetButtons } from '@/components/ui/SheetButtons';
import { useCustomAlert } from '@/components/CustomAlert';
import EditNicknameModal from '@/components/EditNicknameModal';
import { AppBar } from '@/components/navigation/AppBar';
import FeedbackModal from '@/components/FeedbackModal';
 
import ResetPasswordModal from '@/components/ResetPasswordModal';
import UpdateModal from '@/components/UpdateModal';
import WhatsNewModal from '@/components/WhatsNewModal';
import { Colors } from '@/constants/Colors';
import { PickerSheet } from '@/components/ui/PickerSheet';
import { SegmentOption, SegmentedControl } from '@/components/ui/SegmentedControl';
import { Radius, Shadow } from '@/constants/Theme';
import { APP_VERSION } from '@/constants/Version';
import { getWhatsNewConfig } from '@/constants/WhatsNewFeatures';
import { DefaultScreenType, useDefaultScreen } from '@/contexts/DefaultScreenContext';
import { useShiftedSchedule } from '@/contexts/ShiftedScheduleContext';
import { ThemePreference, useTheme } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { AuthManager } from '@/utils/auth';
import { GUCAPIProxy, PaymentItem } from '@/utils/gucApiProxy';
import { DEFAULT_REMINDER_OFFSET, EXACT_ALARM_PROMPT, NOTIFICATIONS_BLOCKED_PROMPT, REMINDER_OFFSET_OPTIONS, canScheduleExactAlarms, formatReminderOffset, getReminderOffset, getRemindersEnabled, hasNotificationPermission, openExactAlarmSettings, openNotificationSettings, setReminderOffset, setRemindersEnabled } from '@/utils/slotReminders';
import { userTrackingService } from '@/utils/services/userTrackingService';
import { supabase } from '@/utils/supabase';
import { resetWhatsNewStatus } from '@/utils/whatsNewStorage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getAppIcon, setAppIcon } from 'expo-dynamic-app-icon';
import { router } from 'expo-router';
import { ComponentProps, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

const THEME_OPTIONS: SegmentOption<ThemePreference>[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Tinted leading icon for a settings row. */
function RowIcon({ name, color, background }: { name: IconName; color: string; background: string }) {
  return (
    <View style={[styles.rowIcon, { backgroundColor: background }]}>
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}

const APP_ICON_OPTIONS: { value: string; label: string; source: number }[] = [
  { value: 'DEFAULT', label: 'Default', source: require('@/assets/images/app-icons/icon-original.png') },
  { value: 'blue', label: 'Blue', source: require('@/assets/images/app-icons/icon-blue.png') },
  { value: 'gold', label: 'Gold', source: require('@/assets/images/app-icons/icon-gold.png') },
  { value: 'black', label: 'Black', source: require('@/assets/images/app-icons/icon-black.png') },
  { value: 'white', label: 'White', source: require('@/assets/images/app-icons/icon-white.png') },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();
  const { themePreference, setThemePreference } = useTheme();
  const { isShiftedScheduleEnabled, setShiftedScheduleEnabled } = useShiftedSchedule();
  const { defaultScreen, setDefaultScreen } = useDefaultScreen();
  const [displayName, setDisplayName] = useState<string>('');
  const [editVisible, setEditVisible] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [defaultScreenDropdownVisible, setDefaultScreenDropdownVisible] = useState(false);
  const [showWhatsNewModal, setShowWhatsNewModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [dashboardSlots, setDashboardSlots] = useState<number>(5);
  const [slotsDropdownVisible, setSlotsDropdownVisible] = useState(false);
  const [currentAppIcon, setCurrentAppIcon] = useState<string>('DEFAULT');
  const [remindersEnabled, setRemindersEnabledState] = useState(false);
  const [reminderOffset, setReminderOffsetState] = useState<number>(DEFAULT_REMINDER_OFFSET);
  const [notificationsAllowed, setNotificationsAllowed] = useState(true);
  const [reminderDropdownVisible, setReminderDropdownVisible] = useState(false);
  const [exactAlarmsAllowed, setExactAlarmsAllowed] = useState(true);
  
  // Easter egg state
  const [easterEggTapCount, setEasterEggTapCount] = useState(0);
  const [easterEggLastTapTime, setEasterEggLastTapTime] = useState(0);
  const [showEasterEggModal, setShowEasterEggModal] = useState(false);

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

  // Easter egg handler
  const handleEasterEggTap = () => {
    const currentTime = Date.now();
    const timeDiff = currentTime - easterEggLastTapTime;
    
    // Reset count if more than 15 seconds have passed
    if (timeDiff > 15000) {
      setEasterEggTapCount(1);
    } else {
      setEasterEggTapCount(prev => prev + 1);
    }
    
    setEasterEggLastTapTime(currentTime);
    
    // Show easter egg modal if 9 taps within 15 seconds
    if (easterEggTapCount >= 8) { // 8 because we just incremented
      setShowEasterEggModal(true);
      setEasterEggTapCount(0); // Reset after showing
      
      // Track easter egg access
      (async () => {
        try {
          const { userTrackingService } = await import('@/utils/services/userTrackingService');
          await userTrackingService.trackEasterEggAccess();
        } catch {
          // Don't fail easter egg if tracking fails
        }
      })();
    }
  };
  
  // Version check functionality
  const {
    showUpdateModal,
    forceUpdate,
    isChecking,
    checkForUpdates,
    handleUpdateModalClose,
    handleUpdateModalUpdate,
  } = useVersionCheck();

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

  const screenOptions: { value: DefaultScreenType; label: string; icon: IconName }[] = [
    { value: 'dashboard', label: 'Dashboard', icon: 'home-outline' },
    { value: 'grades', label: 'Grades', icon: 'school-outline' },
    { value: 'schedule', label: 'Schedule', icon: 'calendar-outline' },
    { value: 'transcript', label: 'Transcript', icon: 'document-text-outline' },
    { value: 'settings', label: 'Settings', icon: 'settings-outline' },
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

  useEffect(() => {
    (async () => {
      const stored = await AuthManager.getDashboardSlots();
      if (stored) setDashboardSlots(stored);
    })();
  }, []);

  useEffect(() => {
    getRemindersEnabled().then(setRemindersEnabledState);
    getReminderOffset().then(setReminderOffsetState);
    const checkPermissions = () => {
      hasNotificationPermission().then(setNotificationsAllowed);
      canScheduleExactAlarms().then(setExactAlarmsAllowed);
    };
    checkPermissions();
    // Re-check after returning from system settings
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') checkPermissions();
    });
    return () => sub.remove();
  }, []);

  const promptExactAlarms = () => {
    showAlert({
      ...EXACT_ALARM_PROMPT,
      type: 'info',
      buttons: [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Allow', onPress: () => { void openExactAlarmSettings(); } },
      ],
    });
  };

  const promptNotificationsBlocked = () => {
    showAlert({
      ...NOTIFICATIONS_BLOCKED_PROMPT,
      type: 'warning',
      buttons: [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => { void openNotificationSettings(); } },
      ],
    });
  };

  const toggleReminders = async (enabled: boolean) => {
    setRemindersEnabledState(enabled);
    const result = await setRemindersEnabled(enabled);
    setRemindersEnabledState(result);
    if (!enabled) return;
    if (!result) {
      setNotificationsAllowed(false);
      promptNotificationsBlocked();
      return;
    }
    setNotificationsAllowed(true);
    if (!(await canScheduleExactAlarms())) {
      setExactAlarmsAllowed(false);
      promptExactAlarms();
    }
  };

  const changeReminderOffset = (minutes: number) => {
    setReminderOffsetState(minutes);
    setReminderDropdownVisible(false);
    void setReminderOffset(minutes);
  };

  useEffect(() => {
    try {
      setCurrentAppIcon(getAppIcon());
    } catch {
      // Not supported (e.g. running in Expo Go)
    }
  }, []);

  const changeAppIcon = (iconName: string) => {
    if (iconName === currentAppIcon) return;
    try {
      const result = setAppIcon(iconName);
      if (result === false) {
        showAlert({
          title: 'Unable to Change Icon',
          message: 'App icons can only be changed in a build with dev-client support, not in Expo Go.',
          type: 'error',
          buttons: [{ text: 'OK' }],
        });
        return;
      }
      setCurrentAppIcon(iconName);
    } catch {
      showAlert({
        title: 'Unable to Change Icon',
        message: 'App icons can only be changed in a build with dev-client support, not in Expo Go.',
        type: 'error',
        buttons: [{ text: 'OK' }],
      });
    }
  };

  const openEditNickname = () => {
    setEditVisible(true);
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="Settings" large />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.content}>

        {/* Profile Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryFont, marginTop: 0 }]}>PROFILE</Text>
        <TouchableOpacity
          style={[styles.card, styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}
          onPress={openEditNickname}
          activeOpacity={0.8}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(displayName || '?').trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.mainFont }]} numberOfLines={1}>
              {displayName || ' '}
            </Text>
            {userId ? (
              <Text style={[styles.secondaryText, { color: colors.secondaryFont, marginTop: 2 }]}>{userId}</Text>
            ) : null}
          </View>
          <View style={[styles.editChip, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={[styles.editChipText, { color: colors.primary }]}>Edit</Text>
          </View>
        </TouchableOpacity>

        {/* Financials Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>FINANCIALS</Text>
        {/* <View style={[styles.warningCard, { backgroundColor: colorScheme === 'dark' ? '#2a0a0a' : '#f8d7da', borderColor: colors.error }]}>
          <Text style={[styles.warningText, { color: colors.error }]}>
            Pay through the app at your own responsibility.
          </Text>
        </View> */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}> 
          {loadingPayments ? (
            <View style={styles.centerContainer}>
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
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}> 
          <Text style={[styles.primaryText, { color: colors.mainFont, marginBottom: 12 }]}>Theme</Text>
          <SegmentedControl options={THEME_OPTIONS} value={themePreference} onChange={setThemePreference} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.rowBetween}>
            <RowIcon name="time-outline" color={colors.primary} background={colors.primarySoft} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>Delayed 3rd Slot</Text>
              <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>* For Pharmacy, Applied Arts and Law Students (11:45 -&gt; 12:00)</Text>
            </View>
            <Switch
              value={isShiftedScheduleEnabled}
              onValueChange={setShiftedScheduleEnabled}
              trackColor={{ false: colors.borderStrong, true: colors.primary }}
              thumbColor={colors.surfaceElevated}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.primaryText, { color: colors.mainFont, marginBottom: 12 }]}>App Icon</Text>
          <View style={styles.iconOptionsRow}>
            {APP_ICON_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.iconOption}
                onPress={() => changeAppIcon(option.value)}
              >
                <View
                  style={[
                    styles.iconSwatch,
                    {
                      borderColor: currentAppIcon === option.value ? colors.tabColor : colors.border,
                      borderWidth: currentAppIcon === option.value ? 2.5 : 1,
                    },
                  ]}
                >
                  <Image source={option.source} style={styles.iconSwatchImage} />
                </View>
                <Text
                  style={[
                    styles.iconOptionLabel,
                    {
                      color: currentAppIcon === option.value ? colors.tabColor : colors.secondaryFont,
                      fontWeight: currentAppIcon === option.value ? '700' : '500',
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>PREFERENCES</Text>
        
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}> 
          <View style={styles.rowBetween}>
            <RowIcon name="home-outline" color={colors.primary} background={colors.primarySoft} />
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>Default Screen</Text>
              <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>Choose which screen to open when the app starts</Text>
            </View>
            <TouchableOpacity
              style={[styles.valuePill, { backgroundColor: colors.primarySoft }]}
              onPress={() => setDefaultScreenDropdownVisible(true)}
            >
              <Text style={[styles.pillText, { color: colors.primary }]}>{getScreenLabel(defaultScreen)}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.rowBetween}>
            <RowIcon name="layers-outline" color={colors.primary} background={colors.primarySoft} />
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>Schedule Slots</Text>
              <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>How many periods to show in Today’s schedule</Text>
            </View>
            <TouchableOpacity
              style={[styles.valuePill, { backgroundColor: colors.primarySoft }]}
              onPress={() => setSlotsDropdownVisible(true)}
            >
              <Text style={[styles.pillText, { color: colors.primary }]}>{`${dashboardSlots} Slots`}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.rowBetween}>
            <RowIcon name="alarm-outline" color={colors.primary} background={colors.primarySoft} />
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>Class Reminders</Text>
              <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>Get notified before each class starts</Text>
              {remindersEnabled && !notificationsAllowed && (
                <TouchableOpacity onPress={promptNotificationsBlocked}>
                  <Text style={[styles.secondaryText, { color: colors.tabColor }]}>Notifications are blocked. Tap to allow them</Text>
                </TouchableOpacity>
              )}
              {remindersEnabled && notificationsAllowed && !exactAlarmsAllowed && (
                <TouchableOpacity onPress={promptExactAlarms}>
                  <Text style={[styles.secondaryText, { color: colors.tabColor }]}>May arrive late. Tap to allow on-time reminders</Text>
                </TouchableOpacity>
              )}
            </View>
            <Switch
              value={remindersEnabled}
              onValueChange={(val) => { void toggleReminders(val); }}
              trackColor={{ false: colors.borderStrong, true: colors.primary }}
              thumbColor={colors.surfaceElevated}
            />
          </View>

          {remindersEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.rowBetween}>
                <RowIcon name="timer-outline" color={colors.primary} background={colors.primarySoft} />
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.primaryText, { color: colors.mainFont }]}>Remind Me</Text>
                  <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>How early before class to notify you</Text>
                </View>
                <TouchableOpacity
                  style={[styles.valuePill, { backgroundColor: colors.primarySoft }]}
                  onPress={() => setReminderDropdownVisible(true)}
                >
                  <Text style={[styles.pillText, { color: colors.primary }]}>{`${formatReminderOffset(reminderOffset)} before`}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.rowBetween}
            onPress={() => setShowResetPasswordModal(true)}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <RowIcon name="key-outline" color={colors.primary} background={colors.primarySoft} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.primaryText, { color: colors.mainFont }]}>Reset Password</Text>
                <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>Change your account password</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.secondaryFont} />
          </TouchableOpacity>

          
        </View>

        {/* Development Section */}
        {__DEV__ && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>DEVELOPMENT</Text>

            

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}> 
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

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}> 
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

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}> 
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

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}> 
              <TouchableOpacity
                style={styles.rowBetween}
                onPress={async () => {
                  try {
                    const { data, error } = await supabase
                      .from('Schedules')
                      .select('data')
                      .single();
                    
                    if (error) {
                      console.error('Error fetching schedules data:', error);
                      showAlert({
                        title: 'Error',
                        message: `Failed to fetch schedules data: ${error.message}`,
                        type: 'error',
                        buttons: [{ text: 'OK' }]
                      });
                    } else {
                      console.log('Schedules data:', data);
                      showAlert({
                        title: 'Success',
                        message: 'Schedules data fetched successfully. Check console for details.',
                        type: 'success',
                        buttons: [{ text: 'OK' }]
                      });
                    }
                  } catch (err) {
                    console.error('Unexpected error:', err);
                    showAlert({
                      title: 'Error',
                      message: 'An unexpected error occurred while fetching schedules data.',
                      type: 'error',
                      buttons: [{ text: 'OK' }]
                    });
                  }
                }}
              >
                <Text style={[styles.primaryText, { color: colors.mainFont }]}>Fetch Schedules Data</Text>
                <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>
                  Get data from Schedules table
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Support & Actions */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>SUPPORT</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}> 
          <TouchableOpacity
            style={styles.rowBetween}
            onPress={showWhatsNewManually}
          >
            <View style={styles.rowLead}>
              <RowIcon name="sparkles-outline" color={colors.secondaryDark} background={colors.secondarySoft} />
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>See What&apos;s New</Text>
            </View>
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
              <RowIcon name="cloud-download-outline" color={colors.secondaryDark} background={colors.secondarySoft} />
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
            <View style={styles.rowLead}>
              <RowIcon name="chatbubble-ellipses-outline" color={colors.secondaryDark} background={colors.secondarySoft} />
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>Give Feedback</Text>
            </View>
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
            <View style={styles.rowLead}>
              <RowIcon name="mail-outline" color={colors.secondaryDark} background={colors.secondarySoft} />
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>Contact</Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.rowBetween}
            onPress={logout}
          >
            <View style={styles.rowLead}>
              <RowIcon name="log-out-outline" color={colors.danger} background={colors.dangerSoft} />
              <Text style={[styles.primaryText, { color: colors.danger, fontWeight: '700' }]}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <TouchableOpacity onPress={handleEasterEggTap}>
            <Text style={[styles.versionText, { color: colors.secondaryFont }]}>
              UniLink v{APP_VERSION}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <EditNicknameModal
        visible={editVisible}
        initialValue={displayName}
        onClose={() => setEditVisible(false)}
        onSaved={setDisplayName}
      />

      <PickerSheet
        visible={defaultScreenDropdownVisible}
        onClose={() => setDefaultScreenDropdownVisible(false)}
        title="Default screen"
        subtitle="Opens when the app starts"
        options={screenOptions}
        selected={defaultScreen}
        onSelect={(value) => { void setDefaultScreen(value); }}
      />

      <PickerSheet
        visible={slotsDropdownVisible}
        onClose={() => setSlotsDropdownVisible(false)}
        title="Schedule slots"
        subtitle="Periods shown in Today's schedule"
        options={[5, 6, 7, 8].map((val) => ({ value: val, label: `${val} Slots` }))}
        selected={dashboardSlots}
        onSelect={(val) => {
          setDashboardSlots(val);
          void AuthManager.storeDashboardSlots(val);
        }}
      />

      <PickerSheet
        visible={reminderDropdownVisible}
        onClose={() => setReminderDropdownVisible(false)}
        title="Class reminders"
        subtitle="How early to notify you"
        options={REMINDER_OFFSET_OPTIONS.map((o) => ({
          value: o.value as number,
          label: `${o.label} before`,
          icon: 'notifications-outline' as IconName,
        }))}
        selected={reminderOffset}
        onSelect={changeReminderOffset}
      />

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
        forceUpdate={forceUpdate}
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

      {/* Easter Egg */}
      <BottomSheet
        visible={showEasterEggModal}
        onRequestClose={() => setShowEasterEggModal(false)}
        autoHeight
        header={<SheetHeader colors={colors} title="You found it!" />}
        footer={<SheetButtons primary={{ label: 'Close', onPress: () => setShowEasterEggModal(false) }} />}
      >
        <Text style={[styles.easterEggText, { color: colors.mainFont }]}>
          App created by Mazen Ahmed MET 58- on 23/9/2025
        </Text>
      </BottomSheet>

      {AlertComponent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 26,
    marginBottom: 10,
    marginLeft: 6,
    letterSpacing: 1,
  },
  card: {
    borderRadius: Radius.lg,
    padding: 18,
    borderWidth: 1,
    marginBottom: 10,
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
  centerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
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
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  valuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  editChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  iconOption: {
    alignItems: 'center',
    width: 64,
  },
  iconSwatch: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 6,
  },
  iconSwatchImage: {
    width: '100%',
    height: '100%',
  },
  iconOptionLabel: {
    fontSize: 11,
    textAlign: 'center',
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
  easterEggText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});