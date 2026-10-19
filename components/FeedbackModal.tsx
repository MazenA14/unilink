import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { SheetButtons } from '@/components/ui/SheetButtons';
import { Colors } from '@/constants/Colors';
import { APP_VERSION } from '@/constants/Version';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthManager } from '@/utils/auth';
import { supabase } from '@/utils/supabase';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

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
          username: username,
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

  return (
    <BottomSheet
      visible={visible}
      onRequestClose={handleClose}
      heightRatio={0.85}
      autoHeight
      header={<SheetHeader colors={colors} title="Give Feedback" subtitle="Suggestions, ideas or issues" />}
      footer={
        <SheetButtons
          secondary={{ label: 'Cancel', onPress: handleClose, disabled: isSubmitting }}
          primary={{
            label: 'Submit Feedback',
            icon: 'send-outline',
            onPress: handleSubmit,
            loading: isSubmitting,
            disabled: !feedback.trim(),
          }}
        />
      }
    >
              <View style={styles.content}>
                <Text style={[styles.description, { color: colors.mainFont }]}>
                  We&apos;d love to hear your thoughts! Share your feedback, suggestions, or report any issues you&apos;ve encountered.
                </Text>
                
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Your Feedback</Text>
                  <TextInput
                    style={[styles.feedbackInput, { 
                      backgroundColor: colors.surfaceSunken, 
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
    </BottomSheet>
  );
}

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
});
