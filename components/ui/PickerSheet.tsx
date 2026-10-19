/**
 * Single-select bottom-sheet picker for a fixed list of options.
 * Selecting a row calls `onSelect` and closes the sheet.
 */
import { DropdownItem, DropdownMenu, sheetRatioFor } from '@/components/ui/Dropdown';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';

export interface PickerOption<T> {
  value: T;
  label: string;
  subtitle?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
}

interface PickerSheetProps<T> {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: PickerOption<T>[];
  selected?: T;
  onSelect: (value: T) => void;
}

export function PickerSheet<T>({ visible, onClose, title, subtitle, options, selected, onSelect }: PickerSheetProps<T>) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hasSubtitles = options.some((o) => o.subtitle);

  return (
    <DropdownMenu
      colors={colors}
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      heightRatio={sheetRatioFor(options.length, hasSubtitles ? 66 : 54, subtitle ? 110 : 90)}
    >
      {options.map((opt) => (
        <DropdownItem
          key={String(opt.value)}
          colors={colors}
          label={opt.label}
          subtitle={opt.subtitle}
          icon={opt.icon}
          selected={opt.value === selected}
          onPress={() => {
            onSelect(opt.value);
            onClose();
          }}
        />
      ))}
    </DropdownMenu>
  );
}
