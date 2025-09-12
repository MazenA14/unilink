import { Colors, ScheduleColors, ScheduleTypeColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScheduleClass, ScheduleType } from './types';

interface ScheduleCardProps {
  classData: ScheduleClass;
  periodName: string;
  scheduleType?: ScheduleType;
}

export function ScheduleCard({ classData, periodName, scheduleType = 'personal' }: ScheduleCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scheduleColors = ScheduleColors[colorScheme ?? 'light'];
  const typeColor = ScheduleTypeColors[scheduleType];

  const renderTypeSpecificInfo = () => {
    switch (scheduleType) {
      case 'staff':
        return (
          <>
            {classData.officeHours && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                🏢 Office: {classData.officeHours}
              </Text>
            )}
          </>
        );
      case 'course':
        return (
          <>
            {classData.enrollmentCount && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                👥 Students: {classData.enrollmentCount}
              </Text>
            )}
            {classData.credits && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                📊 Credits: {classData.credits}
              </Text>
            )}
          </>
        );
      case 'group':
        return (
          <>
            {classData.groupSize && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                👥 Group Size: {classData.groupSize}
              </Text>
            )}
            {classData.department && (
              <Text style={[styles.additionalInfo, { color: colors.secondaryFont }]} numberOfLines={1}>
                🏛️ {classData.department}
              </Text>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: scheduleColors.periodLabelBg,
      borderColor: typeColor + '40',
      borderTopRightRadius: 16,
      borderBottomRightRadius: 16,
      borderLeftWidth: 3,
      borderLeftColor: typeColor,
    }]}>
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
      {renderTypeSpecificInfo()}
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
  additionalInfo: {
    fontSize: 12,
    marginTop: 2,
  },
});
