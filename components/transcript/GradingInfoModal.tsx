import { Colors } from '@/constants/Colors';
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

interface GradingInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function GradingInfoModal({ visible, onClose }: GradingInfoModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
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

  const gradingRanges = [
    { range: '0.7 - 1.54', grade: 'Excellent', color: colors.gradeExcellent },
    { range: '1.55 - 2.54', grade: 'Very Good', color: colors.gradeGood },
    { range: '2.55 - 3.54', grade: 'Good', color: colors.gradeAverage },
    { range: '3.55 - 3.70', grade: 'Satisfactory', color: colors.gradeBelowAverage },
  ];

  const honorsRanges = [
    { range: '0.7 - 0.99', grade: 'Highest Honors', color: colors.gradeExcellent },
    { range: '1.00 - 1.29', grade: 'High Honors', color: colors.gradeGood },
    { range: '1.30 - 1.69', grade: 'Honors', color: colors.gradeAverage },
  ];

  const customGPARanges = [
    { range: '0.7 - 1.7', grade: 'Excellent', color: colors.gradeExcellent },
    { range: '1.7 - 2.3', grade: 'Very Good', color: colors.gradeGood },
    { range: '2.3 - 3.0', grade: 'Good', color: colors.gradeAverage },
    { range: '3.0 - 3.7', grade: 'Below Average', color: colors.gradeBelowAverage },
    { range: '3.7 - 4.3', grade: 'Failing', color: colors.gradeFailing },
    { range: '4.3 - 5.0', grade: 'Failing', color: colors.gradeFailing },
  ];

  const gradingScheme = [
    { scoreRange: '94 - 100', letterGrade: 'A+', gpaRange: '0.99 - 0.7' },
    { scoreRange: '90 - 93.9', letterGrade: 'A', gpaRange: '1.29 - 1.0' },
    { scoreRange: '86 - 89.9', letterGrade: 'A-', gpaRange: '1.69 - 1.3' },
    { scoreRange: '82 - 85.9', letterGrade: 'B+', gpaRange: '1.99 - 1.7' },
    { scoreRange: '78 - 81.9', letterGrade: 'B', gpaRange: '2.29 - 2.0' },
    { scoreRange: '74 - 77.9', letterGrade: 'B-', gpaRange: '2.69 - 2.3' },
    { scoreRange: '70 - 73.9', letterGrade: 'C+', gpaRange: '2.99 - 2.7' },
    { scoreRange: '65 - 69.9', letterGrade: 'C', gpaRange: '3.29 - 3.0' },
    { scoreRange: '60 - 64.9', letterGrade: 'C-', gpaRange: '3.69 - 3.3' },
    { scoreRange: '55 - 59.9', letterGrade: 'D+', gpaRange: '3.99 - 3.7' },
    { scoreRange: '50 - 54.9', letterGrade: 'D', gpaRange: '4.99 - 4.0' },
    { scoreRange: '0 - 49.9', letterGrade: 'F', gpaRange: '6.0 - 5.0' },
  ];

  const getGradeColor = (letterGrade: string) => {
    if (letterGrade.startsWith('A')) return colors.gradeExcellent;
    if (letterGrade.startsWith('B')) return colors.gradeGood;
    if (letterGrade.startsWith('C')) return colors.gradeAverage;
    if (letterGrade.startsWith('D')) return colors.gradeBelowAverage;
    return colors.gradeFailing;
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
              <Text style={[styles.title, { color: colors.mainFont }]}>Grading System</Text>
              {/* <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.mainFont} />
              </TouchableOpacity> */}
            </View>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Grading Scheme */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>Grading Scheme</Text>
            <View style={[styles.gradingSchemeTable, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={[styles.gradingSchemeHeader, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3' }]}>
                <Text style={[styles.gradingSchemeHeaderText, { color: colors.secondaryFont }]}>Score Range</Text>
                <Text style={[styles.gradingSchemeHeaderText, { color: colors.secondaryFont }]}>Letter Grade</Text>
                <Text style={[styles.gradingSchemeHeaderText, { color: colors.secondaryFont }]}>GPA Range</Text>
              </View>
              {gradingScheme.map((item, index) => (
                <View key={index} style={[styles.gradingSchemeRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.gradingSchemeCell}>
                    <Text style={[styles.gradingSchemeText, { color: colors.mainFont }]}>{item.scoreRange}</Text>
                  </View>
                  <View style={styles.gradingSchemeCell}>
                    <View style={[styles.gradingSchemeGradeBadge, { backgroundColor: getGradeColor(item.letterGrade) }]}>
                      <Text style={[styles.gradingSchemeGradeText, { color: '#FFFFFF' }]}>{item.letterGrade}</Text>
                    </View>
                  </View>
                  <View style={styles.gradingSchemeCell}>
                    <Text style={[styles.gradingSchemeText, { color: colors.mainFont }]}>{item.gpaRange}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Cumulative Grading System */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>
              Cumulative Grading System
            </Text>
            <View style={[styles.table, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={[styles.tableHeader, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3' }]}>
                <Text style={[styles.headerText, { color: colors.secondaryFont }]}>GPA Range</Text>
                <Text style={[styles.headerText, { color: colors.secondaryFont }]}>Grade</Text>
              </View>
              {gradingRanges.map((item, index) => (
                <View key={index} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.rangeCell}>
                    <Text style={[styles.rangeText, { color: colors.mainFont }]}>{item.range}</Text>
                  </View>
                  <View style={styles.gradeCell}>
                    <View style={[styles.gradeBadge, { backgroundColor: item.color }]}>
                      <Text style={[styles.gradeText, { color: '#FFFFFF' }]}>{item.grade}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Honors System */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>
              Honors System
            </Text>
            <View style={[styles.table, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={[styles.tableHeader, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3' }]}>
                <Text style={[styles.headerText, { color: colors.secondaryFont }]}>GPA Range</Text>
                <Text style={[styles.headerText, { color: colors.secondaryFont }]}>Honors Level</Text>
              </View>
              {honorsRanges.map((item, index) => (
                <View key={index} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.rangeCell}>
                    <Text style={[styles.rangeText, { color: colors.mainFont }]}>{item.range}</Text>
                  </View>
                  <View style={styles.gradeCell}>
                    <View style={[styles.gradeBadge, { backgroundColor: item.color }]}>
                      <Text style={[styles.gradeText, { color: '#FFFFFF' }]}>{item.grade}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Custom GPA Grading Scheme */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>
              Semester & Course GPA Grading Scheme
            </Text>
            <View style={[styles.table, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={[styles.tableHeader, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3' }]}>
                <Text style={[styles.headerText, { color: colors.secondaryFont }]}>GPA Range</Text>
                <Text style={[styles.headerText, { color: colors.secondaryFont }]}>Grade</Text>
              </View>
              {customGPARanges.map((item, index) => (
                <View key={index} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.rangeCell}>
                    <Text style={[styles.rangeText, { color: colors.mainFont }]}>{item.range}</Text>
                  </View>
                  <View style={styles.gradeCell}>
                    <View style={[styles.gradeBadge, { backgroundColor: item.color }]}>
                      <Text style={[styles.gradeText, { color: '#FFFFFF' }]}>{item.grade}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Additional Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>
              Additional Information
            </Text>
            <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text style={[styles.infoText, { color: colors.mainFont }]}>
                • Elective courses with a grade equal to or better than &apos;B&apos; are counted in Final Cumulative Grade.
              </Text>
              <Text style={[styles.infoText, { color: colors.mainFont }]}>
                • Elective courses with a grade &apos;D&apos; or &apos;D-&apos; do not appear in the Transcript.
              </Text>
              <Text style={[styles.infoText, { color: colors.mainFont }]}>
                • Bachelor Thesis taken in other universities is not counted in the Cumulative GPA.
              </Text>
            </View>
          </View>
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
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  table: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  rangeCell: {
    flex: 1,
    justifyContent: 'center',
  },
  rangeText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  gradeCell: {
    flex: 1,
    alignItems: 'center',
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 100,
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  // Grading Scheme Table Styles
  gradingSchemeTable: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gradingSchemeHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  gradingSchemeHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  gradingSchemeRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  gradingSchemeCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradingSchemeText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  gradingSchemeGradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 35,
    alignItems: 'center',
  },
  gradingSchemeGradeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
