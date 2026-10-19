import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { Colors, SlotTypeColors } from '@/constants/Colors';
import { useShiftedSchedule } from '@/contexts/ShiftedScheduleContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { ScheduleClass } from './types';

interface MultipleLecturesModalProps {
  visible: boolean;
  onClose: () => void;
  lectures: ScheduleClass[];
  periodName: string;
  dayName: string;
}

export function MultipleLecturesModal({
  visible,
  onClose,
  lectures,
  periodName,
  dayName,
}: MultipleLecturesModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isShiftedScheduleEnabled } = useShiftedSchedule();
  
  // Function to get period timing based on period name
  const getPeriodTiming = (period: string): string => {
    const periodTimings: { [key: string]: string } = {
      '1st': '8:15 - 9:45',
      'first': '8:15 - 9:45',
      '2nd': '10:00 - 11:30',
      'second': '10:00 - 11:30',
      '3rd': isShiftedScheduleEnabled ? '12:00 - 1:30' : '11:45 - 1:15',
      'third': isShiftedScheduleEnabled ? '12:00 - 1:30' : '11:45 - 1:15',
      '4th': isShiftedScheduleEnabled ? '2:00 - 3:30' : '1:45 - 3:15',
      'fourth': isShiftedScheduleEnabled ? '2:00 - 3:30' : '1:45 - 3:15',
      '5th': isShiftedScheduleEnabled ? '4:00 - 5:30' : '3:45 - 5:15',
      'fifth': isShiftedScheduleEnabled ? '4:00 - 5:30' : '3:45 - 5:15',
    };
    
    return periodTimings[period.toLowerCase()] || '';
  };

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

  const getSlotTypeColor = (slotType?: string) => {
    const typeColors: { [key: string]: string } = SlotTypeColors;
    return typeColors[slotType || 'Lecture'] || SlotTypeColors.Free;
  };

  return (
    <BottomSheet
      visible={visible}
      onRequestClose={onClose}
      autoHeight
      heightRatio={0.85}
      header={
        <SheetHeader
          colors={colors}
          title={`${dayName} - ${periodName}`}
          subtitle={`${getPeriodTiming(periodName)} · ${lectures.length} ${lectures.length === 1 ? 'Slot' : 'Slots'}`}
        />
      }
    >
      <View style={styles.modalContent}>
          {lectures.map((lecture, index) => {
            const typeColor = getSlotTypeColor(lecture.slotType);
            
            // Debug logging for each lecture
            
            return (
              <View
                key={index}
                style={[
                  styles.lectureCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    borderLeftColor: typeColor,
                  },
                ]}
              >
                {/* Slot Type Badge */}
                <View style={[styles.slotTypeBadge, { backgroundColor: typeColor }]}>
                  <Text style={[styles.slotTypeText, { color: colors.onAccent }]}>{lecture.slotType || 'Lecture'}</Text>
                </View>

                {/* Course Name */}
                <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={2}>
                  {lecture.courseName}
                </Text>

                {/* Course Code */}
                {lecture.courseCode && (
                  <Text style={[styles.courseCode, { color: colors.secondaryFont }]} numberOfLines={1}>
                    {formatCourseCode(lecture.courseCode, lecture.instructor)}
                  </Text>
                )}

                {/* Room */}
                {lecture.room && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color={colors.secondaryFont} />
                    <Text style={[styles.infoText, { color: colors.secondaryFont }]}>
                      {lecture.room}
                    </Text>
                  </View>
                )}

                {/* Instructor */}
                {lecture.instructor && (
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color={colors.secondaryFont} />
                    <Text style={[styles.infoText, { color: colors.secondaryFont }]}>
                      {lecture.instructor}
                    </Text>
                  </View>
                )}

                {/* Time */}
                {lecture.time && (
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={16} color={colors.secondaryFont} />
                    <Text style={[styles.infoText, { color: colors.secondaryFont }]}>
                      {lecture.time}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // Modal styles
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  lectureCard: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  slotTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  slotTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 14,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});
