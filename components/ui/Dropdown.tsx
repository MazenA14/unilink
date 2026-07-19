/**
 * Shared dropdown chrome — trigger button, popover menu, and menu row.
 * Presentational only: business logic (search, multiselect, pagination) stays
 * in the feature component that composes these.
 */
import { Radius, Shadow, Spacing, withAlpha } from '@/constants/Theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactNode } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

type ThemeColors = {
  surface: string;
  border: string;
  cardBackground: string;
  divider: string;
  primary: string;
  textPrimary: string;
  textSecondary: string;
  shadow: string;
};

interface DropdownTriggerProps {
  colors: ThemeColors;
  label: string;
  open: boolean;
  onPress: () => void;
  disabled?: boolean;
  placeholder?: boolean;
  style?: ViewStyle;
}

export function DropdownTrigger({
  colors,
  label,
  open,
  onPress,
  disabled,
  placeholder,
  style,
}: DropdownTriggerProps) {
  return (
    <TouchableOpacity
      style={[
        styles.trigger,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: disabled ? 0.6 : 1,
          ...Shadow.xs(colors),
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.triggerText,
          { color: placeholder ? colors.textSecondary : colors.textPrimary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Ionicons
        name={open ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

interface DropdownMenuProps {
  colors: ThemeColors;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  anchor?: { x: number; y: number; width: number; height: number } | null;
  maxHeight?: number;
  style?: ViewStyle;
}

export function DropdownMenu({
  colors,
  visible,
  onClose,
  children,
  anchor,
  maxHeight = 400,
  style,
}: DropdownMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[
            styles.menu,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
              maxHeight,
              ...Shadow.lg(colors),
            },
            anchor
              ? {
                  position: 'absolute',
                  top: anchor.y + anchor.height + Spacing.xs,
                  left: anchor.x,
                  width: anchor.width,
                }
              : styles.menuCentered,
            style,
          ]}
        >
          {children}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

interface DropdownItemProps {
  colors: ThemeColors;
  label: string;
  selected?: boolean;
  onPress: () => void;
  showCheckmark?: boolean;
  isLast?: boolean;
  subtitle?: string;
}

export function DropdownItem({
  colors,
  label,
  selected,
  onPress,
  showCheckmark,
  isLast,
  subtitle,
}: DropdownItemProps) {
  return (
    <TouchableOpacity
      style={[
        styles.item,
        {
          backgroundColor: selected ? withAlpha(colors.primary, 0.12) : 'transparent',
          borderBottomColor: colors.divider,
          borderBottomWidth: isLast ? 0 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.itemTextContainer}>
        <Text
          style={[
            styles.itemText,
            { color: selected ? colors.primary : colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {showCheckmark && (
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={selected ? colors.primary : colors.textSecondary}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginRight: Spacing.sm,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menu: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuCentered: {
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    width: '85%',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
