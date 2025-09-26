import { useCustomAlert } from '@/components/CustomAlert';
import { Colors } from '@/constants/Colors';
import { APP_VERSION, UPDATE_DOWNLOAD_LINK } from '@/constants/Version';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface UpdateModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function UpdateModal({ visible, onClose, onUpdate }: UpdateModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();

  const handleUpdatePress = async () => {
    try {
      const supported = await Linking.canOpenURL(UPDATE_DOWNLOAD_LINK);
      if (supported) {
        await Linking.openURL(UPDATE_DOWNLOAD_LINK);
        onUpdate();
      } else {
        showAlert({
          title: 'Error',
          message: 'Cannot open the download link. Please copy the link manually.',
          type: 'error',
          buttons: [
            {
              text: 'Copy Link',
              onPress: () => {
                showAlert({
                  title: 'Download Link',
                  message: UPDATE_DOWNLOAD_LINK,
                  type: 'info',
                  buttons: [{ text: 'OK' }]
                });
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        });
      }
    } catch {
      showAlert({
        title: 'Error',
        message: 'Failed to open the download link. Please try again later.',
        type: 'error',
        buttons: [{ text: 'OK' }]
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modalContainer,
          {
            backgroundColor: colorScheme === 'dark' ? '#232323' : '#ffffff',
            borderColor: colors.border,
          }
        ]}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <View style={styles.titleTextContainer}>
                <Text style={[styles.title, { color: colors.mainFont }]}>
                  Update Available
                </Text>
                <Text style={[styles.version, { color: colors.secondaryFont }]}>
                  Current Version {APP_VERSION}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {/* Close button can be added here if needed */}
            </TouchableOpacity>
          </View>
          
          <View style={styles.content}>
            <Text style={[styles.description, { color: colors.mainFont }]}>
              A new version of UniLink is available. Please update to the latest version to continue using the app with the best experience.
            </Text>
            
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: colors.tabColor }]}
              onPress={handleUpdatePress}
            >
              <Text style={[styles.updateButtonText, { color: colors.background }]}>
                Update Now
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.laterButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.laterButtonText, { color: colors.mainFont }]}>
                Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {AlertComponent()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  version: {
    fontSize: 14,
    opacity: 0.7,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
    flexShrink: 0,
  },
  featureText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  updateButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  laterButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
