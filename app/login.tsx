import { useCustomAlert } from '@/components/CustomAlert';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthManager } from '@/utils/auth';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();

  const handleLogin = async () => {
    if (!username || !password) {
      showAlert({
        title: 'Missing Information',
        message: 'Please enter both username and password',
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('https://guc-connect-login.vercel.app/api/ntlm-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      // Safely parse response (may be JSON or text)
      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      let rawText = '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          // fallback to text if json parsing fails
          rawText = await response.text();
        }
      } else {
        rawText = await response.text();
        try {
          data = JSON.parse(rawText);
        } catch {
          // keep data as null
        }
      }

      const status = data?.status ?? response.status;

      console.log('=== LOGIN DEBUG ===');
      console.log('Response status:', response.status);
      console.log('Content-Type:', contentType);
      console.log('Data status:', data?.status);
      console.log('Final status:', status);
      console.log('Raw text (first 200 chars):', rawText.substring(0, 200));
      console.log('Data object:', JSON.stringify(data, null, 2));
      console.log('==================');

      // Check if this is a successful login (either explicit status 200 or HTTP 200 with no errors)
      const isSuccessful = status === 200 || (response.status === 200 && !data?.error);

      if (isSuccessful) {
        // Try to extract cookies from multiple possible shapes
        let cookieString: string | null = null;
        const cookiesFromJson = data?.cookies || data?.headers?.['set-cookie'] || data?.headers?.['Set-Cookie'];

        if (Array.isArray(cookiesFromJson) && cookiesFromJson.length > 0) {
          cookieString = cookiesFromJson[0];
        } else if (typeof cookiesFromJson === 'string') {
          cookieString = cookiesFromJson;
        } else {
          const hdrSetCookie = response.headers.get('set-cookie');
          if (hdrSetCookie) cookieString = hdrSetCookie;
        }

        if (cookieString) {
          await AuthManager.storeSessionCookie(cookieString);
          // also store creds for NTLM mode in proxy requests
          await AuthManager.storeCredentials(username.trim(), password);
          console.log('Login successful, credentials stored');
        } else {
          console.warn('Login succeeded but no Set-Cookie was returned by the server');
          // Still proceed if we got HTTP 200, assuming login worked
          await AuthManager.storeCredentials(username.trim(), password);
        }

        router.replace('/(tabs)/dashboard');
      } else {
        const msg =
          data?.error ||
          (rawText ? rawText.slice(0, 200) : `HTTP ${response.status}`) ||
          'Invalid username or password. Please try again.';
        showAlert({
          title: 'Login Failed',
          message: msg,
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      showAlert({
        title: 'Login Failed',
        message: 'Network or server error. Please try again shortly.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.mainFont }]}>GUC Connect</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryFont }]}>Sign in to your account</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Username</Text>
            <TextInput
              style={[styles.input, { 
                borderColor: colors.secondaryFont, 
                backgroundColor: colors.background,
                color: colors.mainFont 
              }]}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              placeholderTextColor={colors.secondaryFont}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Password</Text>
            <TextInput
              style={[styles.input, { 
                borderColor: colors.secondaryFont, 
                backgroundColor: colors.background,
                color: colors.mainFont 
              }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.secondaryFont}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.loginButton, 
              { backgroundColor: colors.tabColor },
              isLoading && { backgroundColor: colors.secondaryFont }
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.loginButtonText, { color: colors.background }]}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <AlertComponent />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  loginButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default LoginScreen;
