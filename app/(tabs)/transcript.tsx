import {
  CumulativeGPACard,
  EmptyState,
  LoadingIndicator,
  SemesterTable,
  YearSelector,
} from '@/components/transcript';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranscript } from '@/hooks/useTranscript';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function TranscriptScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.mainFont }]}>Transcript</Text>
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
        <View style={styles.section}>
          <View style={[styles.selectedYearContainer, { 
            backgroundColor: colors.background, 
            borderColor: colors.border,
            shadowColor: colors.mainFont 
          }]}>
            <Text style={[styles.selectedYearTitle, { color: colors.mainFont }]}>
              {selectedYear.text}
            </Text>
            
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
                
                {/* Cumulative GPA */}
                <CumulativeGPACard transcriptData={parsedTranscript} />
              </View>
            ) : (
              <Text style={[styles.selectedYearSubtitle, { color: colors.secondaryFont }]}>
                Select a study year to view transcript
              </Text>
            )}
          </View>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
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
  selectedYearContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedYearTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
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
  },
});