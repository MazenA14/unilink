import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScheduleDayView } from './ScheduleDayView';
import { ScheduleDay, ScheduleType } from './types';

interface ScheduleTableProps {
  scheduleData: ScheduleDay[];
  scheduleType?: ScheduleType;
}

export function ScheduleTable({ scheduleData, scheduleType = 'personal' }: ScheduleTableProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];



  const screenWidth = Dimensions.get('window').width;

  // Normalize day ordering to Saturday–Thursday (filter out Friday if present)
  const orderedDays = React.useMemo(() => {
    const order = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const indexByDay: Record<string, number> = order.reduce((acc, day, idx) => {
      acc[day] = idx;
      return acc;
    }, {} as Record<string, number>);

    return (scheduleData ?? [])
      .filter((d) => d.dayName !== 'Friday')
      .slice()
      .sort((a, b) => {
        const ai = indexByDay[a.dayName] ?? 999;
        const bi = indexByDay[b.dayName] ?? 999;
        return ai - bi;
      });
  }, [scheduleData]);

  // Fallback if no data
  if (!orderedDays || orderedDays.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>No schedule data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.pagerView}
      >
        {orderedDays.map((day, index) => (
          <View key={day.dayName} style={{ width: screenWidth }}>
            <ScheduleDayView 
              day={day} 
              scheduleType={scheduleType}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pagerView: {
    flex: 1,
  },
});
