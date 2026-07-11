import { useCustomAlert } from '@/components/CustomAlert';
import { StudyYear, TranscriptData } from '@/components/transcript/types';
import { GradeCache } from '@/utils/gradeCache';
import { GUCAPIProxy as GUCAPI } from '@/utils/gucApiProxy';
import { isMaintenanceError } from '@/utils/maintenance';
import { parseTranscriptHTML } from '@/utils/parsers/transcriptParser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

export function useTranscript() {
  const { showAlert } = useCustomAlert();

  // State management
  const [studyYears, setStudyYears] = useState<StudyYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<StudyYear | null>(null);
  const [parsedTranscript, setParsedTranscript] = useState<TranscriptData | null>(null);
  // Non-null when GUC redirected us to the maintenance page; drives the banner.
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);

  // Loading states
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const showAlertRef = useRef(showAlert);
  useEffect(() => {
    showAlertRef.current = showAlert;
  }, [showAlert]);

  const loadStudyYears = useCallback(async () => {
    setLoadingYears(true);
    try {
      // Always fetch fresh and show a spinner until it returns. Cache is used
      // only as a fallback when GUC is under maintenance.
      const fetchedYears = await GUCAPI.getAvailableStudyYears();
      await GradeCache.setCachedStudyYears(fetchedYears);
      setStudyYears(fetchedYears);
      setMaintenanceMessage(null);
    } catch (error: any) {
      if (isMaintenanceError(error)) {
        // Under maintenance: fall back to cached years (if any) and show the banner.
        setMaintenanceMessage(error.userMessage);
        const cachedYears = await GradeCache.getCachedStudyYears();
        setStudyYears(cachedYears && cachedYears.length > 0 ? cachedYears : []);
      } else {
        showAlertRef.current({
          title: 'Error',
          message: `Failed to load study years: ${error.message}`,
          type: 'error',
        });
      }
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

    try {
      // Always fetch fresh and show a spinner until it returns. Cache is used
      // only as a fallback when GUC is under maintenance.
      const transcriptData = await GUCAPI.getTranscriptData(year.value);
      const htmlContent = transcriptData.html || transcriptData.body;
      const parsed = htmlContent ? parseTranscriptHTML(htmlContent) : null;

      if (parsed) {
        await GradeCache.setCachedTranscriptData(year.value, parsed);
        setParsedTranscript(parsed);
        setMaintenanceMessage(null);
      } else {
        // Reached the page but couldn't parse it.
        setParsedTranscript(null);
      }
    } catch (error: any) {
      if (isMaintenanceError(error)) {
        // Under maintenance: fall back to cached transcript (if any) + banner.
        setMaintenanceMessage(error.userMessage);
        const cachedTranscript = await GradeCache.getCachedTranscriptData(year.value);
        setParsedTranscript(cachedTranscript ?? null);
        return;
      }

      const errorMessage = error?.message || 'Unknown error occurred';
      if (errorMessage.includes('Session expired') || errorMessage.includes('login')) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [{ text: 'OK', onPress: () => {} }]
        );
      } else {
        Alert.alert(
          'Error',
          `Failed to load transcript data: ${errorMessage}`,
          [{ text: 'OK', onPress: () => {} }]
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

    await loadStudyYears();
    setRefreshing(false);
  }, [loadStudyYears]);

  return {
    // State
    studyYears,
    selectedYear,
    parsedTranscript,
    maintenanceMessage,
    loadingYears,
    loadingTranscript,
    refreshing,

    // Actions
    handleYearSelect,
    onRefresh,
  };
}
