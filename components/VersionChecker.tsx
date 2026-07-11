import { useVersionCheck } from '@/hooks/useVersionCheck';
import UpdateModal from './UpdateModal';

export default function VersionChecker() {
  const {
    showUpdateModal,
    forceUpdate,
    handleUpdateModalClose,
    handleUpdateModalUpdate,
  } = useVersionCheck();

  return (
    <UpdateModal
      visible={showUpdateModal}
      onClose={handleUpdateModalClose}
      onUpdate={handleUpdateModalUpdate}
      forceUpdate={forceUpdate}
    />
  );
}
