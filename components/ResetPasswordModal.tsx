import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { SheetButtons } from '@/components/ui/SheetButtons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ResetPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Optional callback for success
}

const ResetPasswordModal = ({ visible, onClose, onSuccess }: ResetPasswordModalProps) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  
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
    
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);

    try {
      // Create URL-encoded form data instead of FormData
      const formData = new URLSearchParams();
      formData.append('username', username.trim());
      formData.append('oldPwd', currentPassword);
      formData.append('newPwd1', newPassword);
      formData.append('newPwd2', confirmPassword);
      formData.append('isUtf8', '1');


      const response = await fetch('https://mail.guc.edu.eg/owa/auth/expiredpassword.aspx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        body: formData.toString(),
      });

      const responseText = await response.text();

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
    } catch {
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

  return (
    <BottomSheet
      visible={visible}
      onRequestClose={isLoading ? () => {} : handleClose}
      heightRatio={0.9}
      autoHeight
      header={<SheetHeader colors={colors} title="Reset Password" subtitle="You'll be logged out after a successful reset" />}
      footer={
        <SheetButtons
          secondary={{ label: 'Cancel', onPress: handleClose, disabled: isLoading }}
          primary={{ label: isLoading ? 'Resetting...' : 'Reset Password', onPress: handleSubmit, loading: isLoading }}
        />
      }
    >
            <View style={styles.content}>
              <Text style={[styles.description, { color: colors.mainFont }]}>
                Enter your current credentials and new password to reset your account password.
              </Text>
              
              {error ? (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
                  <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {error}
                  </Text>
                </View>
              ) : null}
              
              {success ? (
                <View style={[styles.errorBox, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                  <Text style={[styles.errorText, { color: colors.success }]}>
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
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
});

export default ResetPasswordModal;