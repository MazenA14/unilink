import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { ThemePreference, useTheme } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function ThemeSelector() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { themePreference, setThemePreference } = useTheme();

  const themeOptions: { value: ThemePreference; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: 'sun.max' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'system', label: 'System', icon: 'gear' },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.mainFont }]}>Theme</Text>
      <View style={styles.optionsContainer}>
        {themeOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              { 
                backgroundColor: colors.background,
                borderColor: themePreference === option.value ? colors.tabColor : colors.secondaryFont,
              },
              themePreference === option.value && { borderWidth: 2 }
            ]}
            onPress={() => setThemePreference(option.value)}
          >
            <IconSymbol 
              name={option.icon} 
              size={24} 
              color={themePreference === option.value ? colors.tabColor : colors.secondaryFont} 
            />
            <Text style={[
              styles.optionText, 
              { 
                color: themePreference === option.value ? colors.tabColor : colors.mainFont 
              }
            ]}>
              {option.label}
            </Text>
            {themePreference === option.value && (
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.tabColor} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
});
