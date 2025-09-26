import { isUpdateNeeded } from '@/utils/services/versionCheckService';
import Constants from 'expo-constants';
import { useCallback, useState } from 'react';

export function useVersionCheck() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    // console.log('Checking for updates');

    // Avoid checking too frequently (max once per session)
    const now = Date.now();
    if (lastCheckTime && now - lastCheckTime < 10000) { // 30 seconds cooldown
      // console.log('Skipping update check');
      return false;
    }

    setIsChecking(true);
    setLastCheckTime(now);

    try {
      const updateNeeded = await isUpdateNeeded();
      if (updateNeeded) {
        // console.log('Update is available');
        setShowUpdateModal(true);
        return true; // Update is available
      }
      // console.log('No update needed');
      return false; // No update needed
    } catch {
      // Silently fail - don't block the user experience
      // console.log('Error checking for updates');
      return false;
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
