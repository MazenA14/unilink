import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { StyleSheet, Text, View } from 'react-native';

interface AttendanceWarningInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AttendanceWarningInfoModal({ visible, onClose }: AttendanceWarningInfoModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const warningLevels = [
    { 
      level: '1', 
      title: 'Level 1', 
      description: 'First Warning - Initial absence warning',
      color: colors.gradeGood 
    },
    { 
      level: '2', 
      title: 'Level 2', 
      description: 'Second Warning - Continued absence warning',
      color: colors.gradeAverage 
    },
    { 
      level: '3', 
      title: 'Level 3', 
      description: 'Course Drop - 25%+ absence rate',
      color: colors.gradeFailing 
    },
  ];

  return (
    <BottomSheet
      visible={visible}
      onRequestClose={onClose}
      autoHeight
      heightRatio={0.85}
      header={<SheetHeader colors={colors} title="Attendance Warning Levels" />}
    >
      <View style={styles.modalContent}>
            {/* Warning Levels Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>Warning Level System</Text>
              <Text style={[styles.sectionDescription, { color: colors.secondaryFont }]}>
                The attendance system uses a three-level warning system to track student attendance. 
                Warning levels are automatically assigned based on your absence rate.
              </Text>
              
              <View style={styles.warningLevelsContainer}>
                {warningLevels.map((warning, index) => (
                  <View key={index} style={[styles.warningLevelCard, { 
                    backgroundColor: colors.cardBackground,
                    borderColor: warning.color + '40'
                  }]}>
                    <View style={styles.warningLevelHeader}>
                      <View style={[styles.levelBadge, { backgroundColor: warning.color }]}>
                        <Text style={[styles.levelBadgeText, { color: colors.onAccent }]}>{warning.title}</Text>
                      </View>
                    </View>
                    <Text style={[styles.warningDescription, { color: colors.mainFont }]}>
                      {warning.description}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* How It Works Section */}
            {/* <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>How It Works</Text>
              <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.infoItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.gradeGood} />
                  <Text style={[styles.infoText, { color: colors.mainFont }]}>
                    Warning levels are calculated automatically based on your attendance percentage
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="time" size={20} color={colors.tint} />
                  <Text style={[styles.infoText, { color: colors.mainFont }]}>
                    Attendance updates may take up to 1 hour to reflect in the system
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="alert-circle" size={20} color={colors.gradeFailing} />
                  <Text style={[styles.infoText, { color: colors.mainFont }]}>
                    Level 3 (Course Drop) occurs when absence rate reaches 25% or higher
                  </Text>
                </View>
              </View>
            </View> */}

            {/* Badge Colors Section */}
            {/* <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>Badge Colors</Text>
              <View style={[styles.colorGuideTable, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={[styles.tableHeader, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.headerText, { color: colors.secondaryFont }]}>Level</Text>
                  <Text style={[styles.headerText, { color: colors.secondaryFont }]}>Color</Text>
                  <Text style={[styles.headerText, { color: colors.secondaryFont }]}>Meaning</Text>
                </View>
                {warningLevels.map((warning, index) => (
                  <View key={index} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.levelCell}>
                      <Text style={[styles.levelText, { color: colors.mainFont }]}>{warning.title}</Text>
                    </View>
                    <View style={styles.colorCell}>
                      <View style={[styles.colorBadge, { backgroundColor: warning.color }]} />
                    </View>
                    <View style={styles.meaningCell}>
                      <Text style={[styles.meaningText, { color: colors.mainFont }]}>
                        {warning.level === '1' ? 'Caution' : warning.level === '2' ? 'Warning' : 'Critical'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View> */}
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
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  warningLevelsContainer: {
    gap: 12,
  },
  warningLevelCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  warningLevelHeader: {
    marginBottom: 8,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  warningDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  colorGuideTable: {
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
  levelCell: {
    flex: 1,
    justifyContent: 'center',
  },
  levelText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  colorCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  meaningCell: {
    flex: 1,
    justifyContent: 'center',
  },
  meaningText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
