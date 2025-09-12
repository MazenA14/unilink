import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useRef } from 'react';
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
  const scrollViewRef = useRef<ScrollView>(null);
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

  // Get current day and scroll to it
  const getCurrentDayIndex = () => {
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[today.getDay()];
    
    // Find the index of current day in ordered days
    const currentDayIndex = orderedDays.findIndex(day => day.dayName === currentDayName);
    
    // If current day is not found (e.g., Friday is filtered out), default to first day
    return currentDayIndex >= 0 ? currentDayIndex : 0;
  };

  // Scroll to current day when component mounts or data changes
  useEffect(() => {
    if (orderedDays.length > 0 && scrollViewRef.current) {
      const currentDayIndex = getCurrentDayIndex();
      const scrollX = currentDayIndex * screenWidth;
      
      // Use setTimeout to ensure the ScrollView is fully rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: scrollX, animated: false });
      }, 100);
    }
  }, [orderedDays, screenWidth]);

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
        ref={scrollViewRef}
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
