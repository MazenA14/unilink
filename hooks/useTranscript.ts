import { StudyYear, TranscriptData } from '@/components/transcript/types';
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
      
      console.log('Loading study years from API with server overload bypass...');
      const fetchedYears = await GUCAPI.getAvailableStudyYears();
      
      setStudyYears(fetchedYears);
      console.log(`Loaded ${fetchedYears.length} study years`);
      
    } catch (error: any) {
      console.error('Failed to load study years:', error);
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
    console.log('=== YEAR SELECTED ===');
    console.log('Selected year:', year);
    console.log('Year value:', year.value);
    console.log('Year text:', year.text);
    
    setSelectedYear(year);
    setParsedTranscript(null); // Clear previous data
    
    try {
      setLoadingTranscript(true);
      console.log('=== LOADING TRANSCRIPT DATA ===');
      console.log(`Calling GUCAPI.getTranscriptData with year value: "${year.value}"`);
      
      // Call the existing getTranscriptData function
      const transcriptData = await GUCAPI.getTranscriptData(year.value);
      
      console.log('=== TRANSCRIPT DATA LOADED SUCCESSFULLY ===');
      console.log('Raw transcript data received:', transcriptData);
      console.log('Data type:', typeof transcriptData);
      console.log('Data keys:', transcriptData ? Object.keys(transcriptData) : 'No keys (null/undefined)');
      
      if (transcriptData && transcriptData.html) {
        console.log('HTML content length:', transcriptData.html.length);
        console.log('HTML preview (first 500 chars):', transcriptData.html.substring(0, 500));
      }
      
      if (transcriptData && transcriptData.body) {
        console.log('Body content length:', transcriptData.body.length);
        console.log('Body preview (first 500 chars):', transcriptData.body.substring(0, 500));
      }
      
      console.log('=== TRANSCRIPT DATA SET IN STATE ===');
      
      // Parse the HTML content
      const htmlContent = transcriptData.html || transcriptData.body;
      if (htmlContent) {
        const parsed = parseTranscriptHTML(htmlContent);
        setParsedTranscript(parsed);
        console.log('=== PARSED TRANSCRIPT DATA ===');
        console.log('Parsed transcript:', parsed);
      }
      
    } catch (error: any) {
      console.log('=== TRANSCRIPT DATA LOADING FAILED ===');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Error name:', error?.name);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      
      const errorMessage = error?.message || 'Unknown error occurred';
      console.log('Processed error message:', errorMessage);
      
      if (errorMessage.includes('Session expired') || errorMessage.includes('login')) {
        console.log('Session expired error detected - showing session expired alert');
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                console.log('User acknowledged session expired alert');
                // Navigate back to login screen
                // You can implement navigation logic here
              }
            }
          ]
        );
      } else {
        console.log('Generic error detected - showing generic error alert');
        Alert.alert(
          'Error',
          `Failed to load transcript data: ${errorMessage}`,
          [{ 
            text: 'OK',
            onPress: () => {
              console.log('User acknowledged error alert');
            }
          }]
        );
      }
    } finally {
      setLoadingTranscript(false);
      console.log('=== TRANSCRIPT LOADING COMPLETED ===');
      console.log('Loading state set to false');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
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
