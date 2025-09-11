import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { StudyYear } from './types';

interface YearSelectorProps {
  studyYears: StudyYear[];
  selectedYear: StudyYear | null;
  onYearSelect: (year: StudyYear) => void;
}

export default function YearSelector({ studyYears, selectedYear, onYearSelect }: YearSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const renderYearItem = ({ item }: { item: StudyYear }) => (
    <TouchableOpacity
      style={[
        styles.yearCard,
        {
          backgroundColor: selectedYear?.value === item.value ? colors.tabColor : colors.background,
          borderColor: selectedYear?.value === item.value ? colors.tabColor : colors.border,
          shadowColor: colors.mainFont,
        },
      ]}
      onPress={() => onYearSelect(item)}
    >
      <Text
        style={[
          styles.yearText,
          {
            color: selectedYear?.value === item.value ? '#FFFFFF' : colors.mainFont,
          },
        ]}
      >
        {item.text}
      </Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={studyYears}
      renderItem={renderYearItem}
      keyExtractor={(year) => year.value}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.yearsList}
      contentContainerStyle={styles.yearsListContent}
    />
  );
}

const styles = StyleSheet.create({
  yearsList: {
    marginBottom: 10,
  },
  yearsListContent: {
    paddingHorizontal: 4,
  },
  yearCard: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    marginRight: 12,
    minWidth: 140,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  yearText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
