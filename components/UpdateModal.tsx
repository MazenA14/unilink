import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { SheetButtons } from '@/components/ui/SheetButtons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCustomAlert } from '@/components/CustomAlert';
import { Colors } from '@/constants/Colors';
import { APP_VERSION, UPDATE_DOWNLOAD_LINK } from '@/constants/Version';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Linking, StyleSheet, Text, View } from 'react-native';

interface UpdateModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
  forceUpdate?: boolean;
}

export default function UpdateModal({ visible, onClose, onUpdate, forceUpdate = false }: UpdateModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();

  const handleUpdatePress = async () => {
    try {
      const supported = await Linking.canOpenURL(UPDATE_DOWNLOAD_LINK);
      if (supported) {
        await Linking.openURL(UPDATE_DOWNLOAD_LINK);
        // A forced update must stay up: the user can back out of the
        // download (account picker, browser) without having updated.
        if (!forceUpdate) {
          onUpdate();
        }
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
    <>
      <BottomSheet
        visible={visible}
        onRequestClose={onClose}
        dismissible={!forceUpdate}
        autoHeight
        header={
          <SheetHeader
            colors={colors}
            title={forceUpdate ? 'Update Required' : 'Update Available'}
            subtitle={`Current version ${APP_VERSION}`}
          />
        }
        footer={
          <SheetButtons
            secondary={forceUpdate ? undefined : { label: 'Later', onPress: onClose }}
            primary={{ label: 'Update Now', icon: 'download-outline', onPress: handleUpdatePress }}
          />
        }
      >
        <View style={styles.content}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={forceUpdate ? 'alert-circle-outline' : 'sparkles-outline'} size={26} color={colors.primary} />
          </View>
          <Text style={[styles.description, { color: colors.mainFont }]}>
            {forceUpdate
              ? 'This version of UniLink is no longer supported. Please update to the latest version to continue using the app.'
              : 'A new version of UniLink is available. Please update to the latest version to continue using the app with the best experience.'}
          </Text>
        </View>
      </BottomSheet>
      {AlertComponent()}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
});
