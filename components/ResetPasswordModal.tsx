import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface ResetPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Optional callback for success
}

const ResetPasswordModal = ({ visible, onClose, onSuccess }: ResetPasswordModalProps) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Debug log
  console.log('ResetPasswordModal rendered, visible:', visible);
  
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    if (!currentPassword) {
      setError('Current password is required');
      return false;
    }
    if (!newPassword) {
      setError('New password is required');
      return false;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    
    console.log('ResetPasswordModal: Starting form submission');
    
    if (!validateForm()) {
      console.log('ResetPasswordModal: Form validation failed');
      return;
    }

    console.log('ResetPasswordModal: Form validation passed, starting submission');
    setIsLoading(true);

    try {
      // Create URL-encoded form data instead of FormData
      const formData = new URLSearchParams();
      formData.append('username', username.trim());
      formData.append('oldPwd', currentPassword);
      formData.append('newPwd1', newPassword);
      formData.append('newPwd2', confirmPassword);
      formData.append('isUtf8', '1');

      console.log('Submitting password reset with data:', {
        username: username.trim(),
        oldPwd: '[HIDDEN]',
        newPwd1: '[HIDDEN]',
        newPwd2: '[HIDDEN]',
        isUtf8: '1'
      });

      const response = await fetch('https://mail.guc.edu.eg/owa/auth/expiredpassword.aspx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        body: formData.toString(),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const responseText = await response.text();
      console.log('Response text length:', responseText.length);
      console.log('Response contains "error":', responseText.toLowerCase().includes('error'));
      console.log('Response contains "success":', responseText.toLowerCase().includes('success'));
      
      // Log a portion of the HTML response to see error messages
      console.log('=== HTML RESPONSE SAMPLE (first 2000 chars) ===');
      console.log(responseText.substring(0, 2000));
      console.log('=== END HTML RESPONSE SAMPLE ===');

      if (response.ok) {
        // Check if the response indicates success or if we're redirected
        if (responseText.includes('success') || 
            responseText.includes('changed') || 
            responseText.includes('password has been changed') ||
            responseText.includes('login') ||
            !responseText.includes('error') ||
            response.status === 302) {
          // Success - show success message and close modal after delay
          setSuccess('Password reset successful! You can now log in with your new password.');
          setTimeout(() => {
            handleClose();
            // Call onSuccess callback if provided (for logout from settings)
            if (onSuccess) {
              onSuccess();
            }
          }, 3000); // Close modal after 3 seconds
        } else {
          setError('Password reset failed. Please check your current password and try again.');
        }
      } else {
        setError(`Password reset failed. Server returned status: ${response.status}`);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess('');
    setUsername('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 80}
      >
        <View style={[
          styles.modalContainer,
          {
            backgroundColor: colorScheme === 'dark' ? '#232323' : '#ffffff',
            borderColor: colors.border,
          }
        ]}>
          <View style={styles.header}>
            {/* <View style={styles.iconContainer}>
              <Ionicons name="key-outline" size={24} color={colors.tabColor} />
            </View> */}
            <Text style={[styles.title, { color: colors.mainFont }]}>
              Reset Password
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.secondaryFont} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <Text style={[styles.description, { color: colors.mainFont }]}>
                Enter your current credentials and new password to reset your account password.
              </Text>
              
              {error ? (
                <View style={[styles.errorBox, { backgroundColor: '#ffebee', borderColor: '#f44336' }]}>
                  <Ionicons name="alert-circle-outline" size={20} color="#f44336" />
                  <Text style={[styles.errorText, { color: '#f44336' }]}>
                    {error}
                  </Text>
                </View>
              ) : null}
              
              {success ? (
                <View style={[styles.errorBox, { backgroundColor: '#e8f5e8', borderColor: '#4caf50' }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#4caf50" />
                  <Text style={[styles.errorText, { color: '#4caf50' }]}>
                    {success}
                  </Text>
                </View>
              ) : null}

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Username</Text>
                  <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                    <Ionicons name="person-outline" size={20} color={colors.secondaryFont} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.mainFont }]}
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
                  <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Current Password</Text>
                  <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.secondaryFont} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.passwordInput, { color: colors.mainFont }]}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Current password"
                      placeholderTextColor={colors.secondaryFont}
                      secureTextEntry={!showCurrentPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      disabled={isLoading}
                    >
                      <Ionicons
                        name={showCurrentPassword ? "eye-off" : "eye"}
                        size={20}
                        color={colors.secondaryFont}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.mainFont }]}>New Password</Text>
                  <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.secondaryFont} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.passwordInput, { color: colors.mainFont }]}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="New password"
                      placeholderTextColor={colors.secondaryFont}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      disabled={isLoading}
                    >
                      <Ionicons
                        name={showNewPassword ? "eye-off" : "eye"}
                        size={20}
                        color={colors.secondaryFont}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Confirm New Password</Text>
                  <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.secondaryFont} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.passwordInput, { color: colors.mainFont }]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm password"
                      placeholderTextColor={colors.secondaryFont}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color={colors.secondaryFont}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.mainFont }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.submitButton, 
                { backgroundColor: colors.tabColor },
                isLoading && { backgroundColor: colors.secondaryFont, opacity: 0.7 }
              ]}
              onPress={() => {
                console.log('ResetPasswordModal: Submit button pressed');
                handleSubmit();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.background} size="small" />
                  <Text style={[styles.loadingText, { color: colors.background }]}>Resetting...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  {/* <Ionicons name="checkmark-outline" size={20} color={colors.background} /> */}
                  <Text style={[styles.submitButtonText, { color: colors.background }]}>
                    Reset Password
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

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
    minHeight: 500,
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  formContainer: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
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
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
});

export default ResetPasswordModal;