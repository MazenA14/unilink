import { checkAppVersion } from '@/utils/services/versionCheckService';
import { useCallback, useState } from 'react';

export function useVersionCheck() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
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
      const result = await checkAppVersion();
      if ('error' in result) {
        return false;
      }
      if (!result.isLatest) {
        setForceUpdate(result.forceUpdate);
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
    // Forced updates cannot be dismissed
    if (forceUpdate) return;
    setShowUpdateModal(false);
  }, [forceUpdate]);

  const handleUpdateModalUpdate = useCallback(() => {
    setShowUpdateModal(false);
    // The modal will handle opening the download link
  }, []);

  // Note: Version check is now triggered manually when dashboard loads
  // Removed automatic check on mount to allow manual control

  return {
    showUpdateModal,
    forceUpdate,
    isChecking,
    checkForUpdates,
    handleUpdateModalClose,
    handleUpdateModalUpdate,
  };
}
