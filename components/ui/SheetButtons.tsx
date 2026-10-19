/**
 * Standard action row for a bottom sheet footer: optional secondary button
 * plus a filled primary button.
 */
import { Colors } from '@/constants/Colors';
import { Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface SheetButton {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
}

interface SheetButtonsProps {
  primary: SheetButton & { tone?: 'primary' | 'danger' };
  secondary?: SheetButton;
}

export function SheetButtons({ primary, secondary }: SheetButtonsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const fill = primary.tone === 'danger' ? colors.danger : colors.primary;
  const onFill = primary.tone === 'danger' ? colors.onAccent : colors.onPrimary;
  const primaryDisabled = primary.disabled || primary.loading;

  return (
    <View style={styles.row}>
      {secondary && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.surfaceSunken, opacity: secondary.disabled ? 0.5 : 1 }]}
          onPress={secondary.onPress}
          disabled={secondary.disabled}
          activeOpacity={0.75}
        >
          {secondary.icon && <Ionicons name={secondary.icon} size={18} color={colors.textPrimary} />}
          <Text style={[styles.label, { color: colors.textPrimary }]}>{secondary.label}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: fill, opacity: primaryDisabled ? 0.55 : 1 }]}
        onPress={primary.onPress}
        disabled={primaryDisabled}
        activeOpacity={0.8}
      >
        {primary.loading ? (
          <ActivityIndicator size="small" color={onFill} />
        ) : (
          <>
            {primary.icon && <Ionicons name={primary.icon} size={18} color={onFill} />}
            <Text style={[styles.label, { color: onFill }]}>{primary.label}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 50,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});
