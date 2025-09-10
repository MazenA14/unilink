import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GUCAPIProxy as GUCAPI } from '@/utils/gucApiProxy';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface StudyYear {
  value: string;
  text: string;
}


export default function TranscriptScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // State management
  const [studyYears, setStudyYears] = useState<StudyYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<StudyYear | null>(null);
  
  // Loading states
  const [loadingYears, setLoadingYears] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load study years on component mount
  useEffect(() => {
    loadStudyYears();
  }, []);


  const loadStudyYears = async (forceRefresh: boolean = false) => {
    try {
      setLoadingYears(true);
      
      console.log('Loading study years from API with server overload bypass...');
      const fetchedYears = await GUCAPI.getAvailableStudyYears();
      
      setStudyYears(fetchedYears);
      
    } catch (error: any) {
      console.error('Error loading study years:', error);
      
      const errorMessage = error?.message || 'Unknown error occurred';
      
      if (errorMessage.includes('Session expired') || errorMessage.includes('login')) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Navigate back to login screen
                // You can implement navigation logic here
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          `Failed to load study years: ${errorMessage}`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoadingYears(false);
    }
  };


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Force refresh from API (bypass cache)
    await loadStudyYears(true);
    setRefreshing(false);
  }, []);

  const handleYearSelect = (year: StudyYear) => {
    setSelectedYear(year);
  };

  const renderYearItem = ({ item }: { item: StudyYear }) => (
    <TouchableOpacity
      style={[
        styles.yearCard,
        {
          backgroundColor: selectedYear?.value === item.value ? colors.tint : colors.background,
          borderColor: colors.border,
        },
      ]}
      onPress={() => handleYearSelect(item)}
    >
      <Text
        style={[
          styles.yearText,
          {
            color: selectedYear?.value === item.value ? colors.background : colors.text,
          },
        ]}
      >
        {item.text}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Transcript</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          View your academic transcript by study year
        </Text>
      </View>

      {/* Study Years Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Study Year</Text>
        {loadingYears ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.tabIconDefault }]}>
              {refreshing ? 'Refreshing...' : 'Loading study years...'}
            </Text>
          </View>
        ) : studyYears.length > 0 ? (
          <FlatList
            data={studyYears}
            renderItem={renderYearItem}
            keyExtractor={(year) => year.value}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.yearsList}
            contentContainerStyle={styles.yearsListContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Study Years Available</Text>
            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
              No study years were found in your transcript.
            </Text>
          </View>
        )}
      </View>

      {/* Selected Year Display */}
      {selectedYear && (
        <View style={styles.section}>
          <View style={styles.selectedYearContainer}>
            <Text style={[styles.selectedYearTitle, { color: colors.text }]}>
              Selected Year: {selectedYear.text}
            </Text>
            <Text style={[styles.selectedYearSubtitle, { color: colors.tabIconDefault }]}>
              Transcript functionality coming soon
            </Text>
          </View>
        </View>
      )}

      {/* Coming Soon Section for when no year is selected */}
      {!selectedYear && (
        <View style={styles.comingSoonContainer}>
          <Text style={[styles.comingSoonTitle, { color: colors.text }]}>
            Select a Study Year
          </Text>
          <Text style={[styles.comingSoonText, { color: colors.tabIconDefault }]}>
            Choose a study year from the list above to view your detailed academic transcript, including GPA, credits, and course history.
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  yearsList: {
    marginBottom: 10,
  },
  yearsListContent: {
    paddingHorizontal: 4,
  },
  yearCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  yearText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  selectedYearContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  selectedYearTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
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
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
