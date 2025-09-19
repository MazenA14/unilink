import { useVersionCheck } from '@/hooks/useVersionCheck';
import UpdateModal from './UpdateModal';

export default function VersionChecker() {
  const {
    showUpdateModal,
    handleUpdateModalClose,
    handleUpdateModalUpdate,
  } = useVersionCheck();

  return (
    <UpdateModal
      visible={showUpdateModal}
      onClose={handleUpdateModalClose}
      onUpdate={handleUpdateModalUpdate}
    />
  );
}
