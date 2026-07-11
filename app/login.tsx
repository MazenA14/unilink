import { useCustomAlert } from '@/components/CustomAlert';
import ResetPasswordModal from '@/components/ResetPasswordModal';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthManager } from '@/utils/auth';
import Ionicons from '@expo/vector-icons/Ionicons';
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
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);
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
      // Authenticate on-device via the native NTLM client (no proxy).
      const isSuccessful = await AuthManager.login(username, password);

      if (isSuccessful) {
        // Mark that the app has been opened (not first time anymore)
        await AuthManager.markAppOpened();

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
            const joinedSeason = await userTrackingService.trackUserLogin(username.trim(), undefined, userInfo.userId || undefined);

            // Cache the joined season if available
            if (joinedSeason) {
              await AuthManager.storeJoinedSeason(String(joinedSeason));
            }
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

        // Clear any existing grade tracking data for fresh start
        try {
          const { GradeTracking } = await import('@/utils/gradeTracking');
          await GradeTracking.clearAllTracking();
        } catch (error) {
          // Grade tracking clearing is optional
        }
      } else {
        showAlert({
          title: 'Login Failed',
          message: 'Invalid username/password or password expired.\n\n Please try again.',
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
          {/* Brand header */}
          <View style={styles.headerContainer}>
            <View style={[styles.logoMark, { backgroundColor: colors.primary }, Shadow.glow(colors.primary)]}>
              <Ionicons name="school" size={38} color={colors.onPrimary} />
              <View style={[styles.logoDot, { backgroundColor: colors.secondary, borderColor: colors.background }]} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>UniLink</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign in to your student portal
            </Text>
          </View>

          {/* Auth card */}
          <View style={[styles.card, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }, Shadow.md(colors)]}>
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>USERNAME</Text>
                <View style={[styles.inputWrapper, {
                  backgroundColor: colors.surfaceSunken,
                  borderColor: focusedField === 'username' ? colors.primary : colors.border,
                }]}>
                  <Ionicons name="person-outline" size={20} color={focusedField === 'username' ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={username}
                    onChangeText={setUsername}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="your.name"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
                <View style={[styles.inputWrapper, {
                  backgroundColor: colors.surfaceSunken,
                  borderColor: focusedField === 'password' ? colors.primary : colors.border,
                }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'password' ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.passwordInput, { color: colors.textPrimary }]}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textTertiary}
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
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.loginButton,
                  { backgroundColor: colors.primary },
                  !isLoading && Shadow.glow(colors.primary),
                  isLoading && { opacity: 0.7 },
                ]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={[styles.loginButtonText, { color: colors.onPrimary }]}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetPasswordButton}
                onPress={() => setShowResetModal(true)}
                disabled={isLoading}
              >
                <Ionicons name="key-outline" size={15} color={colors.secondary} />
                <Text style={[styles.resetPasswordText, { color: colors.secondary }]}>
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
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.huge,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoMark: {
    width: 84,
    height: 84,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    borderRadius: Radius.xxl,
    borderWidth: 1,
    padding: Spacing.xxl,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.lg,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xs,
  },
  loginButton: {
    height: 54,
    width: '100%',
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resetPasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  resetPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerHint: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});

export default LoginScreen;
