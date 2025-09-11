import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Course, Semester } from './types';

interface SemesterTableProps {
  semester: Semester;
  index: number;
}

export default function SemesterTable({ semester, index }: SemesterTableProps) {
  const getGradeColor = (grade: string): string => {
    const numericGrade = parseFloat(grade);
    if (numericGrade >= 3.7) return '#34C759'; // Green for A grades
    if (numericGrade >= 3.0) return '#30D158'; // Light green for B grades
    if (numericGrade >= 2.0) return '#FF9500'; // Orange for C grades
    return '#FF3B30'; // Red for D/F grades
  };

  const renderCourseRow = (course: Course, courseIndex: number) => (
    <View key={courseIndex} style={[styles.courseRow, { borderBottomColor: '#E5E5EA' }]}>
      <View style={styles.courseSemester}>
        <Text style={[styles.courseText, { color: '#8E8E93' }]}>{course.semester}</Text>
      </View>
      <View style={styles.courseName}>
        <Text style={[styles.courseText, { color: '#1C1C1E' }]}>{course.courseName}</Text>
      </View>
      <View style={styles.courseNumeric}>
        <Text style={[styles.courseText, { color: getGradeColor(course.numericGrade) }]}>{course.numericGrade}</Text>
      </View>
      <View style={styles.courseGrade}>
        <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(course.numericGrade) }]}>
          <Text style={[styles.gradeText, { color: '#FFFFFF' }]}>{course.letterGrade}</Text>
        </View>
      </View>
      <View style={styles.courseHours}>
        <Text style={[styles.courseText, { color: '#8E8E93' }]}>{course.creditHours}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.semesterTable, { backgroundColor: '#FFFFFF', borderColor: '#E5E5EA' }]}>
      <View style={[styles.semesterHeader, { backgroundColor: '#007AFF' }]}>
        <Text style={[styles.semesterTitle, { color: '#FFFFFF' }]}>{semester.name}</Text>
      </View>
      
      {/* Table Header */}
      <View style={[styles.tableHeader, { backgroundColor: '#F2F2F7' }]}>
        <View style={styles.courseSemester}>
          <Text style={[styles.headerText, { color: '#8E8E93' }]}>Code</Text>
        </View>
        <View style={styles.courseName}>
          <Text style={[styles.headerText, { color: '#8E8E93' }]}>Course</Text>
        </View>
        <View style={styles.courseNumeric}>
          <Text style={[styles.headerText, { color: '#8E8E93' }]}>Grade</Text>
        </View>
        <View style={styles.courseGrade}>
          <Text style={[styles.headerText, { color: '#8E8E93' }]}>Letter</Text>
        </View>
        <View style={styles.courseHours}>
          <Text style={[styles.headerText, { color: '#8E8E93' }]}>Hours</Text>
        </View>
      </View>
      
      {/* Course Rows */}
      {semester.courses.map((course, courseIndex) => renderCourseRow(course, courseIndex))}
      
      {/* Semester Summary */}
      <View style={[styles.semesterSummary, { backgroundColor: '#F2F2F7' }]}>
        <View style={styles.courseSemester}></View>
        <View style={styles.courseName}>
          <Text style={[styles.summaryText, { color: '#1C1C1E' }]}>Semester GPA</Text>
        </View>
        <View style={styles.courseNumeric}>
          <Text style={[styles.summaryText, styles.boldText, { color: '#007AFF' }]}>{semester.semesterGPA}</Text>
        </View>
        <View style={styles.courseGrade}></View>
        <View style={styles.courseHours}>
          <Text style={[styles.summaryText, { color: '#8E8E93' }]}>{semester.totalHours}h</Text>
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
    flex: 0.8,
    alignItems: 'center',
  },
  courseName: {
    flex: 2.5,
    paddingHorizontal: 4,
  },
  courseNumeric: {
    flex: 0.6,
    alignItems: 'center',
  },
  courseGrade: {
    flex: 0.6,
    alignItems: 'center',
  },
  courseHours: {
    flex: 0.6,
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
