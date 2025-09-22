import {
    EmptyState,
    LoadingIndicator,
    SemesterTable,
    YearSelector,
} from '@/components/transcript';
import GradingInfoModal from '@/components/transcript/GradingInfoModal';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranscript } from '@/hooks/useTranscript';
import { getCumulativeGPAColor } from '@/utils/gradingColors';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Utility function to format year text to "23/24" format
const formatYearToShort = (yearText: string): string => {
  // Extract years from various formats like "2023/2024", "2023-2024", "Fall 2023", etc.
  const yearMatch = yearText.match(/(\d{4})/g);
  
  if (yearMatch && yearMatch.length >= 1) {
    const firstYear = yearMatch[0];
    const firstYearShort = firstYear.slice(-2); // Get last 2 digits
    
    if (yearMatch.length >= 2) {
      // Two years found (e.g., "2023/2024")
      const secondYear = yearMatch[1];
      const secondYearShort = secondYear.slice(-2);
      return `${firstYearShort}/${secondYearShort}`;
    } else {
      // Single year found, assume next year
      const nextYear = (parseInt(firstYear) + 1).toString().slice(-2);
      return `${firstYearShort}/${nextYear}`;
    }
  }
  
  // Fallback: return original text if no year pattern found
  return yearText;
};

export default function TranscriptScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showGradingInfo, setShowGradingInfo] = useState(false);
  
  const {
    studyYears,
    selectedYear,
    parsedTranscript,
    loadingYears,
    loadingTranscript,
    refreshing,
    handleYearSelect,
    onRefresh,
  } = useTranscript();


  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.mainFont }]}>Transcript</Text>
        <TouchableOpacity 
          onPress={() => setShowGradingInfo(true)}
          style={styles.gradingInfoButton}
        >
          <Ionicons name="information-circle-outline" size={27} color={colors.tint} />
        </TouchableOpacity>
      </View>

      {/* Study Years Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>Select Study Year</Text>
        {loadingYears ? (
          <LoadingIndicator message={refreshing ? 'Refreshing...' : 'Loading study years...'} />
        ) : studyYears.length > 0 ? (
          <YearSelector
            studyYears={studyYears}
            selectedYear={selectedYear}
            onYearSelect={handleYearSelect}
          />
        ) : (
          <EmptyState
            title="No Study Years Available"
            message="No study years were found in your transcript."
          />
        )}
      </View>

      {/* Selected Year Display */}
      {selectedYear && (
        <View style={styles.transcriptSection}>
          {/* Header with Season Title and GPAs */}
          <View style={[styles.seasonHeader, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}>
            <View style={styles.seasonTitleContainer}>
              <Text style={[styles.seasonLabel, { color: colors.secondaryFont }]}>Academic Year</Text>
              <Text style={[styles.selectedYearTitle, { color: colors.mainFont }]}>
                {formatYearToShort(selectedYear.text)}
              </Text>
              {parsedTranscript?.date && (
                <Text style={[styles.updatedDate, { color: colors.secondaryFont }]}>
                  Updated {parsedTranscript.date}
                </Text>
              )}
            </View>
            <View style={styles.gpaContainer}>
              <View style={[styles.gpaCard, { backgroundColor: parsedTranscript?.cumulativeGPA ? getCumulativeGPAColor(parsedTranscript.cumulativeGPA, colors) : colors.tabColor }]}>
                <View style={styles.gpaHeader}>
                  <Text style={[styles.gpaLabel, { color: '#FFFFFF' }]}>Cumulative GPA</Text>
                </View>
                <Text style={[styles.gpaValue, { color: '#FFFFFF' }]}>
                  {parsedTranscript?.cumulativeGPA || '--'}
                </Text>
              </View>
            </View>
          </View>
          
          {loadingTranscript ? (
            <LoadingIndicator message="Loading transcript data..." />
          ) : parsedTranscript ? (
            <View style={styles.transcriptContainer}>
              {/* Transcript Tables */}
              <View style={styles.tablesContainer}>
                {parsedTranscript.semesters.map((semester, index) => (
                  <SemesterTable key={index} semester={semester} index={index} />
                ))}
              </View>
            </View>
          ) : (
            <Text style={[styles.selectedYearSubtitle, { color: colors.secondaryFont }]}>
              Select a study year to view transcript
            </Text>
          )}
        </View>
      )}

      {/* Coming Soon Section for when no year is selected */}
      {!selectedYear && (
        <View style={styles.comingSoonContainer}>
          <Text style={[styles.comingSoonTitle, { color: colors.mainFont }]}>
            Select a Study Year
          </Text>
          <Text style={[styles.comingSoonText, { color: colors.secondaryFont }]}>
            Choose a study year from above to view your detailed academic transcript
          </Text>
        </View>
      )}
      
      <GradingInfoModal 
        visible={showGradingInfo} 
        onClose={() => setShowGradingInfo(false)} 
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  gradingInfoButton: {
    padding: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  transcriptSection: {
    marginHorizontal: 4,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  selectedYearTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  seasonLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    opacity: 0.8,
  },
  updatedDate: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
    opacity: 0.7,
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  seasonTitleContainer: {
    flex: 1,
    paddingRight: 16,
  },
  gpaContainer: {
    flexDirection: 'column',
    gap: 6,
  },
  gpaCard: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    minWidth: 75,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  gpaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gpaLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.9,
    textAlign: 'center',
  },
  infoButton: {
    marginLeft: 4,
    padding: 2,
  },
  gpaValue: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectedYearSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  comingSoonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  transcriptContainer: {
    marginTop: 16,
    width: '100%',
  },
  tablesContainer: {
    marginBottom: 20,
    width: '100%',
  },
});