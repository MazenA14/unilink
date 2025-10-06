import { Colors, ScheduleColors, ScheduleTypeColors } from '@/constants/Colors';
// Updated to support courseCode
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScheduleClass, ScheduleType } from './types';

interface ScheduleCardProps {
  classData: ScheduleClass | ScheduleClass[];
  periodName: string;
  scheduleType?: ScheduleType;
  onMultipleLecturesPress?: (lectures: ScheduleClass[], periodName: string, dayName: string) => void;
  dayName?: string;
}

export function ScheduleCard({ classData, periodName, scheduleType = 'personal', onMultipleLecturesPress, dayName }: ScheduleCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scheduleColors = ScheduleColors[colorScheme ?? 'light'];
  const typeColor = ScheduleTypeColors[scheduleType];

  // Handle both single lecture and multiple lectures
  const lectures = Array.isArray(classData) ? classData : [classData];
  const firstLecture = lectures[0];
  const hasMultipleLectures = lectures.length > 1;

  // Debug logging for course code data

  // Function to format course code in the new format "MCTR704 - P031"
  const formatCourseCode = (courseCode?: string, instructor?: string): string => {
    if (!courseCode) return '';
    
    // Extract the main course code (e.g., "MCTR704" from "MCTR704 - P031")
    const mainCode = courseCode.split(' - ')[0] || courseCode;
    
    // Try to extract section/group info from instructor field if it follows pattern like "P031"
    let sectionInfo = '';
    if (instructor) {
      const sectionMatch = instructor.match(/([A-Z]\d+)/);
      if (sectionMatch) {
        sectionInfo = sectionMatch[1];
      }
    }
    
    // If no section info found in instructor, try to extract from courseCode itself
    if (!sectionInfo && courseCode.includes(' - ')) {
      const parts = courseCode.split(' - ');
      if (parts.length > 1) {
        sectionInfo = parts[1];
      }
    }
    
    // Format as "MCTR704 - P031" or just "MCTR704" if no section info
    return sectionInfo ? `${mainCode} - ${sectionInfo}` : mainCode;
  };


  const renderTypeSpecificInfo = () => {
    switch (scheduleType) {
      case 'staff':
        return (
          <>
            {firstLecture.officeHours && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                🏢 Office: {firstLecture.officeHours}
              </Text>
            )}
          </>
        );
      case 'course':
        return (
          <>
            {firstLecture.enrollmentCount && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                👥 Students: {firstLecture.enrollmentCount}
              </Text>
            )}
            {firstLecture.credits && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                📊 Credits: {firstLecture.credits}
              </Text>
            )}
          </>
        );
      case 'group':
        return (
          <>
            {firstLecture.groupSize && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                👥 Group Size: {firstLecture.groupSize}
              </Text>
            )}
            {firstLecture.department && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                🏛️ {firstLecture.department}
              </Text>
            )}
          </>
        );
      default:
        return null;
    }
  };

  const handleMultipleLecturesPress = () => {
    if (hasMultipleLectures && onMultipleLecturesPress && dayName) {
      onMultipleLecturesPress(lectures, periodName, dayName);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { 
        backgroundColor: scheduleColors.periodLabelBg,
        borderColor: typeColor + '40',
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
        borderLeftWidth: 3,
        borderLeftColor: typeColor,
      }]}
      onPress={hasMultipleLectures ? handleMultipleLecturesPress : undefined}
      disabled={!hasMultipleLectures}
    >
      <View style={styles.contentContainer}>
        <View style={styles.lectureInfo}>
          <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={2}>
            {firstLecture.courseName}
          </Text>
          {firstLecture.courseCode && (
            <Text style={[styles.courseCode, { color: colors.secondaryFont }]} numberOfLines={1}>
              {formatCourseCode(firstLecture.courseCode, firstLecture.instructor)}
            </Text>
          )}
          {firstLecture.room && (
            <View style={styles.roomContainer}>
              <Ionicons name="location-outline" size={14} color={colors.secondaryFont} />
              <Text style={[styles.room, { color: colors.secondaryFont }]} numberOfLines={1}>
                {firstLecture.room}
              </Text>
            </View>
          )}
          {scheduleType !== 'personal' && firstLecture.instructor && (
            <View style={styles.instructorContainer}>
              <Ionicons name="person-outline" size={14} color={colors.secondaryFont} />
              <Text style={[styles.instructor, { color: colors.secondaryFont }]} numberOfLines={1}>
                {firstLecture.instructor}
              </Text>
            </View>
          )}
          {renderTypeSpecificInfo()}
        </View>
        
        {/* Multiple lectures count badge */}
        {hasMultipleLectures && (
          <View style={[styles.countBadge, { backgroundColor: typeColor }]}>
            <Text style={styles.countText}>{lectures.length}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderWidth: 1,
    minHeight: 80,
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  lectureInfo: {
    flex: 1,
    marginRight: 8,
  },
  countBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  countText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  courseName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
    opacity: 0.8,
  },
  instructor: {
    fontSize: 12,
    marginLeft: 4,
  },
  roomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  room: {
    fontSize: 12,
    marginLeft: 4,
  },
  instructorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
  },
  additionalInfo: {
    fontSize: 12,
    marginTop: 2,
  },
});
