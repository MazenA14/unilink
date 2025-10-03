import { useCustomAlert } from '@/components/CustomAlert';
import { StudyYear, TranscriptData } from '@/components/transcript/types';
import { GradeCache } from '@/utils/gradeCache';
import { GUCAPIProxy as GUCAPI } from '@/utils/gucApiProxy';
import { parseTranscriptHTML } from '@/utils/parsers/transcriptParser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

export function useTranscript() {
  const { showAlert } = useCustomAlert();
  
  // State management
  const [studyYears, setStudyYears] = useState<StudyYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<StudyYear | null>(null);
  const [parsedTranscript, setParsedTranscript] = useState<TranscriptData | null>(null);
  
  // Loading states
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [revalidating, setRevalidating] = useState(false);

  const showAlertRef = useRef(showAlert);
  useEffect(() => {
    showAlertRef.current = showAlert;
  }, [showAlert]);

  const loadStudyYears = useCallback(async (forceRefresh: boolean = false) => {
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
      showAlertRef.current({
        title: 'Error',
        message: `Failed to load study years: ${error.message}`,
        type: 'error',
      });
    } finally {
      setLoadingYears(false);
    }
  }, []);

  // Load study years on component mount
  useEffect(() => {
    loadStudyYears();
  }, [loadStudyYears]);

  const handleYearSelect = async (year: StudyYear) => {
    setSelectedYear(year);
    setParsedTranscript(null);

    setLoadingTranscript(true);

    // Kick off network request immediately
    const networkPromise = (async () => {
      const transcriptData = await GUCAPI.getTranscriptData(year.value);
      const htmlContent = transcriptData.html || transcriptData.body;
      if (!htmlContent) return null;
      const parsed = parseTranscriptHTML(htmlContent);
      if (!parsed) return null;
      await GradeCache.setCachedTranscriptData(year.value, parsed);
      return parsed;
    })();

    try {
      // Try cache in parallel; if present, show it immediately
      const cachedTranscript = await GradeCache.getCachedTranscriptData(year.value);
      if (cachedTranscript) {
        setParsedTranscript(cachedTranscript);
        setRevalidating(true);
        setLoadingTranscript(false);
      }

      // Await fresh data and update UI/cache
      const freshParsed = await networkPromise;
      if (freshParsed) {
        setParsedTranscript(freshParsed);
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
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Error',
          `Failed to load transcript data: ${errorMessage}`,
          [
            {
              text: 'OK',
              onPress: () => {},
            },
          ]
        );
      }
    } finally {
      setLoadingTranscript(false);
      setRevalidating(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Clear transcript cache on refresh to ensure fresh data
    await GradeCache.clearAllTranscriptCache();
    
    await loadStudyYears(true);
    setRefreshing(false);
  }, [loadStudyYears]);

  return {
    // State
    studyYears,
    selectedYear,
    parsedTranscript,
    loadingYears,
    loadingTranscript,
    refreshing,
    revalidating,
    
    // Actions
    handleYearSelect,
    onRefresh,
  };
}
