import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CourseWithGrades } from './types';

interface ExpandableCourseCardProps {
  course: CourseWithGrades;
  onToggle: () => void;
  getGradeColor: (percentage: number) => string;
  formatCourseName: (courseText: string) => string;
  getCourseCodeParts: (courseText: string) => { code: string; number: string };
}

export default function ExpandableCourseCard({
  course,
  onToggle,
  getGradeColor,
  formatCourseName,
  getCourseCodeParts,
}: ExpandableCourseCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.expandableCourseContainer}>
      <TouchableOpacity
        style={[
          styles.expandableCourseCard,
          {
            backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3',
            borderColor: colors.border,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderBottomLeftRadius: course.isExpanded ? 0 : 16,
            borderBottomRightRadius: course.isExpanded ? 0 : 16,
          },
        ]}
        onPress={onToggle}
      >
        <View style={styles.expandableCourseContent}>
          {/* Course Code Badge */}
          <View style={[
            styles.expandableCourseIcon,
            { 
              backgroundColor: course.midtermGrade ? colors.tint + '20' : colors.border + '40',
              borderColor: course.midtermGrade ? colors.tint + '40' : colors.border + '60'
            }
          ]}>
            {(() => {
              const { code, number } = getCourseCodeParts(course.text);
              return (
                <>
                  <Text style={[
                    styles.expandableCourseIconText,
                    { color: course.midtermGrade ? colors.tint : colors.tabIconDefault }
                  ]}>
                    {code}
                  </Text>
                  <Text style={[
                    styles.expandableCourseIconNumber,
                    { color: course.midtermGrade ? colors.tint : colors.tabIconDefault }
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
              {formatCourseName(course.text)}
            </Text>
            <View style={styles.expandableCourseMeta}>
              <View style={[
                styles.statusBadge,
                { 
                  backgroundColor: course.midtermGrade ? colors.tint + '15' : colors.border + '30',
                  borderColor: course.midtermGrade ? colors.tint + '30' : colors.border + '50'
                }
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  { color: course.midtermGrade ? colors.tint : colors.tabIconDefault }
                ]}>
                  {course.midtermGrade ? 'Midterm Result' : 'No Midterm Grade'}
                </Text>
                {course.midtermGrade && (
                  <Text
                    style={[
                      styles.statusBadgeGrade,
                      { color: getGradeColor(course.midtermGrade.percentage) }
                    ]}
                  >
                    {course.midtermGrade.percentage.toFixed(1)}%
                  </Text>
                )}
              </View>
            </View>
          </View>
          
          {/* Grade and Action Section */}
          <View style={styles.expandableCourseRight}>
            <View style={[
              styles.expandButton,
              { 
                backgroundColor: colors.border + '60',
                borderColor: colors.border + '70'
              }
            ]}>
              <Ionicons 
                name={course.isExpanded ? "caret-up" : "caret-down"} 
                size={14} 
                color={colors.secondaryFont}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
      
      {course.isExpanded && (
        <View style={[
          styles.expandedContent,
          {
            backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3',
            borderColor: colors.border,
          }
        ]}>
          {course.isLoadingDetails ? (
            <View style={styles.loadingDetailContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.tabIconDefault }]}>
                Loading grades...
              </Text>
            </View>
          ) : course.detailedGrades && course.detailedGrades.length > 0 ? (
            <>
              <View style={styles.expandedHeader}>
                <Text style={[styles.expandedTitle, { color: colors.text }]}>
                  {course.text.replace(/&amp;/g, '&')}
                </Text>
              </View>
              {course.detailedGrades.map((grade, gradeIndex) => (
                <View key={gradeIndex} style={[styles.detailedGradeItem, { borderColor: colors.border }]}>
                  <Text style={[styles.detailedGradeName, { color: colors.text }]} numberOfLines={0}>
                    {grade.course.replace(/&amp;/g, '&')}
                  </Text>
                  <View style={styles.detailedGradeRight}>
                    <Text
                      style={[
                        styles.detailedGradePercentage,
                        { color: getGradeColor(grade.percentage) },
                      ]}
                    >
                      {grade.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View>
              {course.midtermGrade && (
                <View style={styles.expandedHeader}>
                  <Text style={[styles.expandedTitle, { color: colors.text }]}>
                    Midterm Grade: {course.midtermGrade.percentage.toFixed(1)}%
                  </Text>
                </View>
              )}
              <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                No additional grades available for this course
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  expandableCourseContainer: {
    marginBottom: 8,
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
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  statusBadgeGrade: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  expandableCourseRight: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 8,
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
  expandButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDetailContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  expandedContent: {
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandedTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailedGradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
    borderRadius: 8,
  },
  detailedGradeName: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
    lineHeight: 20,
  },
  detailedGradeRight: {
    alignItems: 'flex-end',
  },
  detailedGradePercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
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
