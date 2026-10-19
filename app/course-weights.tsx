import { useCustomAlert } from '@/components/CustomAlert';
import { AppBar } from '@/components/navigation/AppBar';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { Colors, SlotTypeColors } from '@/constants/Colors';
import { Radius, Shadow, Spacing, Type, withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Course, CourseWeight, CourseWeightsStorage } from '@/utils/courseWeightsStorage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Preset weight names (alphabetically ordered)
const PRESET_WEIGHT_NAMES = ['Assignments', 'Final', 'Labs', 'Midterm', 'Project', 'Quizzes'];

// Common weight percentages offered as quick picks
const PRESET_PERCENTAGES = [5, 10, 15, 20, 25, 30, 40, 50, 60];

const sumWeights = (weights: CourseWeight[]) => weights.reduce((sum, w) => sum + w.percentage, 0);

// Trim float noise (e.g. 0.1 + 0.2) for display
const formatPct = (value: number) => `${Math.round(value * 100) / 100}%`;

export default function CourseWeightsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [courses, setCourses] = useState<Course[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  // Sheet states
  const [courseSheetVisible, setCourseSheetVisible] = useState(false);
  const [weightSheetVisible, setWeightSheetVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingWeight, setEditingWeight] = useState<CourseWeight | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Form states
  const [courseName, setCourseName] = useState('');
  const [weightName, setWeightName] = useState('');
  const [weightPercentage, setWeightPercentage] = useState('');

  // Segment colours for the stacked weight bar
  const segmentPalette = useMemo(
    () => [
      colors.primary,
      colors.secondary,
      SlotTypeColors.Tutorial,
      SlotTypeColors.Lab,
      SlotTypeColors.Seminar,
      SlotTypeColors.Project,
      SlotTypeColors.Workshop,
      SlotTypeColors.Thesis,
    ],
    [colors.primary, colors.secondary]
  );

  const loadCourses = useCallback(async () => {
    try {
      const loadedCourses = await CourseWeightsStorage.loadCourses();
      setCourses(loadedCourses);
    } catch {
      // Error handling will be done in the calling function if needed
      console.error('Failed to load courses');
    }
  }, []);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const saveCourses = useCallback(async (updatedCourses: Course[]) => {
    try {
      await CourseWeightsStorage.saveCourses(updatedCourses);
      setCourses(updatedCourses);
    } catch {
      // Error handling will be done in the calling function if needed
      console.error('Failed to save courses');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCourses();
    } catch (error) {
      console.error('Failed to refresh courses:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadCourses]);

  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  // Course management functions
  const handleAddCourse = () => {
    setEditingCourse(null);
    setCourseName('');
    setCourseSheetVisible(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseName(course.name);
    setCourseSheetVisible(true);
  };

  const handleDeleteCourse = (courseId: string) => {
    showAlert({
      title: 'Delete Course',
      message: 'Are you sure you want to delete this course and all its weights?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedCourses = courses.filter(course => course.id !== courseId);
            saveCourses(updatedCourses);
          }
        }
      ]
    });
  };

  const handleSaveCourse = () => {
    if (!courseName.trim()) {
      showAlert({
        title: 'Error',
        message: 'Course name cannot be empty',
        type: 'error',
      });
      return;
    }

    const updatedCourses = [...courses];

    if (editingCourse) {
      // Update existing course
      const courseIndex = updatedCourses.findIndex(c => c.id === editingCourse.id);
      if (courseIndex !== -1) {
        updatedCourses[courseIndex] = { ...editingCourse, name: courseName.trim() };
      }
    } else {
      // Add new course, expanded so weights can be added right away
      const newCourse: Course = {
        id: Date.now().toString(),
        name: courseName.trim(),
        weights: []
      };
      updatedCourses.push(newCourse);
      setExpandedCourses(prev => new Set(prev).add(newCourse.id));
    }

    saveCourses(updatedCourses);
    setCourseSheetVisible(false);
  };

  // Weight management functions
  const handleAddWeight = (course: Course) => {
    setSelectedCourse(course);
    setEditingWeight(null);
    setWeightName('');
    setWeightPercentage('');
    setWeightSheetVisible(true);
  };

  const handleEditWeight = (course: Course, weight: CourseWeight) => {
    setSelectedCourse(course);
    setEditingWeight(weight);
    setWeightName(weight.name);
    setWeightPercentage(weight.percentage.toString());
    setWeightSheetVisible(true);
  };

  const handleDeleteWeight = (courseId: string, weightId: string) => {
    showAlert({
      title: 'Delete Weight',
      message: 'Are you sure you want to delete this weight?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedCourses = courses.map(course => {
              if (course.id === courseId) {
                return {
                  ...course,
                  weights: course.weights.filter(weight => weight.id !== weightId)
                };
              }
              return course;
            });
            saveCourses(updatedCourses);
          }
        }
      ]
    });
  };

  const handleDeleteAllCourses = () => {
    if (courses.length === 0) {
      showAlert({
        title: 'No Courses',
        message: 'There are no courses to delete',
        type: 'info',
      });
      return;
    }

    showAlert({
      title: 'Delete All Courses',
      message: `Are you sure you want to delete all courses and their weights? This action cannot be undone.`,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await CourseWeightsStorage.clearAll();
              setCourses([]);
            } catch (error) {
              console.error('Failed to delete all courses:', error);
              showAlert({
                title: 'Error',
                message: 'Failed to delete all courses',
                type: 'error',
              });
            }
          }
        }
      ]
    });
  };

  const handleSaveWeight = () => {
    if (!weightName.trim() || !weightPercentage.trim()) {
      showAlert({
        title: 'Error',
        message: 'Weight name and percentage are required',
        type: 'error',
      });
      return;
    }

    const percentage = parseFloat(weightPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      showAlert({
        title: 'Error',
        message: 'Percentage must be a number between 0 and 100',
        type: 'error',
      });
      return;
    }

    if (!selectedCourse) return;

    const updatedCourses = courses.map(course => {
      if (course.id === selectedCourse.id) {
        const updatedWeights = [...course.weights];

        if (editingWeight) {
          // Update existing weight
          const weightIndex = updatedWeights.findIndex(w => w.id === editingWeight.id);
          if (weightIndex !== -1) {
            updatedWeights[weightIndex] = {
              ...editingWeight,
              name: weightName.trim(),
              percentage
            };
          }
        } else {
          // Add new weight
          const newWeight: CourseWeight = {
            id: Date.now().toString(),
            name: weightName.trim(),
            percentage
          };
          updatedWeights.push(newWeight);
        }

        return { ...course, weights: updatedWeights };
      }
      return course;
    });

    saveCourses(updatedCourses);
    setWeightSheetVisible(false);
  };

  // Total of the selected course's other weights, for the editor's live preview
  const otherWeightsTotal = useMemo(() => {
    if (!selectedCourse) return 0;
    const course = courses.find(c => c.id === selectedCourse.id) ?? selectedCourse;
    return sumWeights(course.weights.filter(w => w.id !== editingWeight?.id));
  }, [courses, selectedCourse, editingWeight]);
  const remainingForWeight = Math.max(0, Math.round((100 - otherWeightsTotal) * 100) / 100);
  const parsedPercentage = parseFloat(weightPercentage);
  const previewTotal = otherWeightsTotal + (isNaN(parsedPercentage) ? 0 : parsedPercentage);

  const getTotalStatus = (total: number) => {
    const rounded = Math.round(total * 100) / 100;
    if (rounded === 100) return { tone: colors.success, soft: colors.successSoft, icon: 'checkmark-circle' as const, label: 'Complete' };
    if (rounded > 100) return { tone: colors.danger, soft: colors.dangerSoft, icon: 'alert-circle' as const, label: `${formatPct(rounded - 100)} over` };
    return { tone: colors.warning, soft: colors.warningSoft, icon: 'ellipse-outline' as const, label: `${formatPct(100 - rounded)} left` };
  };

  const renderCourseCard = (course: Course) => {
    const isExpanded = expandedCourses.has(course.id);
    const sortedWeights = [...course.weights].sort((a, b) => b.percentage - a.percentage);
    const total = sumWeights(course.weights);
    const status = getTotalStatus(total);
    const scale = Math.max(100, total);

    return (
      <View
        key={course.id}
        style={[styles.courseCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}
      >
        <TouchableOpacity
          style={styles.courseHeader}
          onPress={() => toggleCourseExpansion(course.id)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={2}>
              {course.name}
            </Text>
            <Text style={[styles.courseMeta, { color: colors.textSecondary }]}>
              {course.weights.length === 0
                ? 'No components yet'
                : `${course.weights.length} component${course.weights.length === 1 ? '' : 's'} · ${formatPct(total)}`}
            </Text>
          </View>
          {course.weights.length > 0 && (
            <View style={[styles.statusChip, { backgroundColor: status.soft }]}>
              <Ionicons name={status.icon} size={14} color={status.tone} />
              <Text style={[styles.statusChipText, { color: status.tone }]}>{status.label}</Text>
            </View>
          )}
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Stacked weight bar */}
        <View style={[styles.bar, { backgroundColor: colors.surfaceSunken }]}>
          {sortedWeights.map((weight, index) => (
            <View
              key={weight.id}
              style={{
                width: `${(weight.percentage / scale) * 100}%`,
                backgroundColor: segmentPalette[index % segmentPalette.length],
              }}
            />
          ))}
        </View>

        {isExpanded && (
          <View style={styles.weightsSection}>
            {sortedWeights.map((weight, index) => (
              <TouchableOpacity
                key={weight.id}
                style={[styles.weightRow, { borderBottomColor: colors.divider }]}
                onPress={() => handleEditWeight(course, weight)}
                activeOpacity={0.7}
              >
                <View style={[styles.weightDot, { backgroundColor: segmentPalette[index % segmentPalette.length] }]} />
                <Text style={[styles.weightName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {weight.name}
                </Text>
                <Text style={[styles.weightPercentage, { color: colors.textPrimary }]}>{formatPct(weight.percentage)}</Text>
                <TouchableOpacity
                  onPress={() => handleDeleteWeight(course.id, weight.id)}
                  hitSlop={10}
                  accessibilityLabel={`Delete ${weight.name}`}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.addWeightButton, { borderColor: withAlpha(colors.primary, 0.45), backgroundColor: colors.primarySoft }]}
              onPress={() => handleAddWeight(course)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={[styles.addWeightText, { color: colors.primary }]}>Add component</Text>
            </TouchableOpacity>

            <View style={styles.courseFooter}>
              <TouchableOpacity style={styles.footerAction} onPress={() => handleEditCourse(course)} hitSlop={6}>
                <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
                <Text style={[styles.footerActionText, { color: colors.textSecondary }]}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerAction} onPress={() => handleDeleteCourse(course.id)} hitSlop={6}>
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
                <Text style={[styles.footerActionText, { color: colors.danger }]}>Delete course</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderChip = (label: string, active: boolean, onPress: () => void, key?: string | number) => (
    <TouchableOpacity
      key={key ?? label}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surfaceSunken,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, { color: active ? colors.onPrimary : colors.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );

  const previewStatus = getTotalStatus(previewTotal);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppBar
        title="Course Weights"
        variant="back"
        showNotifications={false}
        rightActions={
          courses.length > 0 ? (
            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: colors.dangerSoft, borderColor: colors.border }]}
              onPress={handleDeleteAllCourses}
              accessibilityLabel="Delete all courses"
            >
              <Ionicons name="trash-outline" size={19} color={colors.danger} />
            </TouchableOpacity>
          ) : undefined
        }
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {courses.length > 0 ? (
          <>
            <Text style={[styles.intro, { color: colors.textSecondary }]}>
              Plan how each course is graded. Components should add up to 100%.
            </Text>
            {courses.map(renderCourseCard)}
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="calculator-outline" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>No courses yet</Text>
            <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
              Add a course and break it down into midterms, quizzes, assignments and more.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add course FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: insets.bottom + 20 },
          Shadow.glow(colors.primary),
        ]}
        onPress={handleAddCourse}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={22} color={colors.onPrimary} />
        <Text style={[styles.fabText, { color: colors.onPrimary }]}>Add course</Text>
      </TouchableOpacity>

      {/* Course editor */}
      <BottomSheet
        visible={courseSheetVisible}
        onRequestClose={() => setCourseSheetVisible(false)}
        heightRatio={0.4}
        header={
          <SheetHeader
            colors={colors}
            title={editingCourse ? 'Rename course' : 'New course'}
            right={
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSaveCourse}>
                <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>Save</Text>
              </TouchableOpacity>
            }
          />
        }
      >
        <View style={styles.sheetBody}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Course name</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surfaceSunken, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="e.g. Data Structures"
            placeholderTextColor={colors.textTertiary}
            value={courseName}
            onChangeText={setCourseName}
            onSubmitEditing={handleSaveCourse}
            returnKeyType="done"
            autoFocus
          />
        </View>
      </BottomSheet>

      {/* Weight editor */}
      <BottomSheet
        visible={weightSheetVisible}
        onRequestClose={() => setWeightSheetVisible(false)}
        heightRatio={0.72}
        header={
          <SheetHeader
            colors={colors}
            title={editingWeight ? 'Edit component' : 'Add component'}
            subtitle={selectedCourse?.name}
            right={
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSaveWeight}>
                <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>Save</Text>
              </TouchableOpacity>
            }
          />
        }
      >
        <View style={styles.sheetBody}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surfaceSunken, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="e.g. Midterm"
            placeholderTextColor={colors.textTertiary}
            value={weightName}
            onChangeText={setWeightName}
          />
          <View style={styles.chipRow}>
            {PRESET_WEIGHT_NAMES.map((name) => renderChip(name, weightName === name, () => setWeightName(name)))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: Spacing.xl }]}>Weight</Text>
          <View style={[styles.percentInputWrap, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
            <TextInput
              style={[styles.percentInput, { color: colors.textPrimary }]}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              value={weightPercentage}
              onChangeText={setWeightPercentage}
              keyboardType="numeric"
            />
            <Text style={[styles.percentSuffix, { color: colors.textSecondary }]}>%</Text>
          </View>
          <View style={styles.chipRow}>
            {remainingForWeight > 0 &&
              renderChip(
                `Remaining ${formatPct(remainingForWeight)}`,
                parsedPercentage === remainingForWeight,
                () => setWeightPercentage(String(remainingForWeight)),
                'remaining'
              )}
            {PRESET_PERCENTAGES.map((pct) =>
              renderChip(`${pct}%`, parsedPercentage === pct, () => setWeightPercentage(String(pct)), pct)
            )}
          </View>

          <View style={[styles.previewRow, { backgroundColor: previewStatus.soft }]}>
            <Ionicons name={previewStatus.icon} size={16} color={previewStatus.tone} />
            <Text style={[styles.previewText, { color: previewStatus.tone }]}>
              Course total after saving: {formatPct(previewTotal)}
              {previewStatus.label !== 'Complete' ? ` · ${previewStatus.label}` : ''}
            </Text>
          </View>
        </View>
      </BottomSheet>

      {/* Custom Alert Component */}
      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
  },
  intro: {
    ...Type.subtext,
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.xs,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  courseName: {
    ...Type.h3,
  },
  courseMeta: {
    ...Type.subtext,
    marginTop: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginTop: Spacing.md,
    gap: 2,
  },
  weightsSection: {
    marginTop: Spacing.sm,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weightDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  weightName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  weightPercentage: {
    fontSize: 15,
    fontWeight: '800',
  },
  addWeightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addWeightText: {
    fontSize: 14,
    fontWeight: '700',
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyStateTitle: {
    ...Type.h2,
    marginBottom: Spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xl,
    height: 52,
    borderRadius: Radius.pill,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '800',
  },
  saveButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  sheetBody: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  fieldLabel: {
    ...Type.overline,
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  percentInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
  },
  percentInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    paddingVertical: Spacing.md,
  },
  percentSuffix: {
    fontSize: 18,
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  previewText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
});
