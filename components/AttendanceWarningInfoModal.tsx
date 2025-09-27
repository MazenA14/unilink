import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

interface AttendanceWarningInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AttendanceWarningInfoModal({ visible, onClose }: AttendanceWarningInfoModalProps) {
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
              <Text style={[styles.title, { color: colors.mainFont }]}>Attendance Warning Levels</Text>
            </View>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
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
                        <Text style={styles.levelBadgeText}>{warning.title}</Text>
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
                <View style={[styles.tableHeader, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3' }]}>
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
    color: 'white',
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
