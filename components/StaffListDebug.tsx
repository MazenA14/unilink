import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { parseStaffListHtml } from '@/utils/parsers/staffListParser';
import { testParserWithRealData } from '@/utils/testStaffParserWithRealData';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export function StaffListDebug() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [htmlInput, setHtmlInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testWithRealData = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const testResult = testParserWithRealData();
      setResult(testResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testWithCustomHtml = async () => {
    if (!htmlInput.trim()) {
      setError('Please enter HTML content');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const parseResult = parseStaffListHtml(htmlInput);
      setResult(parseResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Staff List Parser Debug</Text>
      
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={testWithRealData}
        disabled={loading}
      >
        <Text style={[styles.buttonText, { color: colors.background }]}>
          {loading ? 'Testing...' : 'Test with Real Data'}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Or test with custom HTML:</Text>
      
      <TextInput
        style={[styles.textInput, { 
          backgroundColor: colors.cardBackground, 
          color: colors.text,
          borderColor: colors.border 
        }]}
        placeholder="Paste HTML content here..."
        placeholderTextColor={colors.secondaryFont}
        value={htmlInput}
        onChangeText={setHtmlInput}
        multiline
        numberOfLines={10}
      />
      
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.secondary }]}
        onPress={testWithCustomHtml}
        disabled={loading || !htmlInput.trim()}
      >
        <Text style={[styles.buttonText, { color: colors.background }]}>
          Test Custom HTML
        </Text>
      </TouchableOpacity>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Error: {error}
          </Text>
        </View>
      )}

      {result && (
        <ScrollView style={styles.resultContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Results:</Text>
          <Text style={[styles.resultText, { color: colors.secondaryFont }]}>
            Courses: {result.courses?.length || 0}
          </Text>
          <Text style={[styles.resultText, { color: colors.secondaryFont }]}>
            TAs: {result.tas?.length || 0}
          </Text>
          
          {result.courses && result.courses.length > 0 && (
            <>
              <Text style={[styles.subsectionTitle, { color: colors.text }]}>First 3 Courses:</Text>
              {result.courses.slice(0, 3).map((course: any, index: number) => (
                <Text key={index} style={[styles.itemText, { color: colors.secondaryFont }]}>
                  {index + 1}. {course.name} ({course.department})
                </Text>
              ))}
            </>
          )}
          
          {result.tas && result.tas.length > 0 && (
            <>
              <Text style={[styles.subsectionTitle, { color: colors.text }]}>First 3 TAs:</Text>
              {result.tas.slice(0, 3).map((ta: any, index: number) => (
                <Text key={index} style={[styles.itemText, { color: colors.secondaryFont }]}>
                  {index + 1}. {ta.name} ({ta.department})
                </Text>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    fontSize: 14,
  },
  resultContainer: {
    maxHeight: 300,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
  },
  itemText: {
    fontSize: 12,
    marginBottom: 2,
    marginLeft: 10,
  },
});
