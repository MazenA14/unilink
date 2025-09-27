import { isUpdateNeeded } from '@/utils/services/versionCheckService';
import { useCallback, useState } from 'react';

export function useVersionCheck() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {

    // Avoid checking too frequently (max once per session)
    const now = Date.now();
    if (lastCheckTime && now - lastCheckTime < 10000) { // 30 seconds cooldown
      return false;
    }

    setIsChecking(true);
    setLastCheckTime(now);

    try {
      const updateNeeded = await isUpdateNeeded();
      if (updateNeeded) {
        setShowUpdateModal(true);
        return true; // Update is available
      }
      return false; // No update needed
    } catch {
      // Silently fail - don't block the user experience
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
