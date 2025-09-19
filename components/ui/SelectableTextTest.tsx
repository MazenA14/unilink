import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { StyleSheet, View } from 'react-native';
import SelectableText from './SelectableText';

/**
 * Test component to demonstrate SelectableText functionality
 * This can be used to test the clickable links and copyable text features
 */
export default function SelectableTextTest() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const testText = `This is a test notification with various features:

1. Regular text content
2. A clickable link: https://www.google.com
3. Another link to GitHub: https://github.com
4. Email link: mailto:test@example.com
5. More text content with links

The SelectableText component automatically detects URLs and makes them clickable.`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SelectableText 
        style={[styles.testText, { color: colors.mainFont }]}
      >
        {testText}
      </SelectableText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  testText: {
    fontSize: 16,
    lineHeight: 24,
  },
});
