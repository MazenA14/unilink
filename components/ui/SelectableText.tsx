import { useCustomAlert } from '@/components/CustomAlert';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SelectableTextProps {
  children: string;
  style?: any;
  onLinkPress?: (url: string) => void;
}

export default function SelectableText({ 
  children, 
  style, 
  onLinkPress
}: SelectableTextProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();

  // URL regex pattern to detect links
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Function to handle link press
  const handleLinkPress = async (url: string) => {
    if (onLinkPress) {
      onLinkPress(url);
      return;
    }

    try {
      // For common web URLs, try to open directly without checking canOpenURL first
      // as it can be unreliable for some URLs like Google Docs
      if (url.startsWith('http://') || url.startsWith('https://')) {
        await Linking.openURL(url);
      } else {
        // For other URL schemes, check if they can be opened first
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          showAlert({
            title: 'Cannot Open Link',
            message: 'This link cannot be opened.',
            type: 'warning',
          });
        }
      }
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to open link',
        type: 'error',
      });
    }
  };

  // Function to render text with clickable links
  const renderTextWithLinks = (text: string) => {
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <TouchableOpacity
            key={index}
            onPress={() => handleLinkPress(part)}
            style={styles.linkContainer}
          >
            <Text style={[styles.linkText, { color: colors.tabColor }]}>
              {part}
            </Text>
          </TouchableOpacity>
        );
      }
      return (
        <Text key={index} style={style}>
          {part}
        </Text>
      );
    });
  };

  return (
    <View style={styles.textContainer}>
      {renderTextWithLinks(children)}
      
      {/* Custom Alert Component */}
      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  textContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  linkContainer: {
    marginHorizontal: 2,
  },
  linkText: {
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});
