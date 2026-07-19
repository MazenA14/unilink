import { AppBar } from '@/components/navigation/AppBar';
import { MultipleLecturesModal } from '@/components/schedule/MultipleLecturesModal';
import UpdateModal from '@/components/UpdateModal';
import WhatsNewModal from '@/components/WhatsNewModal';
import { Colors, ScheduleTypeColors } from '@/constants/Colors';
import { Radius, Shadow, Spacing, withAlpha } from '@/constants/Theme';

import { useNotifications } from '@/contexts/NotificationContext';
import { useShiftedSchedule } from '@/contexts/ShiftedScheduleContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSchedule } from '@/hooks/useSchedule';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { useWhatsNew } from '@/hooks/useWhatsNew';
import { AuthManager } from '@/utils/auth';
import { isCurrentTimeSlot } from '@/utils/currentSlotUtils';
import { GradeCache } from '@/utils/gradeCache';
import { GUCAPIProxy } from '@/utils/gucApiProxy';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [nickname, setNickname] = useState<string>('Student');
  const [username, setUsername] = useState<string>('');
  const { scheduleData, loading: scheduleLoading, refetch: refetchSchedule } = useSchedule();
  const { isShiftedScheduleEnabled } = useShiftedSchedule();
  const { unreadCount, refreshNotifications } = useNotifications();
  const refreshRotation = useRef(new Animated.Value(0)).current;
  
  // Multiple lectures modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLectures, setSelectedLectures] = useState<any[]>([]);
  const [selectedPeriodName, setSelectedPeriodName] = useState('');
  const [selectedDayName, setSelectedDayName] = useState('');
  
  // Version check hook
  const {
    showUpdateModal,
    forceUpdate,
    checkForUpdates,
    handleUpdateModalClose,
    handleUpdateModalUpdate,
  } = useVersionCheck();
  
  // What's New modal hook
  const {
    showModal: showWhatsNewModal,
    features: whatsNewFeatures,
    version: whatsNewVersion,
    checkAndShowModal: checkWhatsNew,
    handleCloseModal: handleWhatsNewClose,
  } = useWhatsNew();
  
  // State for course name mapping
  const [courseNameMapping, setCourseNameMapping] = useState<{ [courseId: string]: string }>({});
  
  // State to force re-render for current slot indicator
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [dashboardSlots, setDashboardSlots] = useState<number>(5);
  useEffect(() => {
    (async () => {
      const stored = await AuthManager.getDashboardSlots();
      setDashboardSlots(stored || 5);
    })();
  }, []);
  
  // Use currentTime to ensure slot indicators are always up to date
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = currentTime; // This triggers re-render when time changes

  // Load course name mapping on component mount
  useEffect(() => {
    const loadCourseNameMapping = async () => {
      try {
        // First try to get from cache
        let mapping = await GradeCache.getCachedCourseIdToName();
        
        // If no mapping in cache, try to load available courses and create mapping
        if (!mapping) {
          try {
            const availableCourses = await GUCAPIProxy.getAvailableCourses();
            
            // Create course ID to name mapping
            const courseIdToNameMapping: { [courseId: string]: string } = {};
            availableCourses.forEach(course => {
              courseIdToNameMapping[course.value] = course.text;
            });
            
            // Cache the mapping
            await GradeCache.setCachedCourseIdToName(courseIdToNameMapping);
            mapping = courseIdToNameMapping;
          } catch {
          }
        }
        
        if (mapping) {
          setCourseNameMapping(mapping);
        }
      } catch {
      }
    };
    
    loadCourseNameMapping();
  }, []);

  const loadNickname = useCallback(async () => {
    // Load username for gated features (e.g. statistics access)
    const { username: storedUsername } = await AuthManager.getCredentials();
    if (storedUsername) setUsername(storedUsername);

    // First try to get stored nickname
    const storedNickname = await AuthManager.getNickname();
    if (storedNickname) {
      setNickname(storedNickname);
      return;
    }

    // If no stored nickname, extract first name from username
    if (storedUsername) {
      // Extract first name from username (assuming format: user.name or user_name)
      const firstName = storedUsername.split(/[._]/)[0];
      if (firstName) {
        // Capitalize first letter
        const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        setNickname(capitalizedFirstName);
      }
    }
  }, []);

  // Utility function to get course name by matching course names
  const getCourseNameByMatching = (scheduleCourseName: string): string | null => {
    if (!scheduleCourseName || Object.keys(courseNameMapping).length === 0) {
      return null;
    }
    
    // Try to find a match in the course mapping
    // First, try exact match
    for (const [, courseName] of Object.entries(courseNameMapping)) {
      if (courseName === scheduleCourseName) {
        return courseName;
      }
    }
    
    // Try partial matching - look for course names that contain the schedule course name
    for (const [, courseName] of Object.entries(courseNameMapping)) {
      if (courseName.toLowerCase().includes(scheduleCourseName.toLowerCase()) ||
          scheduleCourseName.toLowerCase().includes(courseName.toLowerCase())) {
        return courseName;
      }
    }
    
    // Try to match by extracting course code from both
    const scheduleCourseCode = extractCourseCode(scheduleCourseName);
    if (scheduleCourseCode) {
      for (const [, courseName] of Object.entries(courseNameMapping)) {
        const mappedCourseCode = extractCourseCode(courseName);
        if (mappedCourseCode && mappedCourseCode === scheduleCourseCode) {
          return courseName;
        }
      }
    }
    
    return null;
  };

  // Function to extract course title from full course name
  // Example: "MET Computer Science 7th Semester - DMET502 Computer Graphics" -> "Computer Graphics"
  const extractCourseTitle = (fullCourseName: string): string => {
    if (!fullCourseName) return '';
    
    // Look for pattern: "something - COURSECODE Course Title"
    const match = fullCourseName.match(/- ([A-Z]+\d+[A-Z]*)\s+(.+)$/);
    if (match) {
      return match[2].trim(); // Return the course title part
    }
    
    // Look for pattern: "something - COURSECODE Course Title (Lab/Tutorial)"
    const matchWithType = fullCourseName.match(/- ([A-Z]+\d+[A-Z]*)\s+(.+?)\s*\(?(lab|tutorial|tut|seminar|workshop|project|thesis|dissertation)\)?/i);
    if (matchWithType) {
      return matchWithType[2].trim();
    }
    
    // Fallback: if no dash pattern, try to extract from end after course code
    const courseCodeMatch = fullCourseName.match(/([A-Z]+\d+[A-Z]*)\s+(.+)$/);
    if (courseCodeMatch) {
      return courseCodeMatch[2].trim();
    }
    
    // If no pattern matches, return the original name
    return fullCourseName;
  };
  
  // Function to extract course code from course name (e.g., "CSEN 701" -> "CSEN701")
  const extractCourseCode = (courseName: string): string => {
    if (!courseName) return '';
    
    // Remove spaces and extract course code pattern
    const match = courseName.match(/([A-Z]{2,4}[a-z]?)\s*(\d{3,4})/);
    if (match) {
      return match[1] + match[2]; // e.g., "CSEN" + "701" = "CSEN701"
    }
    
    // Fallback: remove all spaces
    return courseName.replace(/\s+/g, '');
  };

  // Get today's schedule and day name
  const getTodaysSchedule = () => {
    if (!scheduleData?.days) return { dayName: '', periods: null };
    
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[today.getDay()];
    
    // If it's Friday, fallback to Saturday
    const targetDayName = currentDayName === 'Friday' ? 'Saturday' : currentDayName;
    
    const todaySchedule = scheduleData.days.find(day => day.dayName === targetDayName);
    
    if (todaySchedule) {
      return { dayName: targetDayName, periods: todaySchedule.periods };
    }
    
    return { dayName: targetDayName, periods: null };
  };

  const { dayName, periods } = getTodaysSchedule();

  // Get period timing based on shifted schedule setting
  const getPeriodTiming = (periodKey: string) => {
    const timings = {
      first: '8:15\n9:45',
      second: '10:00\n11:30',
      third: isShiftedScheduleEnabled ? '12:00\n1:30' : '11:45\n1:15',
      fourth: isShiftedScheduleEnabled ? '2:00\n3:30' : '1:45\n3:15',
      fifth: isShiftedScheduleEnabled ? '4:00\n5:30' : '3:45\n5:15',
      sixth: '5:30\n7:00',
      seventh: '7:15\n8:45',
      eighth: '9:00\n10:30',
    } as const;
    return timings[periodKey as keyof typeof timings] || '';
  };



  // Get slot type color
  const getSlotTypeColor = (slotType: string) => {
    const colors = {
      'Lecture': '#3B82F6',
      'Tutorial': '#10B981',
      'Lab': '#F59E0B',
      'Practical': '#FF6B35',
      'Seminar': '#8B5CF6',
      'Workshop': '#EF4444',
      'Project': '#06B6D4',
      'Thesis': '#84CC16',
      'Free': '#6B7280',
    };
    return colors[slotType as keyof typeof colors] || '#6B7280';
  };

  // Resolve a displayable course title (same mapping used by the schedule rows)
  const resolveClassName = (classData: any): string => {
    const mapped = getCourseNameByMatching(classData.courseName);
    if (mapped) {
      const t = extractCourseTitle(mapped);
      return t !== mapped ? t : mapped;
    }
    const orig = extractCourseTitle(classData.courseName);
    return orig !== classData.courseName ? orig : classData.courseName;
  };

  // Start time (in minutes since midnight) for each period, for "next class" logic
  const getPeriodStartMinutes = (periodKey: string): number => {
    const base: Record<string, number> = {
      first: 8 * 60 + 15,
      second: 10 * 60,
      third: isShiftedScheduleEnabled ? 12 * 60 : 11 * 60 + 45,
      fourth: isShiftedScheduleEnabled ? 14 * 60 : 13 * 60 + 45,
      fifth: isShiftedScheduleEnabled ? 16 * 60 : 15 * 60 + 45,
      sixth: 17 * 60 + 30,
      seventh: 19 * 60 + 15,
      eighth: 21 * 60,
    };
    return base[periodKey] ?? 0;
  };

  const PERIOD_ORDER = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'] as const;
  const PERIOD_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

  // The current in-progress class, else the next upcoming one today
  const getHeroClass = () => {
    if (!periods) return null;
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    let next: any = null;
    for (let i = 0; i < PERIOD_ORDER.length; i++) {
      const key = PERIOD_ORDER[i];
      const arr = periods[key as keyof typeof periods];
      const cd = Array.isArray(arr) ? arr[0] : arr;
      if (!cd) continue;
      const periodNumber = PERIOD_LABELS[i];
      if (isCurrentTimeSlot(key, isShiftedScheduleEnabled, currentTime)) {
        return { state: 'Now' as const, classData: cd, periodNumber, timing: getPeriodTiming(key) };
      }
      if (!next && getPeriodStartMinutes(key) >= nowMin) {
        next = { state: 'Next' as const, classData: cd, periodNumber, timing: getPeriodTiming(key) };
      }
    }
    return next;
  };

  // Handle refresh schedule
  const handleRefreshSchedule = async () => {
    try {
      // Start rotation animation
      refreshRotation.setValue(0);
      Animated.loop(
        Animated.timing(refreshRotation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();

      await refetchSchedule();
      
      // Stop animation
      refreshRotation.stopAnimation();
      refreshRotation.setValue(0);
    } catch {
      // Stop animation on error
      refreshRotation.stopAnimation();
      refreshRotation.setValue(0);
    }
  };

  // Multiple lectures modal handlers
  const handleMultipleLecturesPress = (lectures: any[], periodName: string, dayName: string) => {
    setSelectedLectures(lectures);
    setSelectedPeriodName(periodName);
    setSelectedDayName(dayName);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedLectures([]);
    setSelectedPeriodName('');
    setSelectedDayName('');
  };

  useEffect(() => {
    loadNickname();
    // Fetch notifications so the unread counter is populated before
    // the user opens the notifications screen
    refreshNotifications();
    // Check for app updates when dashboard loads
    checkForUpdates();
    // Check if we should show What's New modal
    checkWhatsNew();
  }, [loadNickname, refreshNotifications, checkForUpdates, checkWhatsNew]);

  // Update current time every minute for slot indicator
  useEffect(() => {
    const updateTime = () => {
      const newTime = new Date();
      setCurrentTime(newTime);
    };

    // Update immediately
    updateTime();

    // Set up interval to update every minute
    const interval = setInterval(updateTime, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Reload nickname and update current time when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadNickname();
      const newTime = new Date();
      setCurrentTime(newTime); // Update current time for slot indicator
      
      // Refresh dashboard slots preference on focus
      (async () => {
        const stored = await AuthManager.getDashboardSlots();
        setDashboardSlots(stored || 5);
      })();

      // Check if user info should be refreshed (every 30 days)
      (async () => {
        try {
          const shouldRefresh = await AuthManager.shouldRefreshUserInfo();
          if (shouldRefresh) {
            // Get user info and update cache and Supabase
            const userInfo = await GUCAPIProxy.getUserInfo();
            
            // Update user tracking in Supabase with fresh data
            const { userTrackingService } = await import('@/utils/services/userTrackingService');
            const { username } = await AuthManager.getCredentials();
            
            if (username && userInfo.userId) {
              await userTrackingService.trackUserLogin(username.trim(), undefined, userInfo.userId);
              
              // Cache the joined season if available
              if (userInfo.userId) {
                const joinedSeasonStr = userInfo.userId.split('-')[0];
                const joinedSeason = parseInt(joinedSeasonStr, 10);
                if (!isNaN(joinedSeason)) {
                  await AuthManager.storeJoinedSeason(String(joinedSeason));
                }
              }
            }
            
            // Update the last refresh timestamp
            await AuthManager.storeLastUserInfoRefresh(Date.now());
          }
        } catch (error) {
          // Don't show error to user - monthly refresh is optional
          console.log('Monthly user info refresh failed:', error);
        }
      })();
    }, [loadNickname])
  );

  const hero = getHeroClass();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Version Check Modal */}
      <UpdateModal
        visible={showUpdateModal}
        onClose={handleUpdateModalClose}
        onUpdate={handleUpdateModalUpdate}
        forceUpdate={forceUpdate}
      />
      
      {/* What's New Modal */}
      <WhatsNewModal
        visible={showWhatsNewModal}
        onClose={handleWhatsNewClose}
        features={whatsNewFeatures}
        version={whatsNewVersion}
      />
      
      {/* Top app bar */}
      <AppBar
        title="Dashboard"
        large
        rightActions={
          username.toLowerCase() === 'mazen.abdelazeem' ? (
            <TouchableOpacity
              onPress={() => router.push('/statistics')}
              style={[styles.notificationButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Statistics"
            >
              <Ionicons name="stats-chart" size={20} color={colors.mainFont} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Main Content */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>
          Welcome back, <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{nickname}</Text>
        </Text>

        {/* Next / current class hero */}
        {hero && hero.classData ? (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => router.replace('/(tabs)/schedule')}
            style={[styles.hero, { backgroundColor: colors.primary }, Shadow.glow(colors.primary)]}
          >
            <View style={styles.heroTopRow}>
              <View style={[styles.heroBadge, { backgroundColor: withAlpha(colors.onPrimary, 0.18) }]}>
                <View style={[styles.heroBadgeDot, { backgroundColor: colors.onPrimary }]} />
                <Text style={[styles.heroBadgeText, { color: colors.onPrimary }]}>
                  {hero.state === 'Now' ? 'IN PROGRESS' : 'NEXT CLASS'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={withAlpha(colors.onPrimary, 0.8)} />
            </View>
            <Text style={[styles.heroCourse, { color: colors.onPrimary }]} numberOfLines={2}>
              {resolveClassName(hero.classData)}
            </Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMeta}>
                <Ionicons name="time-outline" size={15} color={withAlpha(colors.onPrimary, 0.9)} />
                <Text style={[styles.heroMetaText, { color: withAlpha(colors.onPrimary, 0.9) }]}>
                  {hero.timing.replace('\n', ' – ')}
                </Text>
              </View>
              {hero.classData.room ? (
                <View style={styles.heroMeta}>
                  <Ionicons name="location-outline" size={15} color={withAlpha(colors.onPrimary, 0.9)} />
                  <Text style={[styles.heroMetaText, { color: withAlpha(colors.onPrimary, 0.9) }]}>
                    {hero.classData.room}
                  </Text>
                </View>
              ) : null}
              {hero.classData.slotType ? (
                <View style={[styles.heroTypePill, { backgroundColor: withAlpha(colors.onPrimary, 0.2) }]}>
                  <Text style={[styles.heroTypeText, { color: colors.onPrimary }]}>{hero.classData.slotType}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.hero, styles.heroEmpty, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}>
            <Ionicons name="cafe-outline" size={26} color={colors.textTertiary} />
            <Text style={[styles.heroEmptyText, { color: colors.textSecondary }]}>
              {scheduleLoading ? 'Loading your day…' : 'No more classes today'}
            </Text>
          </View>
        )}

        {/* Overview tiles */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>Overview</Text>
          <View style={styles.gridContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.warning }, Shadow.card(colors)]}
              onPress={() => router.push('/notifications')}
            >
              <View style={styles.statTop}>
                <View style={[styles.statIconChip, { backgroundColor: withAlpha(colors.warning, 0.16) }]}>
                  <Ionicons name="notifications" size={18} color={colors.warning} />
                </View>
                <Text style={[styles.statValue, { color: unreadCount > 0 ? colors.warning : colors.textPrimary }]}>{unreadCount}</Text>
              </View>
              <Text style={[styles.statLabel, { color: colors.textPrimary }]}>Notifications</Text>
              <Text style={[styles.statCaption, { color: colors.textSecondary }]}>
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.success }, Shadow.card(colors)]}
              onPress={() => router.push('/attendance')}
            >
              <View style={styles.statTop}>
                <View style={[styles.statIconChip, { backgroundColor: withAlpha(colors.success, 0.16) }]}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </View>
              <Text style={[styles.statLabel, { color: colors.textPrimary }]}>Attendance</Text>
              <Text style={[styles.statCaption, { color: colors.textSecondary }]}>Warnings & log</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.secondary }, Shadow.card(colors)]}
              onPress={() => router.replace('/(tabs)/grades')}
            >
              <View style={styles.statTop}>
                <View style={[styles.statIconChip, { backgroundColor: withAlpha(colors.secondary, 0.16) }]}>
                  <Ionicons name="school" size={18} color={colors.secondary} />
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </View>
              <Text style={[styles.statLabel, { color: colors.textPrimary }]}>Grades</Text>
              <Text style={[styles.statCaption, { color: colors.textSecondary }]}>Current & previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.info }, Shadow.card(colors)]}
              onPress={() => router.replace('/(tabs)/transcript')}
            >
              <View style={styles.statTop}>
                <View style={[styles.statIconChip, { backgroundColor: withAlpha(colors.info, 0.16) }]}>
                  <Ionicons name="document-text" size={18} color={colors.info} />
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </View>
              <Text style={[styles.statLabel, { color: colors.textPrimary }]}>Transcript</Text>
              <Text style={[styles.statCaption, { color: colors.textSecondary }]}>GPA & history</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.scheduleHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.mainFont, marginBottom: 0 }]}>Today&apos;s Schedule</Text>
            <View style={styles.scheduleHeaderRight}>
              {dayName ? (
                <View style={[styles.dayChip, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
                  <Text style={[styles.dayChipText, { color: colors.primary }]}>{dayName}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={[styles.refreshIconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleRefreshSchedule}
                disabled={scheduleLoading}
              >
                <Animated.View
                  style={{
                    transform: [{
                      rotate: refreshRotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      })
                    }]
                  }}
                >
                  <Ionicons
                    name="refresh"
                    size={17}
                    color={colors.primary}
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.periodsContainer}>
            {scheduleLoading ? (
              <View style={[styles.placeholderRow, {
                backgroundColor: colorScheme === 'dark' ? '#2A1F1F' : '#FFF5F5',
                borderColor: colorScheme === 'dark' ? '#3D2A2A' : '#FFE0E0',
              }]}>
                <Text style={[styles.courseName, { color: colors.secondaryFont, fontStyle: 'italic', marginBottom: 0 }]}>
                  Loading schedule...
                </Text>
              </View>
            ) : periods ? (
              ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth']
                .slice(0, Math.min(8, Math.max(5, dashboardSlots)))
                .map((periodKey, index) => {
                const classDataArray = periods[periodKey as keyof typeof periods];
                const classData = Array.isArray(classDataArray) ? classDataArray[0] : classDataArray;
                const hasMultipleLectures = Array.isArray(classDataArray) && classDataArray.length > 1;
                const periodNumber = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'][index];
                const timing = getPeriodTiming(periodKey);
                
                const PeriodRowComponent = hasMultipleLectures ? TouchableOpacity : View;
                const periodRowProps = hasMultipleLectures ? {
                  onPress: () => handleMultipleLecturesPress(classDataArray, periodNumber, dayName || 'Today'),
                  activeOpacity: 0.7,
                } : {};

                const isCurrentSlot = isCurrentTimeSlot(periodKey, isShiftedScheduleEnabled, currentTime);

                return (
                  <PeriodRowComponent
                    key={periodKey}
                    style={[styles.periodRow, {
                      backgroundColor: colorScheme === 'dark' ? '#2A1F1F' : '#FFF5F5',
                      borderColor: isCurrentSlot
                        ? colors.tint
                        : (colorScheme === 'dark' ? '#3D2A2A' : '#FFE0E0'),
                      borderWidth: isCurrentSlot ? 2 : 1,
                      borderRadius: Radius.lg,
                      shadowColor: isCurrentSlot ? colors.tint : ScheduleTypeColors.personal,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isCurrentSlot ? 0.3 : 0.1,
                      shadowRadius: isCurrentSlot ? 6 : 4,
                      elevation: isCurrentSlot ? 5 : 3,
                    }]}
                    {...periodRowProps}
                  >
                    <View style={[styles.periodLabel, {
                      backgroundColor: isCurrentSlot
                        ? colors.tint + '20'
                        : ScheduleTypeColors.personal + '15',
                      borderColor: isCurrentSlot
                        ? colors.tint + '40'
                        : ScheduleTypeColors.personal + '30',
                      borderTopLeftRadius: Radius.lg - 1,
                      borderBottomLeftRadius: Radius.lg - 1,
                    }]}>
                      {isCurrentSlot && (
                        <View style={[styles.nowDot, { backgroundColor: colors.tint }]} />
                      )}
                      <Text style={[styles.periodLabelText, {
                        color: isCurrentSlot ? colors.tint : ScheduleTypeColors.personal,
                        fontWeight: isCurrentSlot ? '800' : '700'
                      }]}>{periodNumber}</Text>
                      <Text style={[styles.periodTimingText, {
                        color: isCurrentSlot ? colors.tint : ScheduleTypeColors.personal,
                        fontSize: 10,
                        fontWeight: isCurrentSlot ? '700' : '500'
                      }]}>{timing}</Text>
                    </View>
                    <View style={[styles.periodContent, {
                      backgroundColor: colors.cardBackground,
                      borderColor: ScheduleTypeColors.personal + '40',
                      borderTopRightRadius: Radius.lg - 1,
                      borderBottomRightRadius: Radius.lg - 1,
                      borderLeftWidth: 3,
                      borderLeftColor: ScheduleTypeColors.personal,
                    }]}>
                      {classData && (Array.isArray(classDataArray) ? classDataArray.length > 0 : classData) ? (
                        <View style={styles.periodContentRow}>
                          <View style={styles.periodContentLeft}>
                            <Text style={[styles.courseName, { color: colors.mainFont }]} numberOfLines={2}>
                              {(() => {
                                // Try to get course name from mapping using matching
                                const mappedCourseName = getCourseNameByMatching(classData.courseName);
                                
                                if (mappedCourseName) {
                                  // Extract the course title from the mapped course name
                                  const extractedTitle = extractCourseTitle(mappedCourseName);
                                  // If extraction worked (title is different from full name), use it
                                  if (extractedTitle !== mappedCourseName) {
                                    return extractedTitle;
                                  }
                                  // Otherwise, use the mapped course name as is
                                  return mappedCourseName;
                                }
                                
                                // Fallback: try to extract course title from original course name
                                const originalTitle = extractCourseTitle(classData.courseName);
                                if (originalTitle !== classData.courseName) {
                                  return originalTitle;
                                }
                                
                                // Final fallback to original course name
                                return classData.courseName;
                              })()}
                            </Text>
                            
                            {/* Course Code (with group identifier) */}
                            {classData.courseCode && (
                              <Text style={[styles.finalCourseName, { color: colors.secondaryFont }]} numberOfLines={1}>
                                {classData.courseCode}
                              </Text>
                            )}
                            
                            {/* {classData.instructor && classData.instructor.trim() && (
                              <Text style={[styles.instructor, { color: colors.secondaryFont }]} numberOfLines={1}>
                                {classData.instructor}
                              </Text>
                            )} */}
                          </View>
                          <View style={styles.periodContentRight}>
                            {classData.room && (
                              <View style={styles.roomContainer}>
                                <Ionicons name="location-outline" size={14} color={colors.secondaryFont} />
                                <Text style={[styles.roomText, { color: colors.secondaryFont }]}>{classData.room}</Text>
                              </View>
                            )}
                            {classData.slotType && (
                              <View style={[styles.typePill, { backgroundColor: getSlotTypeColor(classData.slotType) }]}>
                                <Text style={[styles.typeText, { color: 'white' }]}>{classData.slotType}</Text>
                              </View>
                            )}
                            {hasMultipleLectures && (
                              <View style={[styles.multipleLecturesBadge, { backgroundColor: ScheduleTypeColors.personal }]}>
                                <Text style={[styles.multipleLecturesText, { color: 'white' }]}>{classDataArray.length}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.periodContent, { 
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderWidth: 0,
                        }]}>
                          <Text style={[styles.courseName, { color: colors.secondaryFont, fontStyle: 'italic', textAlign: 'center' }]}>
                            Free
                          </Text>
                        </View>
                      )}
                    </View>
                  </PeriodRowComponent>
                );
              })
            ) : (
              <View style={[styles.placeholderRow, {
                backgroundColor: colorScheme === 'dark' ? '#2A1F1F' : '#FFF5F5',
                borderColor: colorScheme === 'dark' ? '#3D2A2A' : '#FFE0E0',
              }]}>
                <Text style={[styles.courseName, { color: colors.secondaryFont, fontStyle: 'italic', marginBottom: 0 }]}>
                  No schedule data available
                </Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      {/* Multiple Lectures Modal */}
      <MultipleLecturesModal
        visible={modalVisible}
        onClose={handleModalClose}
        lectures={selectedLectures}
        periodName={selectedPeriodName}
        dayName={selectedDayName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 62,
    paddingBottom: 24,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 16,
  },
  hero: {
    borderRadius: Radius.xl,
    padding: 20,
    marginBottom: 28,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroCourse: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 27,
    marginBottom: 14,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroMetaText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  heroTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  heroTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroEmpty: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  heroEmptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statCard: {
    width: '48%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 16,
  },
  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconChip: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  statCaption: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    height: 118,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    justifyContent: 'flex-start',
  },
  actionIconChip: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  actionCaption: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  utilCard: {
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  utilRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  utilIconChip: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  utilLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  utilDivider: {
    height: 1,
    marginVertical: 2,
  },
  cmsText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  cmsGridItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 2,
  },
  periodsContainer: {
    gap: 12,
  },
  periodRow: {
    flexDirection: 'row',
    borderWidth: 1,
    marginBottom: 0,
  },
  periodLabel: {
    width: 58,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
  },
  nowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  periodLabelText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  periodTimingText: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  refreshIconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderRow: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 22,
  },
  periodContent: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
  },
  courseName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  finalCourseName: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 16,
  },
  courseCode: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
    opacity: 0.7,
  },
  instructor: {
    fontSize: 12,
    marginBottom: 2,
    opacity: 0.8,
  },
  room: {
    fontSize: 12,
    marginBottom: 2,
    opacity: 0.8,
  },
  time: {
    fontSize: 12,
    opacity: 0.8,
  },
  periodContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  periodContentLeft: {
    flex: 1,
    marginRight: 12,
  },
  roomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  periodContentRight: {
    alignItems: 'flex-end',
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
    marginTop: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructorCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  instructorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  instructorCourse: {
    fontSize: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  notificationText: {
    fontSize: 13,
    marginBottom: 5,
    lineHeight: 18,
    opacity: 0.8,
  },
  notificationTime: {
    fontSize: 11,
    opacity: 0.6,
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
    letterSpacing: -0.2,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  scheduleTime: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: '500',
  },
  multipleLecturesBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  multipleLecturesText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
