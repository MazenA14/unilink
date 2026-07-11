import { useCustomAlert } from '@/components/CustomAlert';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { EvaluationHandler, isAlreadyEvaluatedError } from '@/utils/handlers/evaluationHandler';
import { EvaluationForm } from '@/utils/types/gucTypes';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function EvaluationFormScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { type, id, name } = useLocalSearchParams<{ type: 'course' | 'staff'; id: string; name: string }>();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [form, setForm] = useState<EvaluationForm | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyEvaluated, setAlreadyEvaluated] = useState(false);

  useEffect(() => {
    loadForm();
  }, []);

  const loadForm = async () => {
    try {
      setLoading(true);
      const evaluationForm =
        type === 'course' ? await EvaluationHandler.getCourseForm(id) : await EvaluationHandler.getStaffForm(id);
      setForm(evaluationForm);
    } catch (error) {
      if (isAlreadyEvaluatedError(error)) {
        setAlreadyEvaluated(true);
        return;
      }
      console.error('Failed to load evaluation form:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to load the evaluation form. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const allQuestionsAnswered =
    !!form &&
    form.agreeQuestions.every((q) => !!answers[q.radioName]) &&
    form.scaleQuestions.every((q) => !!answers[q.radioName]);

  const applyToAll = (questions: { radioName: string }[], value: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      questions.forEach((q) => {
        next[q.radioName] = value;
      });
      return next;
    });
  };

  const bulkAgreeValue =
    form && form.agreeQuestions.length > 0 && form.agreeQuestions.every((q) => answers[q.radioName] === answers[form.agreeQuestions[0].radioName])
      ? answers[form.agreeQuestions[0].radioName]
      : undefined;

  const bulkScaleValue =
    form && form.scaleQuestions.length > 0 && form.scaleQuestions.every((q) => answers[q.radioName] === answers[form.scaleQuestions[0].radioName])
      ? answers[form.scaleQuestions[0].radioName]
      : undefined;

  const handleSubmit = async () => {
    if (!form || submitting) return;
    try {
      setSubmitting(true);
      const result =
        type === 'course'
          ? await EvaluationHandler.submitCourseEvaluation(id, form, answers, remark)
          : await EvaluationHandler.submitStaffEvaluation(id, form, answers, remark);

      showAlert({
        title: result.success ? 'Submitted' : 'Something went wrong',
        message: result.success
          ? 'Your evaluation has been submitted. Thank you!'
          : 'The evaluation may not have been submitted correctly. Please try again.',
        type: result.success ? 'success' : 'error',
        buttons: result.success
          ? [{ text: 'OK', onPress: () => router.back() }]
          : [{ text: 'OK' }],
      });
    } catch (error) {
      console.error('Failed to submit evaluation:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to submit the evaluation. Please try again.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.mainFont} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.mainFont }]} numberOfLines={1}>
            {name || 'Evaluation'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>Loading questions...</Text>
          </View>
        ) : alreadyEvaluated ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="checkmark-circle-outline" size={40} color={colors.secondaryFont} />
            <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>
              This {type === 'course' ? 'course' : 'staff member'} was already evaluated.
            </Text>
          </View>
        ) : !form || (form.agreeQuestions.length === 0 && form.scaleQuestions.length === 0) ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.secondaryFont} />
            <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>
              No evaluation questions were found for this item.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {form.agreeQuestions.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.legend, { color: colors.secondaryFont }]}>
                  {form.agreeQuestions[0].options.map((o, i) => `${i + 1} = ${o.label}`).join('   ')}
                </Text>

                {form.agreeQuestions.length > 1 && (
                  <View style={[styles.bulkRow, { borderBottomColor: colors.border }]}>
                    <Ionicons name="flash" size={14} color="#F59E0B" />
                    <Text style={styles.bulkRowLabel}>Bulk</Text>
                    <View style={styles.numberRow}>
                      {form.agreeQuestions[0].options.map((option, i) => {
                        const selected = bulkAgreeValue === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.numberChip,
                              { backgroundColor: selected ? '#F59E0B' : 'transparent', borderColor: '#F59E0B' },
                            ]}
                            onPress={() => applyToAll(form.agreeQuestions, option.value)}
                          >
                            <Text style={[styles.numberChipText, { color: selected ? 'white' : '#F59E0B' }]}>{i + 1}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {form.agreeQuestions.map((question, qi) => (
                  <View
                    key={question.radioName}
                    style={[
                      styles.compactRow,
                      qi < form.agreeQuestions.length - 1 && { borderBottomWidth: 1, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.compactLabel, { color: colors.mainFont }]}>{question.label}</Text>
                    <View style={styles.numberRow}>
                      {question.options.map((option, i) => {
                        const selected = answers[question.radioName] === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.numberChip,
                              {
                                backgroundColor: selected ? colors.tint : 'transparent',
                                borderColor: selected ? colors.tint : colors.border,
                              },
                            ]}
                            onPress={() => setAnswers((prev) => ({ ...prev, [question.radioName]: option.value }))}
                          >
                            <Text style={[styles.numberChipText, { color: selected ? 'white' : colors.mainFont }]}>{i + 1}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {form.scaleQuestions.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
                {form.scaleQuestions.length > 1 && (
                  <View style={[styles.bulkRow, { borderBottomColor: colors.border }]}>
                    <Ionicons name="flash" size={14} color="#F59E0B" />
                    <Text style={styles.bulkRowLabel}>Bulk</Text>
                    <View style={styles.numberRow}>
                      {form.scaleQuestions[0].options.map((option) => {
                        const selected = bulkScaleValue === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.numberChip,
                              { backgroundColor: selected ? '#F59E0B' : 'transparent', borderColor: '#F59E0B' },
                            ]}
                            onPress={() => applyToAll(form.scaleQuestions, option.value)}
                          >
                            <Text style={[styles.numberChipText, { color: selected ? 'white' : '#F59E0B' }]}>{option.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {form.scaleQuestions.map((question, qi) => (
                  <View
                    key={question.radioName}
                    style={[
                      styles.compactRow,
                      qi < form.scaleQuestions.length - 1 && { borderBottomWidth: 1, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.compactLabel, { color: colors.mainFont }]}>{question.label}</Text>
                    <View style={styles.scaleRow}>
                      <Text style={[styles.scaleCaption, { color: colors.secondaryFont }]}>{question.leftCaption}</Text>
                      <View style={styles.numberRow}>
                        {question.options.map((option) => {
                          const selected = answers[question.radioName] === option.value;
                          return (
                            <TouchableOpacity
                              key={option.value}
                              style={[
                                styles.numberChip,
                                {
                                  backgroundColor: selected ? colors.tint : 'transparent',
                                  borderColor: selected ? colors.tint : colors.border,
                                },
                              ]}
                              onPress={() => setAnswers((prev) => ({ ...prev, [question.radioName]: option.value }))}
                            >
                              <Text style={[styles.numberChipText, { color: selected ? 'white' : colors.mainFont }]}>
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <Text style={[styles.scaleCaption, { color: colors.secondaryFont }]}>{question.rightCaption}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {form.remarkFieldName && (
              <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.compactLabel, { color: colors.mainFont }]}>Comments (optional)</Text>
                <TextInput
                  style={[styles.remarkInput, { color: colors.mainFont, borderColor: colors.border }]}
                  multiline
                  numberOfLines={3}
                  value={remark}
                  onChangeText={setRemark}
                  placeholder="Any suggestions or feedback?"
                  placeholderTextColor={colors.secondaryFont}
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: allQuestionsAnswered ? '#F59E0B' : colors.border },
              ]}
              disabled={!allQuestionsAnswered || submitting}
              onPress={handleSubmit}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitText}>Submit Evaluation</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
      <AlertComponent />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, flex: 1, textAlign: 'center' },
  placeholder: { width: 40 },
  content: { flex: 1, paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '500', textAlign: 'center' },
  sectionCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legend: { fontSize: 10, lineHeight: 14, marginBottom: 10 },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
    marginBottom: 6,
    borderBottomWidth: 1,
  },
  bulkRowLabel: { fontSize: 11, fontWeight: '700', color: '#F59E0B', marginRight: 4 },
  compactRow: { paddingVertical: 8 },
  compactLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, lineHeight: 16 },
  numberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  numberChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberChipText: { fontSize: 10, fontWeight: '700' },
  scaleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scaleCaption: { fontSize: 10, flexShrink: 1, maxWidth: 52 },
  remarkInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  submitText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
