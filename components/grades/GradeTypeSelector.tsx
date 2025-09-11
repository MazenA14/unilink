import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GradeType } from './types';

interface GradeTypeSelectorProps {
  gradeType: GradeType;
  onGradeTypeChange: (type: GradeType) => void;
}

export default function GradeTypeSelector({ gradeType, onGradeTypeChange }: GradeTypeSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.gradeTypeSelector}>
      <TouchableOpacity
        style={[
          styles.gradeTypeButton,
          {
            backgroundColor: gradeType === 'current' ? colors.tint : (colorScheme === 'dark' ? '#232323' : '#f3f3f3'),
            borderColor: gradeType === 'current' ? colors.tabColor : colors.border,
          },
        ]}
        onPress={() => onGradeTypeChange('current')}
      >
        <Text
          style={[
            styles.gradeTypeButtonText,
            {
              color: gradeType === 'current' ? (colorScheme === 'dark' ? '#000000' : '#FFFFFF') : colors.mainFont,
            },
          ]}
        >
          Current Grades
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.gradeTypeButton,
          {
            backgroundColor: gradeType === 'previous' ? colors.tint : (colorScheme === 'dark' ? '#232323' : '#f3f3f3'),
            borderColor: gradeType === 'previous' ? colors.tabColor : colors.border,
          },
        ]}
        onPress={() => onGradeTypeChange('previous')}
      >
        <Text
          style={[
            styles.gradeTypeButtonText,
            {
              color: gradeType === 'previous' ? (colorScheme === 'dark' ? '#000000' : '#FFFFFF') : colors.mainFont,
            },
          ]}
        >
          Previous Grades
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  gradeTypeSelector: {
    flexDirection: 'row',
    marginVertical: 16,
    marginHorizontal: -4,
  },
  gradeTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginHorizontal: 4,
  },
  gradeTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
