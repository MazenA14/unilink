import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TranscriptData } from './types';

interface CumulativeGPACardProps {
  transcriptData: TranscriptData;
}

export default function CumulativeGPACard({ transcriptData }: CumulativeGPACardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <View style={[styles.cumulativeGPACard, { 
      backgroundColor: colors.tabColor,
      shadowColor: colors.mainFont 
    }]}>
      <View style={styles.gpaHeader}>
        <Text style={[styles.cumulativeGPATitle, { color: '#FFFFFF' }]}>
          Cumulative GPA
        </Text>
        <Text style={[styles.cumulativeGPAText, { color: '#FFFFFF' }]}>
          {transcriptData.studyGroup}
        </Text>
      </View>
      <View style={styles.gpaValue}>
        <Text style={[styles.cumulativeGPANumber, { color: '#FFFFFF' }]}>
          {transcriptData.cumulativeGPA}
        </Text>
      </View>
      <Text style={[styles.cumulativeGPADate, { color: '#FFFFFF' }]}>
        Updated {transcriptData.date}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cumulativeGPACard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  gpaHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cumulativeGPATitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  cumulativeGPAText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
  },
  gpaValue: {
    marginBottom: 12,
  },
  cumulativeGPANumber: {
    fontSize: 48,
    fontWeight: '800',
  },
  cumulativeGPADate: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
});
