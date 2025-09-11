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
          backgroundColor: selectedYear?.value === item.value ? colors.tabColor : (colorScheme === 'dark' ? '#232323' : '#f3f3f3'),
          borderColor: selectedYear?.value === item.value ? colors.tabColor : colors.border,
        },
      ]}
      onPress={() => onYearSelect(item)}
    >
      <Text
        style={[
          styles.yearText,
          {
            color: selectedYear?.value === item.value ? (colorScheme === 'dark' ? '#000000' : '#FFFFFF') : colors.mainFont,
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
  },
  yearText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
