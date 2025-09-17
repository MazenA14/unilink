import { Colors, ScheduleColors, ScheduleTypeColors } from '@/constants/Colors';
// Updated to support courseCode
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { ScheduleClass, ScheduleType } from './types';

interface ScheduleCardProps {
  classData: ScheduleClass;
  periodName: string;
  scheduleType?: ScheduleType;
}

export function ScheduleCard({ classData, periodName, scheduleType = 'personal' }: ScheduleCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scheduleColors = ScheduleColors[colorScheme ?? 'light'];
  const typeColor = ScheduleTypeColors[scheduleType];

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
            {classData.officeHours && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                🏢 Office: {classData.officeHours}
              </Text>
            )}
          </>
        );
      case 'course':
        return (
          <>
            {classData.enrollmentCount && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                👥 Students: {classData.enrollmentCount}
              </Text>
            )}
            {classData.credits && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                📊 Credits: {classData.credits}
              </Text>
            )}
          </>
        );
      case 'group':
        return (
          <>
            {classData.groupSize && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                👥 Group Size: {classData.groupSize}
              </Text>
            )}
            {classData.department && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                🏛️ {classData.department}
              </Text>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: scheduleColors.periodLabelBg,
      borderColor: typeColor + '40',
      borderTopRightRadius: 16,
      borderBottomRightRadius: 16,
      borderLeftWidth: 3,
      borderLeftColor: typeColor,
    }]}>
      <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={2}>
        {classData.courseName}
      </Text>
      {classData.courseCode && (
        <Text style={[styles.courseCode, { color: colors.secondaryFont }]} numberOfLines={1}>
          {classData.courseCode}
        </Text>
      )}
      {/* {classData.instructor && !isTutorialIdentifier(classData.instructor) && (
        <Text style={[styles.instructor, { color: colors.secondaryFont }]} numberOfLines={1}>
          {classData.instructor}
        </Text>
      )} */}
      {classData.room && (
        <View style={styles.roomContainer}>
          <Ionicons name="location-outline" size={14} color={colors.secondaryFont} />
          <Text style={[styles.room, { color: colors.secondaryFont }]} numberOfLines={1}>
            {classData.room}
          </Text>
        </View>
      )}
      {renderTypeSpecificInfo()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderWidth: 1,
    minHeight: 80,
    flex: 1,
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
