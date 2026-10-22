import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing, Type, withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getGPAColor, getLetterGradeColor } from '@/utils/gradingColors';
import { StyleSheet, Text, View } from 'react-native';
import { Course, Semester } from './types';

interface SemesterTableProps {
  semester: Semester;
  index: number;
}

/** One semester as a card: header with GPA pill, then a list of course rows. */
export default function SemesterTable({ semester, index }: SemesterTableProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const showGPA = !!semester.semesterGPA && semester.semesterGPA !== '0';
  const gpaColor = showGPA ? getGPAColor(semester.semesterGPA, colors) : colors.secondaryFont;
  const courseCount = semester.courses.length;

  const renderCourseRow = (course: Course, courseIndex: number) => {
    const gradeColor = getLetterGradeColor(course.letterGrade, colors);
    const isLast = courseIndex === courseCount - 1;
    return (
      <View
        key={courseIndex}
        style={[
          styles.courseRow,
          !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
        ]}
      >
        <View style={[styles.gradeBadge, { backgroundColor: withAlpha(gradeColor, 0.14) }]}>
          <Text style={[styles.gradeLetter, { color: gradeColor }]} numberOfLines={1} adjustsFontSizeToFit>
            {course.letterGrade}
          </Text>
        </View>

        <View style={styles.courseInfo}>
          <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={2}>
            {course.courseName}
          </Text>
          <View style={styles.courseMeta}>
            <View style={[styles.codeTag, { backgroundColor: colors.surfaceSunken }]}>
              <Text style={[styles.codeText, { color: colors.textSecondary }]}>{course.semester}</Text>
            </View>
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {course.creditHours} credit hrs
            </Text>
          </View>
        </View>

        <View style={styles.numericCol}>
          <Text style={[styles.numericValue, { color: gradeColor }]}>{course.numericGrade}</Text>
          <Text style={[styles.numericLabel, { color: colors.textTertiary }]}>Grade</Text>
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
        Shadow.card(colors),
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.indexBubble, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.indexText, { color: colors.primary }]}>{index + 1}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.semesterTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {semester.name}
          </Text>
          <Text style={[styles.semesterSubtitle, { color: colors.textSecondary }]}>
            {courseCount} {courseCount === 1 ? 'course' : 'courses'}
            {semester.totalHours ? `  ·  ${semester.totalHours} credit hrs` : ''}
          </Text>
        </View>
        {showGPA && (
          <View style={[styles.gpaPill, { backgroundColor: withAlpha(gpaColor, 0.14), borderColor: withAlpha(gpaColor, 0.35) }]}>
            <Text style={[styles.gpaLabel, { color: gpaColor }]}>GPA</Text>
            <Text style={[styles.gpaValue, { color: gpaColor }]}>{semester.semesterGPA}</Text>
          </View>
        )}
      </View>

      {/* Course list */}
      <View style={[styles.courseList, { backgroundColor: colors.surface }]}>
        {semester.courses.map(renderCourseRow)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    padding: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  indexBubble: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 14,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
  },
  semesterTitle: {
    ...Type.h3,
  },
  semesterSubtitle: {
    ...Type.subtext,
    marginTop: 2,
  },
  gpaPill: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    minWidth: 62,
  },
  gpaLabel: {
    ...Type.overline,
    fontSize: 9,
  },
  gpaValue: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  courseList: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  gradeBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  gradeLetter: {
    fontSize: 18,
    fontWeight: '800',
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: Spacing.sm,
  },
  codeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  numericCol: {
    alignItems: 'flex-end',
    minWidth: 44,
  },
  numericValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  numericLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
});
