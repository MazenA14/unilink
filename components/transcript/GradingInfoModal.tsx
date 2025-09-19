import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GradingInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function GradingInfoModal({ visible, onClose }: GradingInfoModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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
          <Text style={[styles.title, { color: colors.mainFont }]}>GUC Grading System</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.mainFont} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
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
  },
  gradeCell: {
    flex: 1,
    alignItems: 'flex-end',
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
});
