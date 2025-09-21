import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
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

  const getSlotTypeColor = (slotType?: string) => {
    const typeColors: { [key: string]: string } = {
      'Lecture': '#3B82F6',
      'Tutorial': '#10B981',
      'Lab': '#F59E0B',
      'Seminar': '#8B5CF6',
      'Workshop': '#EF4444',
      'Project': '#06B6D4',
      'Thesis': '#84CC16',
    };
    return typeColors[slotType || 'Lecture'] || '#6B7280';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>
              {dayName} - {periodName}
            </Text>
            <Text style={[styles.subtitle, { color: colors.secondaryFont }]}>
              {lectures.length} {lectures.length === 1 ? 'Slot' : 'Slots'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.border }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {lectures.map((lecture, index) => {
            const typeColor = getSlotTypeColor(lecture.slotType);
            
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
                  <Text style={styles.slotTypeText}>{lecture.slotType || 'Lecture'}</Text>
                </View>

                {/* Course Name */}
                <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={2}>
                  {lecture.courseName}
                </Text>

                {/* Course Code */}
                {lecture.courseCode && (
                  <Text style={[styles.courseCode, { color: colors.secondaryFont }]} numberOfLines={1}>
                    {lecture.courseCode}
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
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
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
    color: 'white',
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
