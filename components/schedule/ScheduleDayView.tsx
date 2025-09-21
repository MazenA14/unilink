import { Colors, ScheduleColors, ScheduleTypeColors, SlotTypeColors } from '@/constants/Colors';
import { useShiftedSchedule } from '@/contexts/ShiftedScheduleContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GradeCache } from '@/utils/gradeCache';
import { GUCAPIProxy } from '@/utils/gucApiProxy';
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { MultipleLecturesModal } from './MultipleLecturesModal';
import { ScheduleCard } from './ScheduleCard';
import { ScheduleClass, ScheduleDay, ScheduleType } from './types';

interface ScheduleDayViewProps {
  day: ScheduleDay;
  scheduleType?: ScheduleType;
}

export function ScheduleDayView({ day, scheduleType = 'personal' }: ScheduleDayViewProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scheduleColors = ScheduleColors[colorScheme ?? 'light'];
  const screenWidth = Dimensions.get('window').width;
  const typeColor = ScheduleTypeColors[scheduleType];
  const { isShiftedScheduleEnabled } = useShiftedSchedule();
  
  // State for course name mapping
  const [courseNameMapping, setCourseNameMapping] = useState<{ [courseId: string]: string }>({});
  
  // State for multiple lectures modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLectures, setSelectedLectures] = useState<ScheduleClass[]>([]);
  const [selectedPeriodName, setSelectedPeriodName] = useState('');
  const [selectedDayName, setSelectedDayName] = useState('');
  
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
          } catch (error) {
          }
        }
        
        if (mapping) {
          setCourseNameMapping(mapping);
        }
      } catch (error) {
      }
    };
    
    loadCourseNameMapping();
  }, []);
  
  // Utility function to get course name by matching course names
  const getCourseNameByMatching = (scheduleCourseName: string): string | null => {
    if (!scheduleCourseName || Object.keys(courseNameMapping).length === 0) {
      return null;
    }
    
    // Try to find a match in the course mapping
    // First, try exact match
    for (const [courseId, courseName] of Object.entries(courseNameMapping)) {
      if (courseName === scheduleCourseName) {
        return courseName;
      }
    }
    
    // Try partial matching - look for course names that contain the schedule course name
    for (const [courseId, courseName] of Object.entries(courseNameMapping)) {
      if (courseName.toLowerCase().includes(scheduleCourseName.toLowerCase()) ||
          scheduleCourseName.toLowerCase().includes(courseName.toLowerCase())) {
        return courseName;
      }
    }
    
    // Try to match by extracting course code from both
    const scheduleCourseCode = extractCourseCode(scheduleCourseName);
    if (scheduleCourseCode) {
      for (const [courseId, courseName] of Object.entries(courseNameMapping)) {
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
  
  // Calculate dynamic padding based on screen width
  const basePadding = Math.max(12, screenWidth * 0.04);
  const dayPadding = basePadding;

  // Function to extract slot type from class data and clean course name
  const getSlotType = (classData: any): string => {
    if (!classData) return 'Free';
    
    // Handle array of lectures
    if (Array.isArray(classData)) {
      return classData[0]?.slotType || 'Lecture';
    }
    
    // If slotType is explicitly provided, use it
    if (classData.slotType) {
      return classData.slotType;
    }
    
    // Try to extract from course name
    const courseName = classData.courseName?.toLowerCase() || '';
    
    // Common patterns for different class types
    if (courseName.includes('lab') || courseName.includes('laboratory')) {
      return 'Lab';
    }
    if (courseName.includes('tutorial') || courseName.includes('tut')) {
      return 'Tutorial';
    }
    if (courseName.includes('seminar')) {
      return 'Seminar';
    }
    if (courseName.includes('workshop')) {
      return 'Workshop';
    }
    if (courseName.includes('project')) {
      return 'Project';
    }
    if (courseName.includes('thesis') || courseName.includes('dissertation')) {
      return 'Thesis';
    }
    
    // Default to Lecture for regular courses
    return 'Lecture';
  };
  
  // Function to handle multiple lectures press
  const handleMultipleLecturesPress = (lectures: ScheduleClass[], periodName: string, dayName: string) => {
    setSelectedLectures(lectures);
    setSelectedPeriodName(periodName);
    setSelectedDayName(dayName);
    setModalVisible(true);
  };
  
  // Function to close modal
  const closeModal = () => {
    setModalVisible(false);
    setSelectedLectures([]);
    setSelectedPeriodName('');
    setSelectedDayName('');
  };

  // Function to extract course code from course name
  const getCourseCode = (classData: any): string => {
    if (!classData?.courseName) return '';
    
    const courseName = classData.courseName;
    
    // Try to extract course code patterns like "7MET L001", "CSEN601", etc.
    const courseCodePatterns = [
      /\((\d+[A-Z]+\s+[A-Z]\d+)\)/gi,
      /\[(\d+[A-Z]+\s+[A-Z]\d+)\]/gi,
      /-(\d+[A-Z]+\s+[A-Z]\d+)/gi,
      /(\d+[A-Z]+\s+[A-Z]\d+)$/gi,
      /\(([A-Z]+\d+[A-Z]*\s*[A-Z]\d+)\)/gi,
      /\[([A-Z]+\d+[A-Z]*\s*[A-Z]\d+)\]/gi,
      /-([A-Z]+\d+[A-Z]*\s*[A-Z]\d+)/gi,
      /([A-Z]+\d+[A-Z]*\s*[A-Z]\d+)$/gi,
    ];
    
    for (const pattern of courseCodePatterns) {
      const match = courseName.match(pattern);
      if (match) {
        let result = match[1] || match[0];
        result = result.slice(1, -1);
        // Return the captured group (without brackets) or the full match if no group
        return result;
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
      /\s+\d+[A-Z]+\s+[A-Z]\d+\s*$/gi,
      // More general course code patterns
      /\s*\([A-Z]+\d+[A-Z]*\s*[A-Z]\d+\)/gi,
      /\s*\[[A-Z]+\d+[A-Z]*\s*[A-Z]\d+\]/gi,
      /\s*-\s*[A-Z]+\d+[A-Z]*\s*[A-Z]\d+/gi,
      /\s+[A-Z]+\d+[A-Z]*\s*[A-Z]\d+\s*$/gi,
    ];
    
    // Apply all patterns to clean the course name
    typePatterns.forEach((pattern, index) => {
      courseName = courseName.replace(pattern, '');
    });
    
    // Clean up any extra spaces
    courseName = courseName.trim();
    
    return courseName;
  };

  const periods = [
    { key: 'first', name: '1st', timing: '8:15 - 9:45' },
    { key: 'second', name: '2nd', timing: '10:00 - 11:30' },
    { key: 'third', name: '3rd', timing: isShiftedScheduleEnabled ? '12:00 - 1:30' : '11:45 - 1:15' },
    { key: 'fourth', name: '4th', timing: '1:45 - 3:15' },
    { key: 'fifth', name: '5th', timing: '3:45 - 5:15' },
  ] as const;

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.background,
        paddingHorizontal: dayPadding,
      }
    ]}>
      {/* Day Header */}
      <View style={styles.dayHeader}>
        <View style={[styles.dayTitlePill, { 
          backgroundColor: colors.tint,
          shadowColor: colors.tint,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }]}>
          <Text style={[styles.dayTitle, { color: colors.background }]}>{day.dayName}</Text>
        </View>
      </View>
      
      {/* Periods List */}
      <View style={styles.periodsContainer}>
        {periods.map((period) => {
          const classData = day.periods[period.key];
          return (
            <View key={period.key} style={[styles.periodRow, { 
              backgroundColor: scheduleColors.periodRowBg,
              borderColor: scheduleColors.periodRowBorder,
              borderRadius: 16,
            }]}>
              <View style={[styles.periodLabel, { 
                backgroundColor: typeColor + '15', 
                borderColor: typeColor + '30',
                borderTopLeftRadius: 16,
                borderBottomLeftRadius: 16,
              }]}>
                <Text style={[styles.periodLabelText, { color: typeColor }]}>{period.name}</Text>
                <Text style={[styles.periodTimingText, { color: typeColor }]}>{period.timing}</Text>
                <View style={[styles.slotTypeBadge, { 
                  backgroundColor: SlotTypeColors[getSlotType(classData) as keyof typeof SlotTypeColors]
                }]}>
                  <Text style={[styles.slotTypeText, { 
                    color: 'white'
                  }]}>{getSlotType(classData)}</Text>
                </View>
              </View>
              <View style={styles.periodContent}>
                {classData && classData.length > 0 ? (
                  <ScheduleCard 
                    classData={classData.map(lecture => ({
                      ...lecture,
                      courseName: (() => {
                        // Try to get course name from mapping using matching
                        const mappedCourseName = getCourseNameByMatching(lecture.courseName);
                        
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
                        const originalTitle = extractCourseTitle(lecture.courseName);
                        if (originalTitle !== lecture.courseName) {
                          return originalTitle;
                        }
                        
                        // Final fallback to original cleaned course name
                        return cleanCourseName(lecture);
                      })(),
                      courseCode: (() => {
                        // Try to get course code from mapped course name first
                        const mappedCourseName = getCourseNameByMatching(lecture.courseName);
                        if (mappedCourseName) {
                          const code = extractCourseCode(mappedCourseName);
                          if (code) return code;
                        }
                        
                        // Fallback: extract from original course name
                        const originalCode = getCourseCode(lecture);
                        return extractCourseCode(originalCode || lecture.courseName);
                      })()
                    }))}
                    periodName={period.name} 
                    scheduleType={scheduleType}
                    onMultipleLecturesPress={handleMultipleLecturesPress}
                    dayName={day.dayName}
                  />
                ) : (
                  <View style={[styles.emptyPeriod, { 
                    backgroundColor: scheduleColors.emptyPeriodBg, 
                    borderColor: scheduleColors.emptyPeriodBorder,
                    borderTopRightRadius: 16,
                    borderBottomRightRadius: 16,
                  }]}>
                    <Text style={[styles.emptyText, { color: scheduleColors.emptyText }]}>Free</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
      
      {/* Multiple Lectures Modal */}
      <MultipleLecturesModal
        visible={modalVisible}
        onClose={closeModal}
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
    width: '100%',
  },
  dayHeader: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTitlePill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  periodsContainer: {
    flex: 1,
    padding: 12,
  },
  periodRow: {
    flexDirection: 'row',
    marginBottom: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  periodLabel: {
    width: 80,
    padding: 6,
    borderRightWidth: 1,
    justifyContent: 'center',
  },
  periodLabelText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  periodTimingText: {
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.8,
  },
  slotTypeBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
    alignSelf: 'center',
  },
  slotTypeText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  periodContent: {
    flex: 1,
    padding: 8,
  },
  emptyPeriod: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 14,
    minHeight: 70,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '500',
  },
});
