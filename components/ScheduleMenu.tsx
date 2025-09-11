import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScheduleMenuProps {
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

export function ScheduleMenu({ visible, onClose, onOptionPress }: ScheduleMenuProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <View style={styles.menuWrapper}>
          <View style={[styles.menu, { backgroundColor: colors.background }]}>
            {menuOptions.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.menuItem,
                  { borderBottomColor: colors.border },
                  index === menuOptions.length - 1 && styles.lastMenuItem
                ]}
                onPress={() => onOptionPress(option.id)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={24} 
                  color={colors.tint} 
                  style={styles.menuIcon}
                />
                <Text style={[styles.menuText, { color: colors.text }]}>
                  {option.title}
                </Text>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={colors.tabIconDefault} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    paddingHorizontal: 20,
    paddingBottom: 30, // Reduced space to position menu lower
  },
  menu: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});