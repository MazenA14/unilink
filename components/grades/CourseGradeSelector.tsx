import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GUCAPIProxy, GradeData } from '@/utils/gucApiProxy';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Course {
  value: string;
  text: string;
}

interface CourseGradeSelectorProps {
  getGradeColor: (percentage: number) => string;
  formatCourseName: (courseText: string) => string;
  getCourseCodeParts: (courseText: string) => { code: string; number: string };
}

export default function CourseGradeSelector({
  getGradeColor,
  formatCourseName,
  getCourseCodeParts,
}: CourseGradeSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // State management
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Load available courses on component mount
  useEffect(() => {
    loadAvailableCourses();
  }, []);

  const loadAvailableCourses = async () => {
    try {
      setLoadingCourses(true);
      const availableCourses = await GUCAPIProxy.getAvailableCourses();
      setCourses(availableCourses);
    } catch (error) {
      Alert.alert('Error', 'Failed to load available courses. Please try again.');
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleCourseSelect = async (course: Course) => {
    try {
      setSelectedCourse(course);
      setShowDropdown(false);
      setLoadingGrades(true);
      setGrades([]);

      const courseGrades = await GUCAPIProxy.getCourseGrades(course.value);
      setGrades(courseGrades);
    } catch (error) {
      Alert.alert('Error', 'Failed to load grades for the selected course. Please try again.');
    } finally {
      setLoadingGrades(false);
    }
  };

  const calculateAverage = () => {
    if (grades.length === 0) return 0;
    return grades.reduce((sum, grade) => sum + grade.percentage, 0) / grades.length;
  };

  return (
    <View style={styles.container}>
      {/* Course Selection Section */}
      <View style={styles.courseSelectionSection}>
        <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>Select Course</Text>
        
        {loadingCourses ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>
              Loading courses...
            </Text>
          </View>
        ) : (
           <TouchableOpacity
             style={[
               styles.dropdownButton,
               {
                 backgroundColor: colors.cardBackground,
                 borderColor: colors.border,
               }
             ]}
             onPress={() => setShowDropdown(!showDropdown)}
             activeOpacity={0.7}
           >
             <Text style={[
               styles.dropdownButtonText,
               { color: selectedCourse ? colors.mainFont : colors.secondaryFont }
             ]}>
               {selectedCourse ? selectedCourse.text : 'Choose a Course'}
             </Text>
             <Ionicons
               name={showDropdown ? 'chevron-up' : 'chevron-down'}
               size={20}
               color={colors.secondaryFont}
             />
           </TouchableOpacity>
        )}

        {/* Dropdown List */}
        {showDropdown && courses.length > 0 && (
          <View style={[
            styles.dropdownList,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            }
          ]}>
            {courses.map((course, index) => (
              <TouchableOpacity
                key={course.value}
                style={[
                  styles.dropdownItem,
                  index < courses.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }
                ]}
                onPress={() => handleCourseSelect(course)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownItemText, { color: colors.mainFont }]}>
                  {course.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Grades Display Section */}
      {selectedCourse && (
        <View style={styles.gradesSection}>
          <View style={styles.gradesHeader}>
            <Text style={[styles.sectionTitle, { color: colors.mainFont }]}>
              {formatCourseName(selectedCourse.text)}
            </Text>
            {grades.length > 0 && (
              <View style={styles.gradesMetrics}>
                <Text style={[styles.gradesSubtitle, { color: colors.secondaryFont }]}>
                  {grades.length} grade{grades.length !== 1 ? 's' : ''} available
                </Text>
                <Text style={[styles.gradesAverage, { color: colors.mainFont }]}>
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
              <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>
                Loading grades...
              </Text>
            </View>
          ) : grades.length > 0 ? (
            <View style={styles.gradesList}>
              {grades.map((grade, index) => (
                <View key={index}                   style={[
                    styles.gradeCard,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border,
                    }
                  ]}>
                  <View style={styles.gradeContent}>
                    {/* Course Code Badge */}
                    <View style={[
                      styles.gradeIcon,
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
                              styles.gradeIconText,
                              { color: colors.tint }
                            ]}>
                              {code}
                            </Text>
                            <Text style={[
                              styles.gradeIconNumber,
                              { color: colors.tint }
                            ]}>
                              {number}
                            </Text>
                          </>
                        );
                      })()}
                    </View>

                    {/* Grade Info */}
                    <View style={styles.gradeInfo}>
                      <Text
                        style={[styles.gradeTitle, { color: colors.mainFont }]}
                        numberOfLines={2}
                      >
                        {formatCourseName(grade.course)}
                      </Text>
                      <View style={styles.gradeMeta}>
                        <View style={[
                          styles.gradeBadge,
                          { backgroundColor: getGradeColor(grade.percentage) + '15' }
                        ]}>
                          <Text style={[
                            styles.gradePercentage,
                            { color: getGradeColor(grade.percentage) }
                          ]}>
                            {grade.percentage.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: colors.secondaryFont }]}>
                No Grades Available
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.secondaryFont }]}>
                No grades have been posted for this course yet.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  courseSelectionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  gradesSection: {
    marginTop: 8,
  },
  gradesHeader: {
    marginBottom: 16,
  },
  gradesMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  gradesSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  gradesAverage: {
    fontSize: 16,
    fontWeight: '600',
  },
  gradesList: {
    gap: 12,
  },
  gradeCard: {
    borderWidth: 1,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  gradeIcon: {
    width: 48,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gradeIconText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 10,
  },
  gradeIconNumber: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 9,
    marginTop: 1,
  },
  gradeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  gradeTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 6,
  },
  gradeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  gradePercentage: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
});
