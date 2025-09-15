import { Colors, ScheduleColors, ScheduleTypeColors, SlotTypeColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { ScheduleCard } from './ScheduleCard';
import { ScheduleDay, ScheduleType } from './types';

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
  
  
  // Calculate dynamic padding based on screen width
  const basePadding = Math.max(12, screenWidth * 0.04);
  const dayPadding = basePadding;

  // Function to extract slot type from class data and clean course name
  const getSlotType = (classData: any): string => {
    if (!classData) return 'Free';
    
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
    { key: 'third', name: '3rd', timing: '11:45 - 1:15' },
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
              shadowColor: typeColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
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
                  backgroundColor: SlotTypeColors[getSlotType(classData) as keyof typeof SlotTypeColors] + '20', 
                  borderColor: SlotTypeColors[getSlotType(classData) as keyof typeof SlotTypeColors] + '40' 
                }]}>
                  <Text style={[styles.slotTypeText, { 
                    color: SlotTypeColors[getSlotType(classData) as keyof typeof SlotTypeColors] 
                  }]}>{getSlotType(classData)}</Text>
                </View>
              </View>
              <View style={styles.periodContent}>
                {classData ? (
                  <ScheduleCard 
                    classData={{
                      ...classData,
                      courseName: cleanCourseName(classData),
                      courseCode: getCourseCode(classData)
                    }} 
                    periodName={period.name} 
                    scheduleType={scheduleType} 
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
    width: 100,
    padding: 8,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'center',
  },
  slotTypeText: {
    fontSize: 8,
    fontWeight: '500',
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
