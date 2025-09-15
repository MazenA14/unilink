import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import ExpandableCourseCard from './ExpandableCourseCard';
import { CourseWithGrades } from './types';

// Function to extract semester number from course names
const extractSemesterNumber = (courses: CourseWithGrades[]): number | null => {
  for (const course of courses) {
    const courseName = course.text.toLowerCase();
    
    // Look for patterns like "1st", "2nd", "3rd", "6th" etc.
    const semesterMatch = courseName.match(/(\d+)(?:st|nd|rd|th)/);
    if (semesterMatch) {
      return parseInt(semesterMatch[1], 10);
    }
  }
  
  return null;
};

interface CourseGridProps {
  coursesWithGrades: CourseWithGrades[];
  loadingCourses: boolean;
  loadingGrades: boolean;
  onCourseToggle: (courseIndex: number) => void;
  getGradeColor: (percentage: number) => string;
  formatCourseName: (courseText: string) => string;
  getCourseCodeParts: (courseText: string) => { code: string; number: string };
  calculateAverage: () => number;
}

export default function CourseGrid({
  coursesWithGrades,
  loadingCourses,
  loadingGrades,
  onCourseToggle,
  getGradeColor,
  formatCourseName,
  getCourseCodeParts,
  calculateAverage,
}: CourseGridProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Extract semester number from course names
  const semesterNumber = extractSemesterNumber(coursesWithGrades);
  const title = semesterNumber ? `Semester ${semesterNumber}` : 'Available Courses';

  if (loadingCourses || loadingGrades) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.tabIconDefault }]}>
          Loading courses...
        </Text>
      </View>
    );
  }

  if (coursesWithGrades.length === 0) {
    return (
      <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
        No courses found for this season
      </Text>
    );
  }

  return (
    <>
      <View style={styles.courseGridHeader}>
        <Text style={[styles.courseGridTitle, { color: colors.text }]}>{title}</Text>
        <View style={styles.courseGridMetrics}>
          <Text style={[styles.courseGridSubtitle, { color: colors.tabIconDefault }]}>
            {coursesWithGrades.length} course{coursesWithGrades.length !== 1 ? 's' : ''} available
          </Text>
          {coursesWithGrades.some(course => course.midtermGrade) && (
            <Text style={[styles.courseGridAverage, { color: colors.text }]}>
              Average: <Text style={{ color: getGradeColor(calculateAverage()) }}>{calculateAverage().toFixed(1)}%</Text>
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.courseGrid}>
        {coursesWithGrades.map((course, index) => (
          <ExpandableCourseCard
            key={course.value}
            course={course}
            onToggle={() => onCourseToggle(index)}
            getGradeColor={getGradeColor}
            formatCourseName={formatCourseName}
            getCourseCodeParts={getCourseCodeParts}
          />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  courseGridHeader: {
    marginBottom: 16,
  },
  courseGridTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  courseGridSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  courseGridMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  courseGridAverage: {
    fontSize: 16,
    fontWeight: '600',
  },
  courseGrid: {
    gap: 12,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
});
