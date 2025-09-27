import { useCustomAlert } from '@/components/CustomAlert';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GradeCache } from '@/utils/gradeCache';
import { GUCAPIProxy, GradeData } from '@/utils/gucApiProxy';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Course {
  value: string;
  text: string;
}

interface CourseWithGrades {
  value: string;
  text: string;
  grades: GradeData[];
  isExpanded: boolean;
  isLoadingDetails: boolean;
}

interface CurrentGradesSectionProps {
  getGradeColor: (percentage: number) => string;
  formatCourseName: (courseText: string) => string;
  getCourseCodeParts: (courseText: string) => { code: string; number: string };
  onRefresh?: () => Promise<void>;
  refreshTrigger?: number; // Add refresh trigger prop
}

export default function CurrentGradesSection({
  getGradeColor,
  formatCourseName,
  getCourseCodeParts,
  onRefresh,
  refreshTrigger,
}: CurrentGradesSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();

  // State management
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesWithGrades, setCoursesWithGrades] = useState<CourseWithGrades[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // Load available courses on component mount
  useEffect(() => {
    loadAvailableCourses();
  }, []);

  // Reload courses when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadAvailableCourses(true); // Force refresh
    }
  }, [refreshTrigger]);

  // Utility function to get course name by ID using cache
  const getCourseNameById = async (courseId: string): Promise<string | null> => {
    try {
      const cachedMapping = await GradeCache.getCachedCourseIdToName();
      if (cachedMapping && cachedMapping[courseId]) {
        return cachedMapping[courseId];
      }
      
      // If not in cache, find in current courses
      const course = courses.find(c => c.value === courseId);
      return course ? course.text : null;
    } catch (error) {
      return null;
    }
  };

  const loadAvailableCourses = async (forceRefresh: boolean = false) => {
    try {
      setLoadingCourses(true);
      
      // Try to load from cache first (unless forced refresh)
      if (!forceRefresh) {
        const cachedCourses = await GradeCache.getCachedCurrentCourses();
        if (cachedCourses) {
          setCourses(cachedCourses);
          
          // Initialize courses with empty grades
          const initialCoursesWithGrades: CourseWithGrades[] = cachedCourses.map(course => ({
            ...course,
            grades: [],
            isExpanded: false,
            isLoadingDetails: false,
          }));
          setCoursesWithGrades(initialCoursesWithGrades);
          setLoadingCourses(false);
          return;
        }
      }

      const availableCourses = await GUCAPIProxy.getAvailableCourses();
      setCourses(availableCourses);
      
      // Cache the results
      await GradeCache.setCachedCurrentCourses(availableCourses);
      
      // Cache course ID to name mapping
      const courseIdToNameMapping: { [courseId: string]: string } = {};
      availableCourses.forEach(course => {
        courseIdToNameMapping[course.value] = course.text;
      });
      await GradeCache.setCachedCourseIdToName(courseIdToNameMapping);
      
      // Initialize courses with empty grades
      const initialCoursesWithGrades: CourseWithGrades[] = availableCourses.map(course => ({
        ...course,
        grades: [],
        isExpanded: false,
        isLoadingDetails: false,
      }));
      setCoursesWithGrades(initialCoursesWithGrades);
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to load available courses. Please try again.',
        type: 'error',
      });
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadCourseGrades = async (courseId: string, courseIndex: number) => {
    try {
      const updatedCourses = [...coursesWithGrades];
      updatedCourses[courseIndex].isLoadingDetails = true;
      setCoursesWithGrades([...updatedCourses]);

      // Try to load from cache first
      const cachedGrades = await GradeCache.getCachedCurrentCourseGrades(courseId);
      let courseGrades: GradeData[];
      
      if (cachedGrades) {
        courseGrades = cachedGrades;
      } else {
        // Load from API and cache the results
        courseGrades = await GUCAPIProxy.getCourseGrades(courseId);
        await GradeCache.setCachedCurrentCourseGrades(courseId, courseGrades);
      }
      
      updatedCourses[courseIndex].grades = courseGrades;
      updatedCourses[courseIndex].isLoadingDetails = false;
      setCoursesWithGrades([...updatedCourses]);
    } catch (error) {
      const updatedCourses = [...coursesWithGrades];
      updatedCourses[courseIndex].isLoadingDetails = false;
      setCoursesWithGrades([...updatedCourses]);
      showAlert({
        title: 'Error',
        message: 'Failed to load grades for this course. Please try again.',
        type: 'error',
      });
    }
  };

  const handleCourseToggle = async (courseIndex: number) => {
    const updatedCourses = [...coursesWithGrades];
    const course = updatedCourses[courseIndex];
    
    if (!course.isExpanded) {
      // Expanding - load grades if not already loaded
      course.isExpanded = true;
      if (course.grades.length === 0) {
        await loadCourseGrades(course.value, courseIndex);
      }
    } else {
      // Collapsing
      course.isExpanded = false;
    }
    
    setCoursesWithGrades([...updatedCourses]);
  };

  const calculateAverage = () => {
    const coursesWithMidtermGrades = coursesWithGrades.filter(course => course.grades.length > 0);
    if (coursesWithMidtermGrades.length === 0) return 0;
    
    const allGrades = coursesWithMidtermGrades.flatMap(course => course.grades);
    if (allGrades.length === 0) return 0;
    
    return allGrades.reduce((sum, grade) => sum + grade.percentage, 0) / allGrades.length;
  };

  const handleRefresh = async () => {
    try {
      // Clear current grades cache
      await GradeCache.clearCurrentCoursesCache();
      await GradeCache.clearCurrentCourseGradesCache();
      await GradeCache.clearCourseIdToNameCache();
      
      // Reload courses with force refresh
      await loadAvailableCourses(true);
      
      // Call parent refresh if provided
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
    }
  };

  if (loadingCourses) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.tabIconDefault }]}>
          Loading courses...
        </Text>
      </View>
    );
  }

  if (courses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Courses Available</Text>
        <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
          No courses were found for the current semester.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Grades</Text>
        <View style={styles.metrics}>
          <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
            {courses.length} course{courses.length !== 1 ? 's' : ''} available
          </Text>
          {coursesWithGrades.some(course => course.grades.length > 0) && (
            <Text style={[styles.average, { color: colors.text }]}>
              Average: <Text style={{ color: getGradeColor(calculateAverage()) }}>
                {calculateAverage().toFixed(1)}%
              </Text>
            </Text>
          )}
        </View>
      </View>

      {/* Course Grid */}
      <View style={styles.courseGrid}>
        {coursesWithGrades.map((course, index) => (
          <ExpandableCourseCard
            key={course.value}
            course={course}
            onToggle={() => handleCourseToggle(index)}
            getGradeColor={getGradeColor}
            formatCourseName={formatCourseName}
            getCourseCodeParts={getCourseCodeParts}
          />
        ))}
      </View>
    </View>
  );
}

