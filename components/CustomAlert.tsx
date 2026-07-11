import { Colors } from '@/constants/Colors';
import { withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useContext, useState } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  type?: 'info' | 'error' | 'success' | 'warning';
}

interface AlertContextType {  
  showAlert: (config: AlertConfig) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

// Convenience hook for common alert patterns
export function useCustomAlert() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const showAlert = (config: AlertConfig) => {
    setAlertConfig(config);
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
    setTimeout(() => setAlertConfig(null), 300);
  };


  const handleButtonPress = (button: AlertButton) => {
    hideAlert();
    if (button.onPress) {
      setTimeout(button.onPress, 100);
    }
  };

  const AlertComponent = () => {
    if (!alertConfig) return null;

    const typeMeta = {
      info: { iconName: 'information-circle' as const, accent: colors.info },
      success: { iconName: 'checkmark-circle' as const, accent: colors.success },
      warning: { iconName: 'warning' as const, accent: colors.warning },
      error: { iconName: 'close-circle' as const, accent: colors.danger },
    };
    const { iconName, accent } = typeMeta[alertConfig.type ?? 'info'];

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={hideAlert}
      >
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.alertContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, shadowColor: colors.shadow }]}>
            <View style={[styles.iconContainer, { backgroundColor: withAlpha(accent, 0.14) }]}>
              <Ionicons name={iconName} size={26} color={accent} />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {alertConfig.title}
            </Text>

            {alertConfig.message && (
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {alertConfig.message}
              </Text>
            )}

            <View style={styles.buttonContainer}>
              {alertConfig.buttons?.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.85}
                  style={[
                    styles.button,
                    button.style === 'destructive' && { backgroundColor: colors.danger },
                    button.style === 'cancel' && { backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.border },
                    (button.style === 'default' || !button.style) && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => handleButtonPress(button)}
                >
                  <Text style={[
                    styles.buttonText,
                    {
                      color: button.style === 'cancel' ? colors.textPrimary : colors.onPrimary,
                      fontWeight: button.style === 'cancel' ? '600' : '700'
                    }
                  ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              )) || (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={hideAlert}
                >
                  <Text style={[styles.buttonText, { color: colors.onPrimary, fontWeight: '700' }]}>
                    OK
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return { showAlert, AlertComponent };
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertContainer: {
    width: Math.min(width - 40, 340),
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    elevation: 16,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
