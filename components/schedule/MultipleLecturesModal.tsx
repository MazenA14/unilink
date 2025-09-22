import { Colors } from '@/constants/Colors';
import { useShiftedSchedule } from '@/contexts/ShiftedScheduleContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    PanResponder,
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
  const { isShiftedScheduleEnabled } = useShiftedSchedule();
  
  // Animation values
  const translateY = useState(new Animated.Value(0))[0];
  const opacity = useState(new Animated.Value(0))[0];
  const { height: screenHeight } = Dimensions.get('window');
  
  // Header pan responder for swipe down gesture
  const dragHandlePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to downward swipes
      const isDownwardSwipe = gestureState.dy > 0;
      const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      
      return isDownwardSwipe && isVerticalSwipe;
    },
    onPanResponderGrant: () => {
      // Don't set offset - start from current position
      translateY.setValue(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
        const progress = Math.min(gestureState.dy / 200, 1);
        opacity.setValue(1 - progress);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy > 100) {
        closeModal();
      } else {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(opacity, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
  });

  const closeModal = () => {
    // Animate modal out
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      // Reset values for next time
      translateY.setValue(0);
      opacity.setValue(0);
    });
  };

  // Handle modal opening animation
  useEffect(() => {
    if (visible) {
      // Animate modal in
      translateY.setValue(screenHeight);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

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
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={closeModal}
    >
      <Animated.View style={[styles.modalOverlay, { opacity }]}>
        <Animated.View 
          style={[
            styles.modalContainer, 
            { 
              backgroundColor: colors.cardBackground,
              transform: [{ translateY }]
            }
          ]}
        >
          {/* Modal Header */}
          <View 
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            {...dragHandlePanResponder.panHandlers}
          >
            {/* Drag Handle */}
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            
            <View style={styles.headerContent}>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.title, { color: colors.mainFont }]}>
                  {dayName} - {periodName}
                </Text>
                <Text style={[styles.timing, { color: colors.secondaryFont }]}>
                  {getPeriodTiming(periodName)}
                </Text>
                <Text style={[styles.subtitle, { color: colors.secondaryFont }]}>
                  {lectures.length} {lectures.length === 1 ? 'Slot' : 'Slots'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
              >
                {/* <Ionicons name="close" size={24} color={colors.mainFont} /> */}
              </TouchableOpacity>
            </View>
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
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
                  <Text style={styles.slotTypeText}>{lecture.slotType || 'Lecture'}</Text>
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
                {/* {lecture.instructor && (
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color={colors.secondaryFont} />
                    <Text style={[styles.infoText, { color: colors.secondaryFont }]}>
                      {lecture.instructor}
                    </Text>
                  </View>
                )} */}

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
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '95%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  timing: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.8,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
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
