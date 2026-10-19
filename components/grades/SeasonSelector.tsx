import { DropdownItem, DropdownMenu, DropdownTrigger, sheetRatioFor } from '@/components/ui/Dropdown';
import { Colors } from '@/constants/Colors';
import { Spacing, Type } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Season, YearGroup } from './types';

interface SeasonSelectorProps {
  yearGroups: YearGroup[];
  selectedSeason: Season | null;
  onSeasonSelect: (season: Season) => void;
}

/** Semester picker: a select field that opens a sheet grouped by year. */
export default function SeasonSelector({ yearGroups, selectedSeason, onSeasonSelect }: SeasonSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [open, setOpen] = useState(false);

  const seasonCount = yearGroups.reduce((n, g) => n + g.seasons.length, 0);

  return (
    <>
      <DropdownTrigger
        colors={colors}
        caption="Semester"
        icon="calendar-outline"
        label={selectedSeason ? selectedSeason.text : 'Choose a semester'}
        placeholder={!selectedSeason}
        onPress={() => setOpen(true)}
      />

      <DropdownMenu
        colors={colors}
        visible={open}
        onClose={() => setOpen(false)}
        title="Choose semester"
        subtitle={`${seasonCount} semester${seasonCount === 1 ? '' : 's'} with grades`}
        heightRatio={sheetRatioFor(seasonCount + yearGroups.length * 0.8, 54, 110)}
      >
        {yearGroups.map((group) => (
          <View key={group.year} style={styles.group}>
            <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{group.year}</Text>
            {group.seasons.map((season) => (
              <DropdownItem
                key={season.value}
                colors={colors}
                label={season.text}
                selected={selectedSeason?.value === season.value}
                onPress={() => {
                  setOpen(false);
                  onSeasonSelect(season);
                }}
              />
            ))}
          </View>
        ))}
      </DropdownMenu>
    </>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: Spacing.sm,
  },
  groupTitle: {
    ...Type.overline,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
});
