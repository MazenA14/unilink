import {
    EmptyState,
    LoadingIndicator,
    SemesterTable,
    YearSelector,
} from '@/components/transcript';
import { AppBar } from '@/components/navigation/AppBar';
import GradingInfoModal from '@/components/transcript/GradingInfoModal';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranscript } from '@/hooks/useTranscript';
import { getCumulativeGPAColor } from '@/utils/gradingColors';
import Ionicons from '@expo/vector-icons/Ionicons';
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
    maintenanceMessage,
    evaluationRequiredMessage,
    loadingYears,
    loadingTranscript,
    refreshing,
    handleYearSelect,
    onRefresh,
  } = useTranscript();


  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar
        title="Transcript"
        large
        rightActions={
          <TouchableOpacity
            onPress={() => setShowGradingInfo(true)}
            style={[styles.appBarAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityLabel="Grading info"
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.mainFont} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      {/* Header */}
      <View style={styles.header}>

        {/* Maintenance banner (shown when GUC redirects to the maintenance page) */}
        {maintenanceMessage && (
          <View
            style={[
              styles.maintenanceBanner,
              {
                backgroundColor: colors.warningSoft,
                borderColor: colors.warning,
              },
            ]}
          >
            <Ionicons name="construct-outline" size={20} color={colors.warning} style={styles.maintenanceIcon} />
            <Text style={[styles.maintenanceText, { color: colors.mainFont }]}>
              {maintenanceMessage}
            </Text>
          </View>
        )}

        {/* Evaluation-required banner (shown when a pending evaluation blocks the transcript) */}
        {evaluationRequiredMessage && (
          <View
            style={[
              styles.maintenanceBanner,
              {
                backgroundColor: colors.infoSoft,
                borderColor: colors.info,
              },
            ]}
          >
            <Ionicons name="clipboard-outline" size={20} color={colors.info} style={styles.maintenanceIcon} />
            <Text style={[styles.maintenanceText, { color: colors.mainFont }]}>
              {evaluationRequiredMessage}
            </Text>
          </View>
        )}

        {/* Study Years Section Title */}
        <View style={styles.headerSection}>
          <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>Select Study Year</Text>
        </View>
      </View>

      {/* Study Years Section */}
      <View style={styles.section}>
        {loadingYears ? (
          <LoadingIndicator message={refreshing ? 'Refreshing...' : 'Loading study years...'} />
        ) : studyYears.length > 0 ? (
          <YearSelector
            studyYears={studyYears}
            selectedYear={selectedYear}
            onYearSelect={handleYearSelect}
          />
        ) : maintenanceMessage || evaluationRequiredMessage ? null : (
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
          <View style={[styles.seasonHeader, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 4,
  },
  appBarAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
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
    // marginBottom: 20,
  },
  maintenanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  maintenanceIcon: {
    marginRight: 10,
  },
  maintenanceText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  headerSection: {
    // No horizontal margins since it's inside the header which already has padding
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 11,
    marginBottom: 12,
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: Radius.lg,
    borderWidth: 1,
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