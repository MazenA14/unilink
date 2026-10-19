/**
 * Shared picker chrome — select-field trigger, bottom-sheet menu, and menu row.
 * Every "dropdown" in the app opens as a bottom sheet so long lists get room,
 * large touch targets and a consistent dismiss gesture.
 * Presentational only: business logic (search, multiselect, pagination) stays
 * in the feature component that composes these.
 */
import BottomSheet from '@/components/ui/BottomSheet';
import { Radius, Shadow, Spacing } from '@/constants/Theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, ReactNode } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

type IconName = ComponentProps<typeof Ionicons>['name'];

type ThemeColors = {
  surface: string;
  border: string;
  cardBackground: string;
  divider: string;
  primary: string;
  primarySoft: string;
  textPrimary: string;
  textSecondary: string;
  shadow: string;
};

/** Sheet height (fraction of window) that fits `rows` rows plus header chrome. */
export function sheetRatioFor(rows: number, rowHeight = 56, chrome = 120, max = 0.82): number {
  const windowHeight = Dimensions.get('window').height;
  const needed = rows * rowHeight + chrome + 24;
  return Math.min(max, Math.max(0.3, needed / windowHeight));
}

interface DropdownTriggerProps {
  colors: ThemeColors;
  label: string;
  /** @deprecated kept for API compatibility — sheets don't flip the chevron. */
  open?: boolean;
  onPress: () => void;
  disabled?: boolean;
  placeholder?: boolean;
  /** Small caption above the value (e.g. "Course"). */
  caption?: string;
  icon?: IconName;
  style?: ViewStyle;
}

export function DropdownTrigger({
  colors,
  label,
  onPress,
  disabled,
  placeholder,
  caption,
  icon,
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
      accessibilityRole="button"
    >
      {icon && (
        <View style={[styles.triggerIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
      )}
      <View style={styles.triggerTextWrap}>
        {caption ? (
          <Text style={[styles.triggerCaption, { color: colors.textSecondary }]} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
        <Text
          style={[styles.triggerText, { color: placeholder ? colors.textSecondary : colors.textPrimary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

interface SheetHeaderProps {
  colors: ThemeColors;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
}

/** Title row for a picker sheet; `children` render below it (e.g. a search box). */
export function SheetHeader({ colors, title, subtitle, right, children }: SheetHeaderProps) {
  return (
    <View style={[styles.sheetHeader, { borderBottomColor: colors.divider }]}>
      <View style={styles.sheetHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

interface DropdownMenuProps {
  colors: ThemeColors;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Fraction of window height; see `sheetRatioFor`. */
  heightRatio?: number;
  /** @deprecated menus open as bottom sheets; anchors are ignored. */
  anchor?: { x: number; y: number; width: number; height: number } | null;
  /** @deprecated use heightRatio. */
  maxHeight?: number;
  style?: ViewStyle;
}

export function DropdownMenu({
  colors,
  visible,
  onClose,
  children,
  title = 'Select',
  subtitle,
  heightRatio = 0.6,
  style,
}: DropdownMenuProps) {
  return (
    <BottomSheet
      visible={visible}
      onRequestClose={onClose}
      heightRatio={heightRatio}
      header={<SheetHeader colors={colors} title={title} subtitle={subtitle} />}
    >
      <View style={[styles.menuBody, style]}>{children}</View>
    </BottomSheet>
  );
}

interface DropdownItemProps {
  colors: ThemeColors;
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** Multi-select style: always show a circle/check on the right. */
  showCheckmark?: boolean;
  /** @deprecated rows are separated by spacing now. */
  isLast?: boolean;
  subtitle?: string;
  icon?: IconName;
  accent?: string;
}

export function DropdownItem({
  colors,
  label,
  selected,
  onPress,
  showCheckmark,
  subtitle,
  icon,
  accent,
}: DropdownItemProps) {
  const tone = accent ?? colors.primary;
  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: selected ? colors.primarySoft : 'transparent' }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
    >
      {icon && (
        <View style={[styles.itemIcon, { backgroundColor: selected ? colors.surface : colors.primarySoft }]}>
          <Ionicons name={icon} size={18} color={tone} />
        </View>
      )}
      <View style={styles.itemTextContainer}>
        <Text
          style={[styles.itemText, { color: selected ? tone : colors.textPrimary }]}
          numberOfLines={2}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {showCheckmark ? (
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={selected ? tone : colors.textSecondary}
        />
      ) : selected ? (
        <Ionicons name="checkmark" size={20} color={tone} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  triggerIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerTextWrap: {
    flex: 1,
  },
  triggerCaption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  triggerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sheetHeader: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  menuBody: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 52,
    borderRadius: Radius.md,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
