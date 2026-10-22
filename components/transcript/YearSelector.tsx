import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { formatYearToShort } from './formatYear';
import { StudyYear } from './types';

interface YearSelectorProps {
  studyYears: StudyYear[];
  selectedYear: StudyYear | null;
  onYearSelect: (year: StudyYear) => void;
}

/** Horizontal row of year tiles — big short label ("23/24") over the full range. */
export default function YearSelector({ studyYears, selectedYear, onYearSelect }: YearSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const listRef = useRef<FlatList<StudyYear>>(null);

  const selectedIndex = studyYears.findIndex((y) => y.value === selectedYear?.value);

  // Keep the selected tile in view (e.g. after a refresh or a default selection)
  useEffect(() => {
    if (selectedIndex < 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: selectedIndex, viewPosition: 0.5, animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, [selectedIndex]);

  const renderYearItem = ({ item }: { item: StudyYear }) => {
    const active = selectedYear?.value === item.value;
    const short = formatYearToShort(item.text);
    const showFull = short !== item.text;
    return (
      <Pressable
        onPress={() => {
          if (!active) Haptics.selectionAsync().catch(() => {});
          onYearSelect(item);
        }}
        style={({ pressed }) => [
          styles.tile,
          active
            ? { backgroundColor: colors.primary, borderColor: colors.primary, ...Shadow.glow(colors.primary) }
            : { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={item.text}
        accessibilityState={{ selected: active }}
      >
        <Text
          style={[styles.shortText, { color: active ? colors.onPrimary : colors.textPrimary }]}
          numberOfLines={1}
        >
          {short}
        </Text>
        {showFull && (
          <Text
            style={[styles.fullText, { color: active ? colors.onPrimary : colors.textSecondary }, active && styles.fullTextActive]}
            numberOfLines={1}
          >
            {item.text}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <FlatList
      ref={listRef}
      data={studyYears}
      renderItem={renderYearItem}
      keyExtractor={(year) => year.value}
      extraData={selectedYear?.value}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      onScrollToIndexFailed={({ index, averageItemLength }) =>
        listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: true })
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    marginHorizontal: -Spacing.lg,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    gap: Spacing.sm + 2,
  },
  tile: {
    minWidth: 96,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  shortText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  fullText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  fullTextActive: {
    opacity: 0.85,
  },
});
