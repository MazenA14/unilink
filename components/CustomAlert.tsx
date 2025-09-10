import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { createContext, useContext, useState } from 'react';
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

  const getIconForType = (type?: string) => {
    switch (type) {
      case 'error':
        return { name: 'xmark.circle.fill', color: colors.lowGrade };
      case 'success':
        return { name: 'checkmark.circle.fill', color: colors.highGrade };
      case 'warning':
        return { name: 'exclamationmark.triangle.fill', color: colors.mediumGrade };
      default:
        return { name: 'info.circle.fill', color: colors.tabColor };
    }
  };

  const handleButtonPress = (button: AlertButton) => {
    hideAlert();
    if (button.onPress) {
      setTimeout(button.onPress, 100);
    }
  };

  const AlertComponent = () => {
    if (!alertConfig) return null;

    const icon = getIconForType(alertConfig.type);

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={hideAlert}
      >
        <View style={styles.overlay}>
          <View style={[styles.alertContainer, { backgroundColor: colors.background }]}>
            <View style={styles.iconContainer}>
              <IconSymbol name={icon.name as any} size={32} color={icon.color} />
            </View>
            
            <Text style={[styles.title, { color: colors.mainFont }]}>
              {alertConfig.title}
            </Text>
            
            {alertConfig.message && (
              <Text style={[styles.message, { color: colors.secondaryFont }]}>
                {alertConfig.message}
              </Text>
            )}
            
            <View style={styles.buttonContainer}>
              {alertConfig.buttons?.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    button.style === 'destructive' && { backgroundColor: colors.lowGrade },
                    button.style === 'cancel' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.secondaryFont },
                    button.style === 'default' && { backgroundColor: colors.tabColor },
                  ]}
                  onPress={() => handleButtonPress(button)}
                >
                  <Text style={[
                    styles.buttonText,
                    { color: button.style === 'cancel' ? colors.mainFont : colors.background }
                  ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              )) || (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.tabColor }]}
                  onPress={hideAlert}
                >
                  <Text style={[styles.buttonText, { color: colors.background }]}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertContainer: {
    width: Math.min(width - 40, 320),
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
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
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
