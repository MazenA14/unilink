import { StudyYear, TranscriptData } from '@/components/transcript/types';
import { GradeCache } from '@/utils/gradeCache';
import { GUCAPIProxy as GUCAPI } from '@/utils/gucApiProxy';
import { parseTranscriptHTML } from '@/utils/parsers/transcriptParser';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export function useTranscript() {
  // State management
  const [studyYears, setStudyYears] = useState<StudyYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<StudyYear | null>(null);
  const [parsedTranscript, setParsedTranscript] = useState<TranscriptData | null>(null);
  
  // Loading states
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load study years on component mount
  useEffect(() => {
    loadStudyYears();
  }, []);

  const loadStudyYears = async (forceRefresh: boolean = false) => {
    try {
      setLoadingYears(true);
      
      // Try to get cached study years first (unless force refresh)
      if (!forceRefresh) {
        const cachedYears = await GradeCache.getCachedStudyYears();
        if (cachedYears && cachedYears.length > 0) {
          setStudyYears(cachedYears);
          setLoadingYears(false);
          return;
        }
      }
      
      const fetchedYears = await GUCAPI.getAvailableStudyYears();
      
      // Cache the fetched years
      await GradeCache.setCachedStudyYears(fetchedYears);
      
      setStudyYears(fetchedYears);
      
    } catch (error: any) {
      Alert.alert(
        'Error',
        `Failed to load study years: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingYears(false);
    }
  };

  const handleYearSelect = async (year: StudyYear) => {
    
    setSelectedYear(year);
    setParsedTranscript(null); // Clear previous data
    
    try {
      setLoadingTranscript(true);
      
      // Try to get cached transcript data first
      const cachedTranscript = await GradeCache.getCachedTranscriptData(year.value);
      if (cachedTranscript) {
        setParsedTranscript(cachedTranscript);
        setLoadingTranscript(false);
        return;
      } else {
      }
      
      
      // Call the existing getTranscriptData function
      const transcriptData = await GUCAPI.getTranscriptData(year.value);
      
      
      if (transcriptData && transcriptData.html) {
      }
      
      if (transcriptData && transcriptData.body) {
      }
      
      
      // Parse the HTML content
      const htmlContent = transcriptData.html || transcriptData.body;
      if (htmlContent) {
        const parsed = parseTranscriptHTML(htmlContent);
        
        // Cache the parsed transcript data
        await GradeCache.setCachedTranscriptData(year.value, parsed);
        
        setParsedTranscript(parsed);
      }
      
    } catch (error: any) {
      
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
          `Failed to load transcript data: ${errorMessage}`,
          [{ 
            text: 'OK',
            onPress: () => {
            }
          }]
        );
      }
    } finally {
      setLoadingTranscript(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Clear transcript cache on refresh to ensure fresh data
    await GradeCache.clearAllTranscriptCache();
    
    await loadStudyYears(true);
    setRefreshing(false);
  }, []);

  return {
    // State
    studyYears,
    selectedYear,
    parsedTranscript,
    loadingYears,
    loadingTranscript,
    refreshing,
    
    // Actions
    handleYearSelect,
    onRefresh,
  };
}
