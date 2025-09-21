import { useCustomAlert } from '@/components/CustomAlert';
import { Colors } from '@/constants/Colors';
import { UPDATE_DOWNLOAD_LINK } from '@/constants/Version';
import { useColorScheme } from '@/hooks/useColorScheme';
import { BlurView } from 'expo-blur';
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
      statusBarTranslucent
    >
      <BlurView intensity={20} style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>
              Update Available
            </Text>
            
            <Text style={[styles.message, { color: colors.text }]}>
              A new version of UniLink is available. Please update to the latest version to continue using the app with the best experience.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.updateButton, { backgroundColor: colors.tint }]}
                onPress={handleUpdatePress}
                activeOpacity={0.8}
              >
                <Text style={styles.updateButtonText}>Update Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.laterButton, { borderColor: colors.text }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.laterButtonText, { color: colors.text }]}>
                  Later
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>
      {AlertComponent()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  updateButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  laterButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
