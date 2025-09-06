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

      const data = await response.json();

      if (data.status === 200) {
        // Extract session cookie from response
        const cookies = data.headers['set-cookie'];
        if (cookies && cookies.length > 0) {
          // Store the session cookie for future API calls
          await AuthManager.storeSessionCookie(cookies[0]);
        }

        // Navigate immediately without showing success alert
        router.replace('/(tabs)/dashboard');
      } else {
        showAlert({
          title: 'Login Failed',
          message: 'Invalid username or password. Please try again.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      showAlert({
        title: 'Login Failed',
        message: 'Network error occurred. Please check your connection and try again.',
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
