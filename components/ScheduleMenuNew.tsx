import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScheduleMenuNewProps {
  visible: boolean;
  onClose: () => void;
  onOptionPress: (option: string) => void;
}

const menuOptions = [
  { id: 'personal', title: 'Personal Schedule', icon: 'person-outline' },
  { id: 'staff', title: 'Staff Schedule', icon: 'people-outline' },
  { id: 'course', title: 'Course Schedule', icon: 'book-outline' },
  { id: 'group', title: 'Group Schedule', icon: 'school-outline' },
];

export function ScheduleMenuNew({ visible, onClose, onOptionPress }: ScheduleMenuNewProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fast fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else {
      // Fast fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <Animated.View style={[styles.menuWrapper, { opacity: fadeAnim }]}>
          <View style={[styles.menu, { backgroundColor: colors.cardBackground }]}>
            {/* Menu Options */}
            {menuOptions.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.menuItem,
                  { borderBottomColor: colors.border },
                  index === menuOptions.length - 1 && styles.lastMenuItem
                ]}
                onPress={() => onOptionPress(option.id)}
                activeOpacity={0.6}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.tint + '15' }]}>
                  <Ionicons 
                    name={option.icon as any} 
                    size={22} 
                    color={colors.tint} 
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.menuText, { color: colors.text }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.menuSubtext, { color: colors.secondaryFont }]}>
                    {getMenuSubtext(option.id)}
                  </Text>
                </View>
                <Ionicons 
                  name="chevron-forward" 
                  size={18} 
                  color={colors.tabIconDefault} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function getMenuSubtext(optionId: string): string {
  switch (optionId) {
    case 'personal':
      return 'View your personal class schedule';
    case 'staff':
      return 'Browse staff member schedules';
    case 'course':
      return 'Find specific course schedules';
    case 'group':
      return 'View group/class schedules';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuWrapper: {
    position: 'absolute',
    top: 110, // Position right below the section title area
    left: 20, // Align with the left edge of the section title
    width: 260, // Slightly smaller width for better proportion
  },
  menu: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    minHeight: 72,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtext: {
    fontSize: 13,
    fontWeight: '400',
  },
});
