import { Colors, ScheduleTypeColors } from '@/constants/Colors';
import { useNotifications } from '@/contexts/NotificationContext';
import { useShiftedSchedule } from '@/contexts/ShiftedScheduleContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSchedule } from '@/hooks/useSchedule';
import { AuthManager } from '@/utils/auth';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const { scheduleData, loading: scheduleLoading, refetch: refetchSchedule } = useSchedule();
  const { isShiftedScheduleEnabled } = useShiftedSchedule();
  const { unreadCount, fetchNotifications } = useNotifications();
  const refreshRotation = useRef(new Animated.Value(0)).current;

  const loadNickname = useCallback(async () => {
    // First try to get stored nickname
    const storedNickname = await AuthManager.getNickname();
    if (storedNickname) {
      setNickname(storedNickname);
      return;
    }
    
    // If no stored nickname, extract first name from username
    const { username } = await AuthManager.getCredentials();
    if (username) {
      // Extract first name from username (assuming format: user.name or user_name)
      const firstName = username.split(/[._]/)[0];
      if (firstName) {
        // Capitalize first letter
        const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        setNickname(capitalizedFirstName);
      }
    }
  }, []);

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
    };
    return timings[periodKey as keyof typeof timings] || '';
  };

  // Function to extract course code from course name
  const getCourseCode = (classData: any): string => {
    if (!classData?.courseName) return '';
    
    const courseName = classData.courseName;
    
    // Look for course code patterns like "7MET L001", "CSEN601", etc.
    const courseCodePatterns = [
      /(\d+[A-Z]+\s+[A-Z]\d+)/,  // Pattern like "7MET L001"
      /([A-Z]{2,}\d{3,})/,        // Pattern like "CSEN601"
      /([A-Z]{3,}\d{2,})/,        // Pattern like "MATH101"
    ];
    
    for (const pattern of courseCodePatterns) {
      const match = courseName.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return '';
  };

  // Function to clean course name by removing type information
  const cleanCourseName = (classData: any): string => {
    if (!classData?.courseName) return '';
    
    let courseName = classData.courseName;
    
    // Remove common type patterns from course name
    const typePatterns = [
      /\s*\(lab\)/gi,
      /\s*\(laboratory\)/gi,
      /\s*\(tutorial\)/gi,
      /\s*\(tut\)/gi,
      /\s*\(seminar\)/gi,
      /\s*\(workshop\)/gi,
      /\s*\(project\)/gi,
      /\s*\(thesis\)/gi,
      /\s*\(dissertation\)/gi,
      /\s*\[lab\]/gi,
      /\s*\[laboratory\]/gi,
      /\s*\[tutorial\]/gi,
      /\s*\[tut\]/gi,
      /\s*\[seminar\]/gi,
      /\s*\[workshop\]/gi,
      /\s*\[project\]/gi,
      /\s*\[thesis\]/gi,
      /\s*\[dissertation\]/gi,
      /\s*-\s*lab/gi,
      /\s*-\s*laboratory/gi,
      /\s*-\s*tutorial/gi,
      /\s*-\s*tut/gi,
      /\s*-\s*seminar/gi,
      /\s*-\s*workshop/gi,
      /\s*-\s*project/gi,
      /\s*-\s*thesis/gi,
      /\s*-\s*dissertation/gi,
      // Additional patterns for common formats
      /\s+lab\s*$/gi,
      /\s+laboratory\s*$/gi,
      /\s+tutorial\s*$/gi,
      /\s+tut\s*$/gi,
      /\s+seminar\s*$/gi,
      /\s+workshop\s*$/gi,
      /\s+project\s*$/gi,
      /\s+thesis\s*$/gi,
      /\s+dissertation\s*$/gi,
      // Patterns with numbers (e.g., "Lab 1", "Tutorial 2")
      /\s+lab\s+\d+\s*$/gi,
      /\s+laboratory\s+\d+\s*$/gi,
      /\s+tutorial\s+\d+\s*$/gi,
      /\s+tut\s+\d+\s*$/gi,
      /\s+seminar\s+\d+\s*$/gi,
      /\s+workshop\s+\d+\s*$/gi,
      /\s+project\s+\d+\s*$/gi,
      // Lecture patterns
      /\s+lecture\s*$/gi,
      /\s*\(lecture\)/gi,
      /\s*\[lecture\]/gi,
      /\s*-\s*lecture/gi,
      /\s+lecture\s+/gi,
      // Test pattern for "Lecture" at the end
      / lecture$/gi,
      // Course code patterns (e.g., "7MET L001", "CSEN601", etc.)
      /\s*\(\d+[A-Z]+\s+[A-Z]\d+\)/gi,
      /\s*\[\d+[A-Z]+\s+[A-Z]\d+\]/gi,
      /\s*-\s*\d+[A-Z]+\s+[A-Z]\d+/gi,
    ];
    
    // Apply all patterns to clean the course name
    for (const pattern of typePatterns) {
      courseName = courseName.replace(pattern, '');
    }
    
    // Clean up extra spaces
    courseName = courseName.replace(/\s+/g, ' ').trim();
    
    return courseName;
  };

  // Get slot type color
  const getSlotTypeColor = (slotType: string) => {
    const colors = {
      'Lecture': '#3B82F6',
      'Tutorial': '#10B981',
      'Lab': '#F59E0B',
      'Seminar': '#8B5CF6',
      'Workshop': '#EF4444',
      'Project': '#06B6D4',
      'Thesis': '#84CC16',
      'Free': '#6B7280',
    };
    return colors[slotType as keyof typeof colors] || '#6B7280';
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
    } catch (error) {
      console.log('Failed to refresh schedule:', error);
      // Stop animation on error
      refreshRotation.stopAnimation();
      refreshRotation.setValue(0);
    }
  };

  useEffect(() => {
    loadNickname();
    // Fetch notifications when dashboard loads
    fetchNotifications();
  }, [loadNickname, fetchNotifications]);

  // Reload nickname when screen comes into focus (e.g., returning from settings)
  useFocusEffect(
    useCallback(() => {
      loadNickname();
    }, [loadNickname])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.mainFont }]}>Dashboard</Text>
          <TouchableOpacity 
            style={[styles.notificationButton, { backgroundColor: `${colors.tint}15` }]}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.tint} />
            {unreadCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: colors.gradeFailing }]}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount.toString()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Welcome Message */}
        <View style={styles.welcomeContainer}>
          <Text style={[styles.welcomeText, { color: colors.secondaryFont }]}>
            Welcome Back, {nickname}
          </Text>
        </View>
        {/* Quick Actions Grid */}
        <View style={styles.section}>
          <View style={styles.gridContainer}>
            <TouchableOpacity style={[styles.gridItem, { backgroundColor: ScheduleTypeColors.staff, borderColor: ScheduleTypeColors.staff }]}>
              <Ionicons name="people" size={20} color="white" />
              <Text style={[styles.gridText, { color: 'white' }]}>Instructors</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.gridItem, { backgroundColor: colors.tint, borderColor: colors.tint }]}
              onPress={() => router.push('/exam-seats')}
            >
              <Ionicons name="document-text" size={20} color="white" />
              <Text style={[styles.gridText, { color: 'white' }]}>Exam Seats</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.gridItem, { backgroundColor: colors.gradeGood, borderColor: colors.gradeGood, justifyContent: 'center', alignItems: 'center' }]}>
              <Feather name="check-circle" size={20} color="white" />
              <Text style={[styles.gridText, { color: 'white' }]}>Attendance</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.gridItem, { backgroundColor: '#4A90E2', borderColor: '#4A90E2' }]}>
              <Text style={[styles.cmsText, { color: 'white' }]}>CMS</Text>
              <Text style={[styles.comingSoonText, { color: 'white' }]}>Coming Soon</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>Today&apos;s Schedule</Text>
          {dayName && (
            <View style={styles.dayNameRow}>
              <Text style={[styles.dayName, { color: colors.secondaryFont }]}>{dayName}</Text>
              <TouchableOpacity 
                style={styles.refreshIconButton}
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
                    size={20} 
                    color={colors.tint} 
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.periodsContainer}>
            {scheduleLoading ? (
              <View style={[styles.periodRow, { 
                backgroundColor: colorScheme === 'dark' ? '#2A1F1F' : '#FFF5F5',
                borderColor: colorScheme === 'dark' ? '#3D2A2A' : '#FFE0E0',
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                paddingVertical: 20,
              }]}>
                <Text style={[styles.courseName, { color: colors.secondaryFont, fontStyle: 'italic' }]}>
                  Loading schedule...
                </Text>
              </View>
            ) : periods ? (
              ['first', 'second', 'third', 'fourth', 'fifth'].map((periodKey, index) => {
                const classData = periods[periodKey as keyof typeof periods];
                const periodNumber = ['1st', '2nd', '3rd', '4th', '5th'][index];
                const timing = getPeriodTiming(periodKey);
                
                return (
                  <View key={periodKey} style={[styles.periodRow, { 
                    backgroundColor: colorScheme === 'dark' ? '#2A1F1F' : '#FFF5F5',
                    borderColor: colorScheme === 'dark' ? '#3D2A2A' : '#FFE0E0',
                    borderRadius: 16,
                    shadowColor: ScheduleTypeColors.personal,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }]}>
                    <View style={[styles.periodLabel, { 
                      backgroundColor: ScheduleTypeColors.personal + '15', 
                      borderColor: ScheduleTypeColors.personal + '30',
                      borderTopLeftRadius: 16,
                      borderBottomLeftRadius: 16,
                    }]}>
                      <Text style={[styles.periodLabelText, { color: ScheduleTypeColors.personal }]}>{periodNumber}</Text>
                      <Text style={[styles.periodTimingText, { color: ScheduleTypeColors.personal, fontSize: 10 }]}>{timing}</Text>
                    </View>
                    <View style={[styles.periodContent, { 
                      backgroundColor: colors.cardBackground,
                      borderColor: ScheduleTypeColors.personal + '40',
                      borderTopRightRadius: 16,
                      borderBottomRightRadius: 16,
                      borderLeftWidth: 3,
                      borderLeftColor: ScheduleTypeColors.personal,
                    }]}>
                      {classData ? (
                        <View style={styles.periodContentRow}>
                          <View style={styles.periodContentLeft}>
                            <Text style={[styles.courseName, { color: colors.mainFont }]} numberOfLines={2}>
                              {cleanCourseName(classData)}
                            </Text>
                            {getCourseCode(classData) && (
                              <Text style={[styles.courseCode, { color: colors.secondaryFont }]} numberOfLines={1}>
                                {getCourseCode(classData)}
                              </Text>
                            )}
                            {classData.instructor && (
                              <Text style={[styles.instructor, { color: colors.secondaryFont }]} numberOfLines={1}>
                                {classData.instructor}
                              </Text>
                            )}
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
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.periodContent, { 
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderWidth: 0,
                        }]}>
                          <Text style={[styles.courseName, { color: colors.secondaryFont, fontStyle: 'italic', textAlign: 'center' }]}>
                            Free Slot
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.periodRow, { 
                backgroundColor: colorScheme === 'dark' ? '#2A1F1F' : '#FFF5F5',
                borderColor: colorScheme === 'dark' ? '#3D2A2A' : '#FFE0E0',
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                paddingVertical: 20,
              }]}>
                <Text style={[styles.courseName, { color: colors.secondaryFont, fontStyle: 'italic' }]}>
                  No schedule data available
                </Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingTop: 60,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  welcomeContainer: {
    paddingHorizontal: 0,
    paddingBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  notificationButton: {
    position: 'relative',
    right: 3,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
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
  gridItem: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 0,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gridIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  gridText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.1,
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
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
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
  dayNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    left: 10,
    textAlign: 'left',
  },
  refreshIconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshingIcon: {
    opacity: 0.6,
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
});
