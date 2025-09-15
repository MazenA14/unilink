import { Colors, ScheduleTypeColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthManager } from '@/utils/auth';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
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

  useEffect(() => {
    loadNickname();
  }, [loadNickname]);

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
          <TouchableOpacity style={[styles.notificationButton, { backgroundColor: `${colors.tint}15` }]}>
            <Ionicons name="notifications-outline" size={24} color={colors.tint} />
            <View style={[styles.notificationBadge, { backgroundColor: colors.gradeFailing }]}>
              <Text style={styles.badgeText}>3</Text>
            </View>
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
          <View style={styles.periodsContainer}>
            {/* First Period */}
            <View style={[styles.periodRow, { 
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
                <Text style={[styles.periodLabelText, { color: ScheduleTypeColors.personal }]}>1st</Text>
              </View>
              <View style={[styles.periodContent, { 
                backgroundColor: colors.cardBackground,
                borderColor: ScheduleTypeColors.personal + '40',
                borderTopRightRadius: 16,
                borderBottomRightRadius: 16,
                borderLeftWidth: 3,
                borderLeftColor: ScheduleTypeColors.personal,
              }]}>
                <View style={styles.periodContentRow}>
                  <View style={styles.periodContentLeft}>
                    <Text style={[styles.courseName, { color: colors.mainFont }]} numberOfLines={2}>
                      Data Structures
                    </Text>
                    <Text style={[styles.time, { color: colors.secondaryFont }]} numberOfLines={1}>
                      10:00 AM - 11:30 AM
                    </Text>
                  </View>
                  <View style={styles.periodContentRight}>
                    <View style={styles.roomContainer}>
                      <Ionicons name="location-outline" size={14} color={colors.secondaryFont} />
                      <Text style={[styles.roomText, { color: colors.secondaryFont }]}>C3.201</Text>
                    </View>
                    <View style={[styles.typePill, { backgroundColor: '#3B82F6' }]}>
                      <Text style={[styles.typeText, { color: 'white' }]}>Lecture</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Second Period */}
            <View style={[styles.periodRow, { 
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
                <Text style={[styles.periodLabelText, { color: ScheduleTypeColors.personal }]}>2nd</Text>
              </View>
              <View style={[styles.periodContent, { 
                backgroundColor: colors.cardBackground,
                borderColor: ScheduleTypeColors.personal + '40',
                borderTopRightRadius: 16,
                borderBottomRightRadius: 16,
                borderLeftWidth: 3,
                borderLeftColor: ScheduleTypeColors.personal,
              }]}>
                <View style={styles.periodContentRow}>
                  <View style={styles.periodContentLeft}>
                    <Text style={[styles.courseName, { color: colors.mainFont }]} numberOfLines={2}>
                      Algorithms
                    </Text>
                    <Text style={[styles.time, { color: colors.secondaryFont }]} numberOfLines={1}>
                      2:00 PM - 3:30 PM
                    </Text>
                  </View>
                  <View style={styles.periodContentRight}>
                    <View style={styles.roomContainer}>
                      <Ionicons name="location-outline" size={14} color={colors.secondaryFont} />
                      <Text style={[styles.roomText, { color: colors.secondaryFont }]}>C3.105</Text>
                    </View>
                    <View style={[styles.typePill, { backgroundColor: '#10B981' }]}>
                      <Text style={[styles.typeText, { color: 'white' }]}>Tutorial</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Third Period */}
            <View style={[styles.periodRow, { 
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
                <Text style={[styles.periodLabelText, { color: ScheduleTypeColors.personal }]}>3rd</Text>
              </View>
              <View style={[styles.periodContent, { 
                backgroundColor: colors.cardBackground,
                borderColor: ScheduleTypeColors.personal + '40',
                borderTopRightRadius: 16,
                borderBottomRightRadius: 16,
                borderLeftWidth: 3,
                borderLeftColor: ScheduleTypeColors.personal,
                justifyContent: 'center',
                alignItems: 'center',
              }]}>
                <Text style={[styles.courseName, { color: colors.secondaryFont, fontStyle: 'italic', textAlign: 'center' }]}>
                  Free Slot
                </Text>
              </View>
            </View>

            {/* Fourth Period */}
            <View style={[styles.periodRow, { 
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
                <Text style={[styles.periodLabelText, { color: ScheduleTypeColors.personal }]}>4th</Text>
              </View>
              <View style={[styles.periodContent, { 
                backgroundColor: colors.cardBackground,
                borderColor: ScheduleTypeColors.personal + '40',
                borderTopRightRadius: 16,
                borderBottomRightRadius: 16,
                borderLeftWidth: 3,
                borderLeftColor: ScheduleTypeColors.personal,
              }]}>
                <View style={styles.periodContentRow}>
                  <View style={styles.periodContentLeft}>
                    <Text style={[styles.courseName, { color: colors.mainFont }]} numberOfLines={2}>
                      Computer Networks
                    </Text>
                    <Text style={[styles.time, { color: colors.secondaryFont }]} numberOfLines={1}>
                      6:00 PM - 7:30 PM
                    </Text>
                  </View>
                  <View style={styles.periodContentRight}>
                    <View style={styles.roomContainer}>
                      <Ionicons name="location-outline" size={14} color={colors.secondaryFont} />
                      <Text style={[styles.roomText, { color: colors.secondaryFont }]}>C3.205</Text>
                    </View>
                    <View style={[styles.typePill, { backgroundColor: '#F59E0B' }]}>
                      <Text style={[styles.typeText, { color: 'white' }]}>Lab</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Fifth Period */}
            <View style={[styles.periodRow, { 
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
                <Text style={[styles.periodLabelText, { color: ScheduleTypeColors.personal }]}>5th</Text>
              </View>
              <View style={[styles.periodContent, { 
                backgroundColor: colors.cardBackground,
                borderColor: ScheduleTypeColors.personal + '40',
                borderTopRightRadius: 16,
                borderBottomRightRadius: 16,
                borderLeftWidth: 3,
                borderLeftColor: ScheduleTypeColors.personal,
              }]}>
                <View style={styles.periodContentRow}>
                  <View style={styles.periodContentLeft}>
                    <Text style={[styles.courseName, { color: colors.mainFont }]} numberOfLines={2}>
                      Software Engineering
                    </Text>
                    <Text style={[styles.time, { color: colors.secondaryFont }]} numberOfLines={1}>
                      8:00 PM - 9:30 PM
                    </Text>
                  </View>
                  <View style={styles.periodContentRight}>
                    <View style={styles.roomContainer}>
                      <Ionicons name="location-outline" size={14} color={colors.secondaryFont} />
                      <Text style={[styles.roomText, { color: colors.secondaryFont }]}>C3.401</Text>
                    </View>
                    <View style={[styles.typePill, { backgroundColor: '#3B82F6' }]}>
                      <Text style={[styles.typeText, { color: 'white' }]}>Lecture</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
