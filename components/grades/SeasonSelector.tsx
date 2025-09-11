import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Season, YearGroup } from './types';

interface SeasonSelectorProps {
  yearGroups: YearGroup[];
  selectedSeason: Season | null;
  onSeasonSelect: (season: Season) => void;
}

export default function SeasonSelector({ yearGroups, selectedSeason, onSeasonSelect }: SeasonSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const renderSeasonItem = ({ item }: { item: Season }) => (
    <TouchableOpacity
      style={[
        styles.seasonCard,
        {
          backgroundColor: selectedSeason?.value === item.value ? colors.tint : (colorScheme === 'dark' ? '#232323' : '#f3f3f3'),
          borderColor: selectedSeason?.value === item.value ? colors.tabColor : colors.border,
        },
      ]}
      onPress={() => onSeasonSelect(item)}
    >
      <Text
        style={[
          styles.seasonText,
          {
            color: selectedSeason?.value === item.value ? (colorScheme === 'dark' ? '#000000' : '#FFFFFF') : colors.mainFont,
          },
        ]}
      >
        {item.text}
      </Text>
    </TouchableOpacity>
  );

  const renderYearGroup = ({ item }: { item: YearGroup }) => (
    <View style={styles.yearGroup}>
      <Text style={[styles.yearTitle, { color: colors.text }]}>{item.year}</Text>
      <FlatList
        data={item.seasons}
        renderItem={renderSeasonItem}
        keyExtractor={(season) => season.value}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.seasonsList}
        contentContainerStyle={styles.seasonsListContent}
      />
    </View>
  );

  return (
    <FlatList
      data={yearGroups}
      renderItem={renderYearGroup}
      keyExtractor={(item) => item.year}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  yearGroup: {
    marginBottom: 24,
  },
  yearTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  seasonsList: {
    marginBottom: 8,
  },
  seasonsListContent: {
    paddingHorizontal: 4,
  },
  seasonCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  seasonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
