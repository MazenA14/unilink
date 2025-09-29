import { Colors, ScheduleTypeColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScheduleType } from './types';

interface ScheduleTypeSelectorProps {
  scheduleType: ScheduleType;
  onScheduleTypeChange: (type: ScheduleType) => void;
}

const scheduleTypeConfig = {
  personal: { label: 'Personal', icon: '👤' },
  staff: { label: 'Staff', icon: '👨‍🏫' },
  course: { label: 'Course', icon: '📚' },
};

export function ScheduleTypeSelector({ scheduleType, onScheduleTypeChange }: ScheduleTypeSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.scheduleTypeSelector}>
      {Object.entries(scheduleTypeConfig).map(([type, config]) => {
        const isActive = scheduleType === type;
        const typeColor = ScheduleTypeColors[type as ScheduleType];
        
        return (
          <TouchableOpacity
            key={type}
            style={[
              styles.scheduleTypeButton,
              {
                backgroundColor: isActive ? typeColor : (colorScheme === 'dark' ? '#232323' : '#f3f3f3'),
                borderColor: isActive ? typeColor : colors.border,
              },
            ]}
            onPress={() => onScheduleTypeChange(type as ScheduleType)}
          >
            <Text style={styles.scheduleTypeIcon}>{config.icon}</Text>
            <Text
              style={[
                styles.scheduleTypeButtonText,
                {
                  color: isActive ? (colorScheme === 'dark' ? '#000000' : '#FFFFFF') : colors.mainFont,
                },
              ]}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scheduleTypeSelector: {
    flexDirection: 'row',
    marginVertical: 16,
    marginHorizontal: -2,
  },
  scheduleTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  scheduleTypeIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  scheduleTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
