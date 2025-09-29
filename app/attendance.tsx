import AttendanceWarningInfoModal from '@/components/AttendanceWarningInfoModal';
import { useCustomAlert } from '@/components/CustomAlert';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AttendanceData, GradeCache } from '@/utils/gradeCache';
import { GUCAPIProxy } from '@/utils/gucApiProxy';
import { AntDesign } from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Use shared attendance types from GradeCache to avoid duplicate/conflicting types

export default function AttendanceScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();

  // State management
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [showWarningInfo, setShowWarningInfo] = useState(false);

  // Load attendance data on component mount
  useEffect(() => {
    loadAttendanceData();
  }, []);

  const loadAttendanceData = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Try to load from cache first (unless forced refresh)
      if (!forceRefresh) {
        const cachedData = await GradeCache.getCachedAttendanceData();
        if (cachedData) {
          // Check if we have cached course attendance data to populate session counts
          const updatedData = { ...cachedData };
          for (let i = 0; i < updatedData.courses.length; i++) {
            const course = updatedData.courses[i];
            if (course.attendanceRecords.length === 0) {
              // Try to load cached course attendance to get session counts
              const cachedCourseData = await GradeCache.getCachedCourseAttendance(course.courseId);
              if (cachedCourseData) {
                updatedData.courses[i] = cachedCourseData;
              }
            }
          }
          setAttendanceData(updatedData);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      const data = await GUCAPIProxy.getAttendanceData();
      
      // Load course attendance data for all courses to get session counts
      const updatedData = { ...data };
      for (let i = 0; i < updatedData.courses.length; i++) {
        const course = updatedData.courses[i];
        try {
          const courseDetails = await GUCAPIProxy.getCourseAttendance(course.courseId);
          updatedData.courses[i] = courseDetails;
          // Cache individual course data
          await GradeCache.setCachedCourseAttendance(course.courseId, courseDetails);
        } catch {
          // Keep the original course data if loading fails
        }
      }
      
      setAttendanceData(updatedData);
      
      // Cache the complete results
      await GradeCache.setCachedAttendanceData(updatedData);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      
      if (errorMessage.includes('Session expired') || errorMessage.includes('login')) {
        showAlert({
          title: 'Session Expired',
          message: 'Your session has expired. Please login again.',
          type: 'error',
          buttons: [
            { 
              text: 'OK', 
              onPress: () => {
                router.replace('/login');
              }
            }
          ]
        });
      } else {
        showAlert({
          title: 'Error',
          message: `Failed to load attendance data: ${errorMessage}`,
          type: 'error',
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    // Clear attendance cache to ensure fresh data
    await GradeCache.clearAttendanceCache();
    await loadAttendanceData(true);
  }, []);

  const toggleCourseExpansion = async (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    
    if (newExpanded.has(courseId)) {
      // Collapsing - just remove from expanded
      newExpanded.delete(courseId);
    } else {
      // Expanding - add to expanded
      newExpanded.add(courseId);
    }
    
    setExpandedCourses(newExpanded);
  };

  const getAbsenceLevelColor = (level: string) => {
    switch (level) {
      case '1':
        return colors.gradeGood; // Green for first warning
      case '2':
        return colors.gradeAverage; // Yellow for second warning
      case '3':
        return colors.gradeFailing; // Red for course drop
      default:
        return colors.text;
    }
  };


  const getCourseWarningLevel = (courseName: string) => {
    if (!attendanceData?.summary?.absenceReport) return null;
    
    // Find matching course in absence report
    const matchingReport = attendanceData.summary.absenceReport.find(report => 
      courseName.toLowerCase().includes(report.name.toLowerCase()) ||
      report.name.toLowerCase().includes(courseName.toLowerCase())
    );
    
    return matchingReport ? matchingReport.absenceLevel : null;
  };


  const formatSessionDescription = (description: string) => {
    // Extract useful information from the session description
    // Example: "W25 - CSEN 704 - Advanced Computer lab - 7MET P014 Practical @2025.09.20 - Regular - Slot1 - 2h"
    const parts = description.split(' - ');
    if (parts.length >= 4) {
      const course = parts[1]; // CSEN 704
      const courseName = parts[2]; // Advanced Computer lab
      const locationWithDate = parts[3]; // 7MET P014 Practical @2025.09.20
      const timeSlot = parts[parts.length - 1]; // Slot1 - 2h
      
      // Extract date from location string
      const dateMatch = locationWithDate.match(/@(\d{4}\.\d{2}\.\d{2})/);
      const date = dateMatch ? dateMatch[1] : '';
      const location = locationWithDate.split(' @')[0]; // Remove date part
      
      // Format date for display
      const formattedDate = date ? new Date(date.replace(/\./g, '-')).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) : '';
      
      // Remove timing (2h) from timeSlot
      const cleanTimeSlot = timeSlot.replace(/\s*-\s*\d+h$/, '');
      
      return {
        course,
        courseName,
        location,
        timeSlot: cleanTimeSlot,
        date: formattedDate
      };
    }
    return {
      course: '',
      courseName: description,
      location: '',
      timeSlot: '',
      date: ''
    };
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.tabIconDefault }]}>Loading attendance data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Attendance</Text>
          <TouchableOpacity 
            onPress={() => setShowWarningInfo(true)}
            style={styles.infoButton}
          >
            <Ionicons name="information-circle-outline" size={27} color={colors.tint} />
          </TouchableOpacity>
        </View>

        {refreshing && (
          <View style={[styles.updateNote, { 
            backgroundColor: colors.tint + '10', 
            borderColor: colors.tint + '20',
            marginHorizontal: 20,
            marginBottom: 10  
          }]}> 
            <AntDesign name="hourglass" size={14} color={colors.tint} />
            <Text style={[styles.updateNoteText, { color: colors.tint }]}>This might take a minute</Text>
          </View>
        )}

        {attendanceData && (
          <>
            {/* Attendance Overview Card */}
            {/* <View style={[styles.overviewCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.overviewHeader}>
                <View style={[styles.overviewIcon, { backgroundColor: colors.tint + '20' }]}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
                </View>
                <View style={styles.overviewContent}>
                  <Text style={[styles.overviewTitle, { color: colors.text }]}>Attendance Overview</Text>
                  <Text style={[styles.overviewSubtitle, { color: colors.tabIconDefault }]}>
                    {attendanceData.courses.length} course{attendanceData.courses.length !== 1 ? 's' : ''} available
                  </Text>
                </View>
              </View>
              
              {attendanceData.summary.absenceReport.length > 0 && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning" size={16} color={colors.gradeAverage} />
                  <Text style={[styles.warningText, { color: colors.gradeAverage }]}>
                    {attendanceData.summary.absenceReport.length} absence warning{attendanceData.summary.absenceReport.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View> */}

            {/* Absence Warnings Section */}
            {/* {attendanceData.summary.absenceReport.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="alert-circle" size={20} color={colors.gradeAverage} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Absence Warnings</Text>
                </View>
                
                <View style={styles.warningsContainer}>
                  {attendanceData.summary.absenceReport.map((report, index) => (
                    <View key={index} style={[styles.warningCard, { 
                      borderColor: getAbsenceLevelColor(report.absenceLevel) + '40',
                      backgroundColor: colors.cardBackground
                    }]}>
                      <View style={styles.warningHeader}>
                        <View style={[styles.courseCodeBadge, { backgroundColor: colors.tint + '20' }]}>
                          <Text style={[styles.courseCodeText, { color: colors.tint }]}>{report.code}</Text>
                        </View>
                        <View style={[styles.levelBadge, { backgroundColor: getAbsenceLevelColor(report.absenceLevel) }]}>
                          <Text style={styles.levelBadgeText}>
                            Level {report.absenceLevel}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.courseName, { color: colors.text }]}>{report.name}</Text>
                      <Text style={[styles.levelDescription, { color: colors.tabIconDefault }]}>
                        {getAbsenceLevelText(report.absenceLevel)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )} */}

            {/* Course Attendance Section */}
            {attendanceData.courses.length > 0 ? (
              <>
                {attendanceData.courses.map((course) => {
                const isExpanded = expandedCourses.has(course.courseId);
                const presentCount = course.attendanceRecords.filter(r => r.attendance === 'Attended').length;
                const totalCount = course.attendanceRecords.length;
                const warningLevel = getCourseWarningLevel(course.courseName);

                return (
                  <View key={course.courseId} style={[styles.courseCard, { 
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    borderBottomLeftRadius: isExpanded ? 0 : 16,
                    borderBottomRightRadius: isExpanded ? 0 : 16,
                  }]}>
                        <TouchableOpacity
                          style={styles.courseHeader}
                          onPress={() => toggleCourseExpansion(course.courseId)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.courseHeaderContent}>
                            {/* Left Section - Course Info */}
                            <View style={styles.leftSection}>
                              <Text style={[styles.courseTitle, { color: colors.text }]} numberOfLines={2}>
                                {course.courseName.split(' - ').pop() || course.courseName}
                              </Text>
                              <Text style={[styles.attendanceStats, { color: colors.tabIconDefault }]}>
                                {presentCount}/{totalCount} sessions
                              </Text>
                            </View>
                            
                            {/* Right Section - Badge and Arrow */}
                            <View style={styles.rightSection}>
                              {warningLevel && (
                                <View style={[styles.dynamicLevelBadge, { backgroundColor: getAbsenceLevelColor(warningLevel) }]}>
                                  <Text style={styles.dynamicLevelBadgeText}>
                                    Level {warningLevel}
                                  </Text>
                                </View>
                              )}
                              <View style={[styles.arrowContainer, { 
                                backgroundColor: colors.border + '60',
                                borderColor: colors.border + '70'
                              }]}>
                                <Ionicons 
                                  name={isExpanded ? "caret-up" : "caret-down"} 
                                  size={14} 
                                  color={colors.secondaryFont} 
                                />
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={[styles.courseDetails, { 
                            backgroundColor: colors.background,
                            borderTopColor: colors.border
                          }]}>
                            {course.attendanceRecords.length > 0 ? (
                              course.attendanceRecords.map((record, index) => {
                                const sessionInfo = formatSessionDescription(record.sessionDescription);
                                return (
                                  <View key={index} style={[styles.attendanceRecord, { 
                                    borderColor: colors.border,
                                    backgroundColor: colors.cardBackground
                                  }]}>
                                    <View style={styles.recordHeader}>
                                      <View style={styles.sessionInfo}>
                                        <Text style={[styles.sessionNumber, { color: colors.mainFont }]}>
                                          Session {record.rowNumber}
                                        </Text>
                                        {sessionInfo.date && (
                                          <Text style={[styles.sessionDate, { color: colors.secondaryFont }]}>
                                            {sessionInfo.date}
                                          </Text>
                                        )}
                                      </View>
                                      <View style={[styles.attendanceStatus, { 
                                        backgroundColor: record.attendance === 'Attended' ? colors.gradeGood + '20' : colors.gradeFailing + '20',
                                        borderColor: record.attendance === 'Attended' ? colors.gradeGood + '40' : colors.gradeFailing + '40'
                                      }]}>
                                        <Ionicons 
                                          name={record.attendance === 'Attended' ? "checkmark-circle" : "close-circle"} 
                                          size={16} 
                                          color={record.attendance === 'Attended' ? colors.gradeGood : colors.gradeFailing} 
                                        />
                                        <Text style={[styles.attendanceStatusText, { 
                                          color: record.attendance === 'Attended' ? colors.gradeGood : colors.gradeFailing 
                                        }]}>
                                          {record.attendance}
                                        </Text>
                                      </View>
                                    </View>
                                    
                                    <View style={styles.sessionDetails}>
                                      {sessionInfo.course && (
                                        <View style={styles.detailRow}>
                                          <Ionicons name="book" size={14} color={colors.secondaryFont} />
                                          <Text style={[styles.detailText, { color: colors.secondaryFont }]}>
                                            {sessionInfo.course}
                                          </Text>
                                        </View>
                                      )}
                                      {sessionInfo.location && (
                                        <View style={styles.detailRow}>
                                          <Ionicons name="location" size={14} color={colors.secondaryFont} />
                                          <Text style={[styles.detailText, { color: colors.secondaryFont }]}>
                                            {sessionInfo.location}
                                          </Text>
                                        </View>
                                      )}
                                      {/* {sessionInfo.timeSlot && (
                                        <View style={styles.detailRow}>
                                          <Ionicons name="time" size={14} color={colors.secondaryFont} />
                                          <Text style={[styles.detailText, { color: colors.secondaryFont }]}>
                                            {sessionInfo.timeSlot}
                                          </Text>
                                        </View>
                                      )} */}
                                    </View>
                                  </View>
                                );
                              })
                            ) : (
                              <View style={styles.noRecordsContainer}>
                                <Ionicons name="document-outline" size={24} color={colors.secondaryFont} />
                                <Text style={[styles.noRecordsText, { color: colors.secondaryFont }]}>
                                  No attendance records available
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                  );
                })}
              </>
            ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="book-outline" size={48} color={colors.tabIconDefault} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Courses Available</Text>
                  <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                    No course attendance data found for the current semester.
                  </Text>
                </View>
              )}

                <View style={[styles.updateNote2, { 
                  // backgroundColor: colors.tint + '10', 
                  // borderColor: colors.tint + '20',
                  marginHorizontal: 20
                }]}>
                  <Ionicons name="time" size={14} color={colors.tint} />
                  <Text style={[styles.updateNoteText, { color: colors.tint }]}>
                    Attendance updates may take up to 1 hour to reflect in the system
                  </Text>
                </View>
          </>
        )}
      </ScrollView>
      
      <AttendanceWarningInfoModal 
        visible={showWarningInfo} 
        onClose={() => setShowWarningInfo(false)} 
      />
      
      {/* Custom Alert Component */}
      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 40,
  },
  infoButton: {
    padding: 8,
    marginRight: -8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  
  // Overview Card
  overviewCard: {
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  overviewContent: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 14,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },

  // Section Styles
  section: {
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Warning Cards
  warningsContainer: {
    gap: 12,
  },
  warningCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseCodeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  courseCodeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  levelBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  levelDescription: {
    fontSize: 14,
  },

  // Course Cards
  courseCard: {
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  courseHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSection: {
    flex: 2,
    marginRight: 16,
  },
  rightSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  attendanceStats: {
    fontSize: 14,
  },
  staticLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  staticLevelBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dynamicLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  dynamicLevelBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    // marginTop: 0,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginLeft: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  courseDetails: {
    borderTopWidth: 1,
    padding: 16,
  },
  attendanceRecord: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  sessionDate: {
    fontSize: 12,
    marginTop: 2,
  },
  attendanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  attendanceStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sessionDetails: {
    marginTop: 8,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    flex: 1,
  },
  noRecordsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noRecordsText: {
    marginTop: 8,
    fontSize: 14,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Help Section
  helpSection: {
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  boldText: {
    fontWeight: 'bold',
  },
  updateNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  updateNote2: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  updateNoteText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
