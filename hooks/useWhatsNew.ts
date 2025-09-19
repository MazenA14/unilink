import { getWhatsNewConfig } from '@/constants/WhatsNewFeatures';
import { markWhatsNewAsShown, shouldShowWhatsNew } from '@/utils/whatsNewStorage';
import { useCallback, useState } from 'react';

export function useWhatsNew() {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const config = getWhatsNewConfig();

  const checkAndShowModal = useCallback(async () => {
    try {
      setIsLoading(true);
      const shouldShow = await shouldShowWhatsNew(config.version);
      
      if (shouldShow) {
        setShowModal(true);
      }
    } catch (error) {
      // Don't show modal on error to avoid blocking the user
    } finally {
      setIsLoading(false);
    }
  }, [config.version]);

  const handleCloseModal = useCallback(async () => {
    try {
      await markWhatsNewAsShown(config.version);
      setShowModal(false);
    } catch (error) {
      setShowModal(false); // Close modal even if marking fails
    }
  }, [config.version]);

  return {
    showModal,
    isLoading,
    features: config.features,
    version: config.version,
    checkAndShowModal,
    handleCloseModal,
  };
}
