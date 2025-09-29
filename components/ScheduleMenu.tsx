import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScheduleMenuProps {
  visible: boolean;
  onClose: () => void;
  onOptionPress: (option: string) => void;
}

const menuOptions = [
  { id: 'personal', title: 'Personal Schedule', icon: 'person-outline' },
  { id: 'staff', title: 'Staff Schedule', icon: 'people-outline' },
  { id: 'course', title: 'Course Schedule', icon: 'book-outline' },
];

export function ScheduleMenu({ visible, onClose, onOptionPress }: ScheduleMenuProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade in overlay immediately
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Slide up menu with slight delay
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide down menu first
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Then fade out overlay
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [visible, fadeAnim, slideAnim]);

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
        <Animated.View style={[styles.menuWrapper, { transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.menu, { backgroundColor: colors.cardBackground }]}>
            {/* Menu Header */}
            {/* <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>
                Select Schedule Type
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={colors.secondaryFont} 
                />
              </TouchableOpacity>
            </View> */}
            
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
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  menu: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
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