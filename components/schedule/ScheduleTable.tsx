import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScheduleDayView } from './ScheduleDayView';
import { ScheduleDay } from './types';

interface ScheduleTableProps {
  scheduleData: ScheduleDay[];
}

export function ScheduleTable({ scheduleData }: ScheduleTableProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];



  // Fallback if no data
  if (!scheduleData || scheduleData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>No schedule data available</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.pagerView}
      >
        {scheduleData.map((day, index) => (
          <View key={day.dayName} style={{ width: screenWidth }}>
            <ScheduleDayView 
              day={day} 
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
