import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface WhatsNewModalProps {
  visible: boolean;
  onClose: () => void;
  features: string[];
  version: string;
}

export default function WhatsNewModal({ 
  visible, 
  onClose, 
  features, 
  version 
}: WhatsNewModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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
              {/* <View style={[styles.iconContainer, { backgroundColor: colors.tabColor }]}>
                <Ionicons name="sparkles" size={20} color="white" />
              </View> */}
              <View style={styles.titleTextContainer}>
                <Text style={[styles.title, { color: colors.mainFont }]}>
                  What&apos;s New
                </Text>
                <Text style={[styles.version, { color: colors.secondaryFont }]}>
                  Version {version}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {/* <Ionicons name="close" size={24} color={colors.secondaryFont} /> */}
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <Text style={[styles.description, { color: colors.mainFont }]}>
                Here&apos;s what&apos;s new in this update:
              </Text>
              
              <View style={styles.featuresList}>
                {features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <View style={[styles.bulletPoint, { backgroundColor: colors.tabColor }]} />
                    <Text style={[styles.featureText, { color: colors.mainFont }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.gotItButton, { backgroundColor: colors.tabColor }]}
              onPress={onClose}
            >
              <Text style={[styles.gotItButtonText, { color: colors.background }]}>
                Got it!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  scrollView: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
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
  },
  gotItButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gotItButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
