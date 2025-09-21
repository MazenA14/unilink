import { Colors, ScheduleColors, ScheduleTypeColors } from '@/constants/Colors';
// Updated to support courseCode
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
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

  // Function to check if the instructor field is a tutorial identifier
  const isTutorialIdentifier = (instructor: string): boolean => {
    if (!instructor || !instructor.trim()) return false;
    
    // Check for patterns like "7MET T014", "7MET L001", etc.
    const tutorialPattern = /^\d+[A-Z]+\s+[A-Z]\d+$/;
    return tutorialPattern.test(instructor.trim());
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
              {firstLecture.courseCode}
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
    marginBottom: 2,
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
  time: {
    fontSize: 12,
  },
  additionalInfo: {
    fontSize: 12,
    marginTop: 2,
  },
});
