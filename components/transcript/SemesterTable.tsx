import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getGPAColor, getLetterGradeColor } from '@/utils/gradingColors';
import { StyleSheet, Text, View } from 'react-native';
import { Course, Semester } from './types';

interface SemesterTableProps {
  semester: Semester;
  index: number;
}

export default function SemesterTable({ semester, index }: SemesterTableProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Use unified grading color functions
  const getGradeColorForComponent = (letterGrade: string) => getLetterGradeColor(letterGrade, colors);
  const getSemesterGPAColorForComponent = (gpa: string) => getGPAColor(gpa, colors);

  const renderCourseRow = (course: Course, courseIndex: number) => (
    <View key={courseIndex} style={[styles.courseRow, { borderBottomColor: colors.border }]}>
      <View style={styles.courseSemester}>
        <Text style={[styles.courseText, { color: colors.secondaryFont }]}>{course.semester}</Text>
      </View>
      <View style={styles.courseName}>
        <Text style={[styles.courseText, { color: colors.mainFont }]}>{course.courseName}</Text>
      </View>
      <View style={styles.courseNumeric}>
        <Text style={[styles.courseText, styles.boldText, { color: getGradeColorForComponent(course.letterGrade) }]}>{course.numericGrade}</Text>
      </View>
      <View style={styles.courseGrade}>
        <View style={[styles.gradeBadge, { backgroundColor: getGradeColorForComponent(course.letterGrade) }]}>
          <Text style={[styles.gradeText, { color: '#FFFFFF' }]}>{course.letterGrade}</Text>
        </View>
      </View>
      <View style={styles.courseHours}>
        <Text style={[styles.courseText, { color: colors.secondaryFont }]}>{course.creditHours}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.semesterTable, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}>
      <View style={[styles.semesterHeader, { backgroundColor: colors.tabColor }]}>
        <View style={styles.semesterHeaderContent}>
          <Text style={[styles.semesterTitle, { color: '#FFFFFF' }]}>{semester.name}</Text>
          <View style={[styles.semesterGpaBadge, { backgroundColor: getSemesterGPAColorForComponent(semester.semesterGPA) }]}>
            <Text style={[styles.semesterGpaLabel, { color: '#FFFFFF' }]}>GPA</Text>
            <Text style={[styles.semesterGpaValue, { color: '#FFFFFF' }]}>{semester.semesterGPA}</Text>
          </View>
        </View>
      </View>
      
      {/* Table Header */}
      <View style={[styles.tableHeader, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3' }]}>
        <View style={styles.courseSemester}>
          <Text style={[styles.headerText, { color: colors.secondaryFont }]}>Semester</Text>
        </View>
        <View style={styles.courseName}>
          <Text style={[styles.headerText, { color: colors.secondaryFont }]}>Course</Text>
        </View>
        <View style={styles.courseNumeric}>
          <Text style={[styles.headerText, { color: colors.secondaryFont }]}>Grade</Text>
        </View>
        <View style={styles.courseGrade}>
          <Text style={[styles.headerText, { color: colors.secondaryFont }]}>Letter</Text>
        </View>
        <View style={styles.courseHours}>
          <Text style={[styles.headerText, { color: colors.secondaryFont }]}>Hours</Text>
        </View>
      </View>
      
      {/* Course Rows */}
      {semester.courses.map((course, courseIndex) => renderCourseRow(course, courseIndex))}
      
      {/* Semester Summary */}
      <View style={[styles.semesterSummary, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3' }]}>
        <View style={styles.summaryContent}>
          <Text style={[styles.summaryText, { color: colors.mainFont }]}>Total Credit Hours</Text>
          <Text style={[styles.summaryText, styles.boldText, { color: colors.mainFont }]}>{semester.totalHours}h</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  semesterTable: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  semesterHeader: {
    padding: 16,
    alignItems: 'center',
  },
  semesterHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  semesterTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
    marginLeft: 8,
  },
  semesterGpaBadge: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 65,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  semesterGpaLabel: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.9,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  semesterGpaValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  courseRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  semesterSummary: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseSemester: {
    flex: 1.0,
    alignItems: 'center',
  },
  courseName: {
    flex: 1.8,
    paddingHorizontal: 4,
  },
  courseNumeric: {
    flex: 0.8,
    alignItems: 'center',
  },
  courseGrade: {
    flex: 0.8,
    alignItems: 'center',
  },
  courseHours: {
    flex: 0.8,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  courseText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 32,
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '700',
  },
});