// ExpandableCourseCard component for current grades
interface ExpandableCourseCardProps {
  course: CourseWithGrades;
  onToggle: () => void;
  getGradeColor: (percentage: number) => string;
  formatCourseName: (courseText: string) => string;
  getCourseCodeParts: (courseText: string) => { code: string; number: string };
}

function ExpandableCourseCard({
  course,
  onToggle,
  getGradeColor,
  formatCourseName,
  getCourseCodeParts,
}: ExpandableCourseCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const hasMidtermGrade = course.grades.length > 0;
  const averageGrade = hasMidtermGrade 
    ? course.grades.reduce((sum, grade) => sum + grade.percentage, 0) / course.grades.length
    : 0;

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
              backgroundColor: hasMidtermGrade ? colors.tint + '20' : colors.noGrades + '20',
              borderColor: hasMidtermGrade ? colors.tint + '40' : colors.noGrades + '40'
            }
          ]}>
            {(() => {
              const { code, number } = getCourseCodeParts(course.text);
              return (
                <>
                  <Text style={[
                    styles.expandableCourseIconText,
                    { color: hasMidtermGrade ? colors.tint : colors.noGrades }
                  ]}>
                    {code}
                  </Text>
                  <Text style={[
                    styles.expandableCourseIconNumber,
                    { color: hasMidtermGrade ? colors.tint : colors.noGrades }
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
                  backgroundColor: hasMidtermGrade ? colors.tint + '15' : colors.noGrades + '15',
                  borderColor: hasMidtermGrade ? colors.tint + '30' : colors.noGrades + '30'
                }
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  { color: hasMidtermGrade ? colors.tint : colors.noGrades }
                ]}>
                  {hasMidtermGrade ? `${course.grades.length} Grade${course.grades.length !== 1 ? 's' : ''}` : 'No Midterm Grade'}
                </Text>
                {hasMidtermGrade && (
                  <Text
                    style={[
                      styles.statusBadgeGrade,
                      { color: getGradeColor(averageGrade) }
                    ]}
                  >
                    {averageGrade.toFixed(1)}%
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
          ) : course.grades.length > 0 ? (
            <>
              <View style={styles.expandedHeader}>
                <Text style={[styles.expandedTitle, { color: colors.text }]}>
                  {formatCourseName(course.text)}
                </Text>
                <Text style={[styles.expandedSubtitle, { color: colors.tabIconDefault }]}>
                  Average: <Text style={{ color: getGradeColor(averageGrade) }}>
                    {averageGrade.toFixed(1)}%
                  </Text>
                </Text>
              </View>
              {course.grades.map((grade, gradeIndex) => (
                <View key={gradeIndex} style={[styles.detailedGradeItem, { borderColor: colors.border }]}>
                  <Text style={[styles.detailedGradeName, { color: colors.text }]} numberOfLines={2}>
                    {formatCourseName(grade.course)}
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
            <View style={styles.emptyGradesContainer}>
              <Text style={[styles.emptyGradesText, { color: colors.tabIconDefault }]}>
                No grades have been posted for this course yet.
              </Text>
            </View>
          )}
        </View>
      )}
      
      {/* Custom Alert Component */}
      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  header: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  average: {
    fontSize: 16,
    fontWeight: '600',
  },
  courseGrid: {
    gap: 8,
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
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
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
    marginBottom: 12,
  },
  expandedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  expandedSubtitle: {
    fontSize: 14,
    fontWeight: '500',
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
  emptyGradesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyGradesText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});