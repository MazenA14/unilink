import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { ScheduleCard } from './ScheduleCard';
import { ScheduleDay } from './types';

interface ScheduleDayViewProps {
  day: ScheduleDay;
}

export function ScheduleDayView({ day }: ScheduleDayViewProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const screenWidth = Dimensions.get('window').width;
  
  
  // Calculate dynamic padding based on screen width
  const basePadding = Math.max(12, screenWidth * 0.04);
  const dayPadding = basePadding;

  const periods = [
    { key: 'first', name: 'First Period' },
    { key: 'second', name: 'Second Period' },
    { key: 'third', name: 'Third Period' },
    { key: 'fourth', name: 'Fourth Period' },
    { key: 'fifth', name: 'Fifth Period' },
  ] as const;

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.background,
        paddingHorizontal: dayPadding,
      }
    ]}>
      {/* Day Header */}
      <View style={styles.dayHeader}>
        <View style={[styles.dayTitlePill, { backgroundColor: colors.tint }]}>
          <Text style={[styles.dayTitle, { color: colors.background }]}>{day.dayName}</Text>
        </View>
      </View>
      
      {/* Periods List */}
      <View style={styles.periodsContainer}>
        {periods.map((period) => {
          const classData = day.periods[period.key];
          return (
            <View key={period.key} style={[styles.periodRow, { 
              backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3',
              borderColor: colors.border,
              borderRadius: 16,
            }]}>
              <View style={[styles.periodLabel, { 
                backgroundColor: colors.tint + '20', 
                borderColor: colors.tint + '40',
                borderTopLeftRadius: 16,
                borderBottomLeftRadius: 16,
              }]}>
                <Text style={[styles.periodLabelText, { color: colors.tint }]}>{period.name}</Text>
              </View>
              <View style={styles.periodContent}>
                {classData ? (
                  <ScheduleCard classData={classData} periodName={period.name} />
                ) : (
                  <View style={[styles.emptyPeriod, { 
                    backgroundColor: colors.tint + '15', 
                    borderColor: colors.tint + '30',
                    borderTopRightRadius: 16,
                    borderBottomRightRadius: 16,
                  }]}>
                    <Text style={[styles.emptyText, { color: colors.tint }]}>Free</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  dayHeader: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTitlePill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  periodsContainer: {
    flex: 1,
    padding: 12,
  },
  periodRow: {
    flexDirection: 'row',
    marginBottom: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  periodLabel: {
    width: 100,
    padding: 8,
    borderRightWidth: 1,
    justifyContent: 'center',
  },
  periodLabelText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  periodContent: {
    flex: 1,
    padding: 8,
  },
  emptyPeriod: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 14,
    minHeight: 70,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '500',
  },
});
