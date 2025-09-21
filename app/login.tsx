import { useCustomAlert } from '@/components/CustomAlert';
import ResetPasswordModal from '@/components/ResetPasswordModal';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthManager } from '@/utils/auth';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
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
          
          // Redirect to dashboard immediately for fast user experience
          router.replace('/(tabs)/dashboard');
          
          // Run user tracking and schedule preloading in the background
          // Background user tracking (don't await - let it run async)
          (async () => {
            try {
              // Get user info (ID and faculty) for tracking (import GUCAPIProxy dynamically to avoid circular dependency)
              const { GUCAPIProxy } = await import('@/utils/gucApiProxy');
              const userInfo = await GUCAPIProxy.getUserInfo();
              
              // Import and call user tracking service
              const { userTrackingService } = await import('@/utils/services/userTrackingService');
              await userTrackingService.trackUserLogin(username.trim(), undefined, userInfo.userId || undefined);
            } catch {
              // Don't fail login if tracking fails
            }
          })();
          
          // Start preloading schedule data in the background
          const { SchedulePreloader } = await import('@/utils/schedulePreloader');
          SchedulePreloader.preloadSchedule().catch(error => {
            // Don't show error to user - preloading is optional
          });
          
          // Start preloading grades data in the background
          const { GradesPreloader } = await import('@/utils/gradesPreloader');
          GradesPreloader.preloadCurrentGrades().catch(error => {
            // Don't show error to user - preloading is optional
          });
        } 
        // else {
        //   // Still proceed if we got HTTP 200, assuming login worked
        //   await AuthManager.storeCredentials(username.trim(), password);
        // }
        else {
          showAlert({
            title: 'Login Failed',
            message: 'Invalid username/password or password expired.\n\n Please try again.',
            type: 'error',
          });
        }

        
      } else {
        const msg =
          data?.error ||
          (rawText ? rawText.slice(0, 200) : `HTTP ${response.status}`) ||
          'Invalid username/password or password expired. Please try again.';
        showAlert({
          title: 'Login Failed',
          message: msg,
          type: 'error',
        });
      }
    } catch {
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          alwaysBounceVertical={false}
          scrollEventThrottle={16}
        >
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.mainFont }]}>UniLink</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryFont }]}>Sign in to your account</Text>
        </View>

        <View style={[styles.card, { 
          backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3',
          borderColor: colors.border 
        }]}>
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Username</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={20} color={colors.secondaryFont} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { 
                    color: colors.mainFont 
                  }]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username"
                  placeholderTextColor={colors.secondaryFont}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Password</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.secondaryFont} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput, { 
                    color: colors.mainFont 
                  }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={colors.secondaryFont}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={colors.secondaryFont}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton, 
                { backgroundColor: colors.tabColor },
                isLoading && { backgroundColor: colors.secondaryFont, opacity: 0.7 }
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.background} size="small" />
                  <Text style={[styles.loadingText, { color: colors.background }]}>Signing In...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={[styles.loginButtonText, { color: colors.background }]}>Sign In</Text>
                  {/* <Ionicons name="arrow-forward" size={20} color={colors.background} /> */}
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetPasswordButton}
              onPress={() => setShowResetModal(true)}
              disabled={isLoading}
            >
              <Ionicons name="key-outline" size={16} color={colors.tabColor} />
              <Text style={[styles.resetPasswordText, { color: colors.tabColor }]}>
                Reset Password
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AlertComponent />
      <ResetPasswordModal
        visible={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    paddingBottom: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    paddingVertical: 0,
  },
  passwordInput: {
    paddingRight: 60,
  },
  eyeButton: {
    position: 'absolute',
    right: 18,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  loginButton: {
    height: 40,
    width: 120,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resetPasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    gap: 8,
  },
  resetPasswordText: {
    fontSize: 14,
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
