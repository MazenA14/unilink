import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Course, Semester } from './types';

interface SemesterTableProps {
  semester: Semester;
  index: number;
}

export default function SemesterTable({ semester, index }: SemesterTableProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const getGradeColor = (letterGrade: string): string => {
    const grade = letterGrade.toUpperCase().trim();
    
    switch (grade) {
      case 'A':
      case 'A+':
      case 'A-':
        return colors.gradeExcellent; // Green for A grades
      case 'B':
      case 'B+':
      case 'B-':
        return colors.gradeGood; // Light Green for B grades
      case 'C':
      case 'C+':
      case 'C-':
        return colors.gradeAverage; // Orange for C grades
      case 'D':
      case 'D+':
        return colors.gradeBelowAverage; // Red Orange for D grades
      case 'F':
        return colors.gradeFailing; // Red for F grades
      default:
        return colors.secondaryFont; // Default color for unknown grades
    }
  };

  const getSemesterGPAColor = (gpa: string): string => {
    const numericGPA = parseFloat(gpa);
    
    // GPA range: 0.7 (best) to 5 (worst)
    // Divide into 5 color ranges
    if (numericGPA <= 1.5) {
      return colors.gradeExcellent; // Best range: 0.7 - 1.5 (A equivalent)
    } else if (numericGPA <= 2.2) {
      return colors.gradeGood; // Good range: 1.5 - 2.2 (B equivalent)
    } else if (numericGPA <= 2.8) {
      return colors.gradeAverage; // Average range: 2.2 - 2.8 (C equivalent)
    } else if (numericGPA <= 3.5) {
      return colors.gradeBelowAverage; // Below average range: 2.8 - 3.5 (D equivalent)
    } else {
      return colors.gradeFailing; // Worst range: 3.5 - 5.0 (F equivalent)
    }
  };

  const renderCourseRow = (course: Course, courseIndex: number) => (
    <View key={courseIndex} style={[styles.courseRow, { borderBottomColor: colors.border }]}>
      <View style={styles.courseSemester}>
        <Text style={[styles.courseText, { color: colors.secondaryFont }]}>{course.semester}</Text>
      </View>
      <View style={styles.courseName}>
        <Text style={[styles.courseText, { color: colors.mainFont }]}>{course.courseName}</Text>
      </View>
      <View style={styles.courseNumeric}>
        <Text style={[styles.courseText, styles.boldText, { color: getGradeColor(course.letterGrade) }]}>{course.numericGrade}</Text>
      </View>
      <View style={styles.courseGrade}>
        <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(course.letterGrade) }]}>
          <Text style={[styles.gradeText, { color: '#FFFFFF' }]}>{course.letterGrade}</Text>
        </View>
      </View>
      <View style={styles.courseHours}>
        <Text style={[styles.courseText, { color: colors.secondaryFont }]}>{course.creditHours}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.semesterTable, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={[styles.semesterHeader, { backgroundColor: colors.tabColor }]}>
        <Text style={[styles.semesterTitle, { color: '#FFFFFF' }]}>{semester.name}</Text>
      </View>
      
      {/* Table Header */}
      <View style={[styles.tableHeader, { backgroundColor: colors.background }]}>
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
      <View style={[styles.semesterSummary, { backgroundColor: colors.background }]}>
        <View style={styles.courseSemester}></View>
        <View style={styles.courseName}>
          <Text style={[styles.summaryText, { color: colors.mainFont }]}>Semester GPA</Text>
        </View>
        <View style={styles.courseNumeric}>
          <Text style={[styles.summaryText, styles.boldText, { color: getSemesterGPAColor(semester.semesterGPA) }]}>{semester.semesterGPA}</Text>
        </View>
        <View style={styles.courseGrade}></View>
        <View style={styles.courseHours}>
          <Text style={[styles.summaryText, { color: colors.secondaryFont }]}>{semester.totalHours}h</Text>
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
  semesterTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
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
