import { Colors } from '@/constants/Colors';
import { Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { StudyYear } from './types';

interface YearSelectorProps {
  studyYears: StudyYear[];
  selectedYear: StudyYear | null;
  onYearSelect: (year: StudyYear) => void;
}

/** Horizontal chip row — study years are few, so they stay visible inline. */
export default function YearSelector({ studyYears, selectedYear, onYearSelect }: YearSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const renderYearItem = ({ item }: { item: StudyYear }) => {
    const active = selectedYear?.value === item.value;
    return (
      <TouchableOpacity
        style={[
          styles.chip,
          {
            backgroundColor: active ? colors.primary : colors.surface,
            borderColor: active ? colors.primary : colors.border,
          },
        ]}
        onPress={() => onYearSelect(item)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Text style={[styles.chipText, { color: active ? colors.onPrimary : colors.textPrimary }]}>
          {item.text}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={studyYears}
      renderItem={renderYearItem}
      keyExtractor={(year) => year.value}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.list}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    marginBottom: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.xs,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
