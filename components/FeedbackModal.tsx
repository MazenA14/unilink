import { Colors } from '@/constants/Colors';
import { APP_VERSION } from '@/constants/Version';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthManager } from '@/utils/auth';
import { supabase } from '@/utils/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
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

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export default function FeedbackModal({ visible, onClose, onSuccess, onError }: FeedbackModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Get user information
      const [credentials, userId, nickname, joinedSeason] = await Promise.all([
        AuthManager.getCredentials(),
        AuthManager.getUserId(),
        AuthManager.getNickname(),
        AuthManager.getJoinedSeason(),
      ]);

      const username = credentials?.username || '';
      const gucId = userId || '';
      const displayName = nickname || username.split('@')[0] || '';

      // Get current date
      const currentDate = new Date().toISOString();

      // Insert feedback into Supabase
      const { error } = await supabase
        .from('Feedback')
        .upsert({
          guc_id: gucId,
          username: displayName,
          notes: feedback.trim(),
          date: currentDate,
          version: APP_VERSION,
          joined_season: joinedSeason,
        });

      if (error) {
        throw error;
      }

      // Reset form and close modal
      setFeedback('');
      onSuccess?.();
      onClose();
    } catch (error) {
      onError?.('Failed to submit feedback. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFeedback('');
      onClose();
    }
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
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={[
            styles.modalContainer,
            {
              backgroundColor: colorScheme === 'dark' ? '#232323' : '#ffffff',
              borderColor: colors.border,
            }
          ]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.mainFont }]}>
                Give Feedback
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={isSubmitting}
              >
                <Ionicons name="close" size={24} color={colors.secondaryFont} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.content}>
                <Text style={[styles.description, { color: colors.mainFont }]}>
                  We&apos;d love to hear your thoughts! Share your feedback, suggestions, or report any issues you&apos;ve encountered.
                </Text>
                
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Your Feedback</Text>
                  <TextInput
                    style={[styles.feedbackInput, { 
                      backgroundColor: colors.background, 
                      color: colors.mainFont,
                      borderColor: colors.border 
                    }]}
                    value={feedback}
                    onChangeText={setFeedback}
                    placeholder="Tell us what you think..."
                    placeholderTextColor={colors.secondaryFont}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    editable={!isSubmitting}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={[styles.cancelButtonText, { color: colors.mainFont }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  { backgroundColor: colors.tabColor },
                  isSubmitting && { backgroundColor: colors.secondaryFont, opacity: 0.7 }
                ]}
                onPress={handleSubmit}
                disabled={!feedback.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.background} size="small" />
                    <Text style={[styles.loadingText, { color: colors.background }]}>Submitting...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={[styles.submitButtonText, { color: colors.background }]}>
                      Submit Feedback
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 50,
    paddingBottom: 100,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '95%',
    minHeight: 430,
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
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    maxHeight: 200,
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
