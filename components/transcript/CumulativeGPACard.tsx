import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getCumulativeGPAColor } from '@/utils/gradingColors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GradingInfoModal from './GradingInfoModal';
import { TranscriptData } from './types';

interface CumulativeGPACardProps {
  transcriptData: TranscriptData;
}

export default function CumulativeGPACard({ transcriptData }: CumulativeGPACardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showGradingInfo, setShowGradingInfo] = useState(false);
  
  // Get GPA color based on official GUC ranges for cumulative GPA
  const gpaColor = getCumulativeGPAColor(transcriptData.cumulativeGPA, colors);
  
  return (
    <>
      <View style={[styles.cumulativeGPACard, { 
        backgroundColor: gpaColor,
        shadowColor: colors.mainFont 
      }]}>
        <View style={styles.gpaHeader}>
          <View style={styles.titleRow}>
            <Text style={[styles.cumulativeGPATitle, { color: '#FFFFFF' }]}>
              Cumulative GPA
            </Text>
            <TouchableOpacity 
              onPress={() => setShowGradingInfo(true)}
              style={styles.infoButton}
            >
              <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
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
      
      <GradingInfoModal 
        visible={showGradingInfo} 
        onClose={() => setShowGradingInfo(false)} 
      />
    </>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cumulativeGPATitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  infoButton: {
    marginLeft: 8,
    padding: 4,
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
