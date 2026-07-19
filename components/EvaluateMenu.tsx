import { Colors } from '@/constants/Colors';
import { Radius, Shadow, withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface EvaluateMenuAnchor {
  top: number;
  left: number;
  width: number;
}

interface EvaluateMenuProps {
  visible: boolean;
  anchor: EvaluateMenuAnchor | null;
  onClose: () => void;
  onSelect: (option: 'course' | 'staff') => void;
  /** Accent color, matched to the Evaluate button that opens this menu. */
  color?: string;
}

const menuOptions: { id: 'course' | 'staff'; title: string; icon: string }[] = [
  { id: 'course', title: 'Course', icon: 'book-outline' },
  { id: 'staff', title: 'Staff', icon: 'person-outline' },
];

export function EvaluateMenu({ visible, anchor, onClose, onSelect, color = '#F59E0B' }: EvaluateMenuProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -8, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!visible || !anchor) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View
        style={[
          styles.menuWrapper,
          {
            top: anchor.top,
            left: anchor.left,
            width: anchor.width,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.menu,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
            Shadow.lg(colors),
          ]}
        >
          {menuOptions.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.menuItem,
                { borderBottomColor: colors.divider },
                index === menuOptions.length - 1 && styles.lastMenuItem,
              ]}
              onPress={() => onSelect(option.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconChip, { backgroundColor: withAlpha(color, 0.16) }]}>
                <Ionicons name={option.icon as any} size={16} color={color} />
              </View>
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>{option.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuWrapper: {
    position: 'absolute',
  },
  menu: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
