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
(`Loaded ${cachedYears.length} study years from cache`);
          setStudyYears(cachedYears);
          setLoadingYears(false);
          return;
        }
      }
      
('Loading study years from API...');
      const fetchedYears = await GUCAPI.getAvailableStudyYears();
      
      // Cache the fetched years
      await GradeCache.setCachedStudyYears(fetchedYears);
      
      setStudyYears(fetchedYears);
(`Loaded ${fetchedYears.length} study years from API and cached`);
      
    } catch (error: any) {
('Failed to load study years:', error);
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
('=== YEAR SELECTED ===');
('Selected year:', year);
('Year value:', year.value);
('Year text:', year.text);
    
    setSelectedYear(year);
    setParsedTranscript(null); // Clear previous data
    
    try {
      setLoadingTranscript(true);
('=== LOADING TRANSCRIPT DATA ===');
      
      // Try to get cached transcript data first
(`Checking cache for study year: "${year.value}"`);
      const cachedTranscript = await GradeCache.getCachedTranscriptData(year.value);
      if (cachedTranscript) {
('=== LOADED TRANSCRIPT FROM CACHE ===');
('Cached transcript data:', cachedTranscript);
        setParsedTranscript(cachedTranscript);
        setLoadingTranscript(false);
        return;
      } else {
('=== NO CACHED TRANSCRIPT FOUND, FETCHING FROM API ===');
      }
      
(`Calling GUCAPI.getTranscriptData with year value: "${year.value}"`);
      
      // Call the existing getTranscriptData function
      const transcriptData = await GUCAPI.getTranscriptData(year.value);
      
('=== TRANSCRIPT DATA LOADED SUCCESSFULLY ===');
('Raw transcript data received:', transcriptData);
('Data type:', typeof transcriptData);
('Data keys:', transcriptData ? Object.keys(transcriptData) : 'No keys (null/undefined)');
      
      if (transcriptData && transcriptData.html) {
('HTML content length:', transcriptData.html.length);
('HTML preview (first 500 chars):', transcriptData.html.substring(0, 500));
      }
      
      if (transcriptData && transcriptData.body) {
('Body content length:', transcriptData.body.length);
('Body preview (first 500 chars):', transcriptData.body.substring(0, 500));
      }
      
('=== TRANSCRIPT DATA SET IN STATE ===');
      
      // Parse the HTML content
      const htmlContent = transcriptData.html || transcriptData.body;
      if (htmlContent) {
        const parsed = parseTranscriptHTML(htmlContent);
        
        // Cache the parsed transcript data
(`Caching transcript data for year: "${year.value}"`);
        await GradeCache.setCachedTranscriptData(year.value, parsed);
('=== TRANSCRIPT DATA CACHED SUCCESSFULLY ===');
        
        setParsedTranscript(parsed);
('=== PARSED TRANSCRIPT DATA AND CACHED ===');
('Parsed transcript:', parsed);
      }
      
    } catch (error: any) {
('=== TRANSCRIPT DATA LOADING FAILED ===');
('Error object:', error);
('Error message:', error?.message);
('Error stack:', error?.stack);
('Error name:', error?.name);
('Full error details:', JSON.stringify(error, null, 2));
      
      const errorMessage = error?.message || 'Unknown error occurred';
('Processed error message:', errorMessage);
      
      if (errorMessage.includes('Session expired') || errorMessage.includes('login')) {
('Session expired error detected - showing session expired alert');
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            { 
              text: 'OK', 
              onPress: () => {
('User acknowledged session expired alert');
                // Navigate back to login screen
                // You can implement navigation logic here
              }
            }
          ]
        );
      } else {
('Generic error detected - showing generic error alert');
        Alert.alert(
          'Error',
          `Failed to load transcript data: ${errorMessage}`,
          [{ 
            text: 'OK',
            onPress: () => {
('User acknowledged error alert');
            }
          }]
        );
      }
    } finally {
      setLoadingTranscript(false);
('=== TRANSCRIPT LOADING COMPLETED ===');
('Loading state set to false');
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
