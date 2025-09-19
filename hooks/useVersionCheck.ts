import { isUpdateNeeded } from '@/utils/services/versionCheckService';
import Constants from 'expo-constants';
import { useCallback, useState } from 'react';

export function useVersionCheck() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null);

  const checkForUpdates = useCallback(async () => {
    // Skip version check in development mode
    if (__DEV__ || Constants.appOwnership === 'expo') {
      console.log('Skipping version check in development mode');
      return;
    }

    // Avoid checking too frequently (max once per session)
    const now = Date.now();
    if (lastCheckTime && now - lastCheckTime < 30000) { // 30 seconds cooldown
      return;
    }

    setIsChecking(true);
    setLastCheckTime(now);

    try {
      const updateNeeded = await isUpdateNeeded();
      if (updateNeeded) {
        setShowUpdateModal(true);
      }
    } catch (error) {
      console.error('Version check error:', error);
      // Silently fail - don't block the user experience
    } finally {
      setIsChecking(false);
    }
  }, [lastCheckTime]);

  const handleUpdateModalClose = useCallback(() => {
    setShowUpdateModal(false);
  }, []);

  const handleUpdateModalUpdate = useCallback(() => {
    setShowUpdateModal(false);
    // The modal will handle opening the download link
  }, []);

  // Note: Version check is now triggered manually when dashboard loads
  // Removed automatic check on mount to allow manual control

  return {
    showUpdateModal,
    isChecking,
    checkForUpdates,
    handleUpdateModalClose,
    handleUpdateModalUpdate,
  };
}
