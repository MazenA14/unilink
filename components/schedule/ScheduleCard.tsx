import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScheduleClass } from './types';

interface ScheduleCardProps {
  classData: ScheduleClass;
  periodName: string;
}

export function ScheduleCard({ classData, periodName }: ScheduleCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { 
      backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3',
      borderColor: colors.border,
      borderTopRightRadius: 16,
      borderBottomRightRadius: 16,
    }]}>
      <Text style={[styles.periodName, { color: colors.tint }]}>{periodName}</Text>
      <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={2}>
        {classData.courseName}
      </Text>
      {classData.instructor && (
        <Text style={[styles.instructor, { color: colors.secondaryFont }]} numberOfLines={1}>
          {classData.instructor}
        </Text>
      )}
      {classData.room && (
        <Text style={[styles.room, { color: colors.secondaryFont }]} numberOfLines={1}>
          📍 {classData.room}
        </Text>
      )}
      {classData.time && (
        <Text style={[styles.time, { color: colors.secondaryFont }]} numberOfLines={1}>
          🕐 {classData.time}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderWidth: 1,
    minHeight: 80,
    flex: 1,
  },
  periodName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  courseName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  instructor: {
    fontSize: 12,
    marginBottom: 2,
  },
  room: {
    fontSize: 12,
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
  },
});
