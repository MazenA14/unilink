import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GradeData } from './types';

interface CurrentGradesSectionProps {
  grades: GradeData[];
  loadingGrades: boolean;
  refreshing: boolean;
  getGradeColor: (percentage: number) => string;
  formatCourseName: (courseText: string) => string;
  getCourseCodeParts: (courseText: string) => { code: string; number: string };
}

export default function CurrentGradesSection({
  grades,
  loadingGrades,
  refreshing,
  getGradeColor,
  formatCourseName,
  getCourseCodeParts,
}: CurrentGradesSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const calculateAverage = () => {
    if (grades.length === 0) return 0;
    return grades.reduce((sum, grade) => sum + grade.percentage, 0) / grades.length;
  };

  return (
    <View style={styles.section}>
      <View style={styles.courseGridHeader}>
        <Text style={[styles.courseGridTitle, { color: colors.text }]}>Current Grades</Text>
        {grades.length > 0 && (
          <View style={styles.courseGridMetrics}>
            <Text style={[styles.courseGridSubtitle, { color: colors.tabIconDefault }]}>
              {grades.length} course{grades.length !== 1 ? 's' : ''} available
            </Text>
            <Text style={[styles.courseGridAverage, { color: colors.text }]}>
              Average: <Text style={{ color: getGradeColor(calculateAverage()) }}>
                {calculateAverage().toFixed(1)}%
              </Text>
            </Text>
          </View>
        )}
      </View>
      
      {loadingGrades ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.tabIconDefault }]}>
            {refreshing ? 'Refreshing...' : 'Loading current grades...'}
          </Text>
        </View>
      ) : grades.length > 0 ? (
        <View style={styles.courseGrid}>
          {grades.map((grade, index) => (
            <View key={index} style={[
              styles.expandableCourseCard,
              {
                backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3',
                borderColor: colors.border,
                borderRadius: 16,
              },
            ]}>
              <View style={styles.expandableCourseContent}>
                {/* Course Code Badge */}
                <View style={[
                  styles.expandableCourseIcon,
                  { 
                    backgroundColor: colors.tint + '20',
                    borderColor: colors.tint + '40'
                  }
                ]}>
                  {(() => {
                    const { code, number } = getCourseCodeParts(grade.course);
                    return (
                      <>
                        <Text style={[
                          styles.expandableCourseIconText,
                          { color: colors.tint }
                        ]}>
                          {code}
                        </Text>
                        <Text style={[
                          styles.expandableCourseIconNumber,
                          { color: colors.tint }
                        ]}>
                          {number}
                        </Text>
                      </>
                    );
                  })()}
                </View>

                {/* Course Info Section */}
                <View style={styles.expandableCourseInfo}>
                  <Text
                    style={[styles.expandableCourseTitle, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {formatCourseName(grade.course)}
                  </Text>
                  <View style={styles.expandableCourseMeta}>
                    <View style={[
                      styles.statusBadge,
                      { 
                        backgroundColor: colors.tint + '15',
                        borderColor: colors.tint + '30'
                      }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: colors.tint }
                      ]}>
                        Current Grade
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Grade Section */}
                <View style={styles.expandableCourseRight}>
                  <View style={[
                    styles.gradeBadge,
                    { backgroundColor: getGradeColor(grade.percentage) + '15' }
                  ]}>
                    <Text
                      style={[
                        styles.expandableCourseGrade,
                        { color: getGradeColor(grade.percentage) }
                      ]}
                    >
                      {grade.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.tabIconDefault }]}>No Grades Available</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
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
  expandableCourseCard: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  expandableCourseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  expandableCourseIcon: {
    width: 56,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  expandableCourseIconText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 12,
  },
  expandableCourseIconNumber: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 10,
    marginTop: 1,
  },
  expandableCourseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  expandableCourseTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 6,
  },
  expandableCourseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  expandableCourseRight: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 0,
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  expandableCourseGrade: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
});
