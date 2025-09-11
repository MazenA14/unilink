import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface LoadingIndicatorProps {
  message: string;
}

export default function LoadingIndicator({ message }: LoadingIndicatorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.tabColor} />
      <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});
