import { Colors } from '@/constants/Colors';
import { Radius } from '@/constants/Theme';
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
            backgroundColor: gradeType === 'current' ? colors.tint : (colors.surface),
            borderColor: gradeType === 'current' ? colors.tabColor : colors.border,
          },
        ]}
        onPress={() => onGradeTypeChange('current')}
      >
        <Text
          style={[
            styles.gradeTypeButtonText,
            {
              color: gradeType === 'current' ? colors.onPrimary : colors.mainFont,
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
            backgroundColor: gradeType === 'previous' ? colors.tint : (colors.surface),
            borderColor: gradeType === 'previous' ? colors.tabColor : colors.border,
          },
        ]}
        onPress={() => onGradeTypeChange('previous')}
      >
        <Text
          style={[
            styles.gradeTypeButtonText,
            {
              color: gradeType === 'previous' ? colors.onPrimary : colors.mainFont,
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
    borderRadius: Radius.md,
    borderWidth: 2,
    marginHorizontal: 4,
  },
  gradeTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
