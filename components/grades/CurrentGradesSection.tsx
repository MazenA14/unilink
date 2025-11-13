import { useCustomAlert } from '@/components/CustomAlert';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GradeCache } from '@/utils/gradeCache';
import { GradeTracking } from '@/utils/gradeTracking';
import { GUCAPIProxy, GradeData } from '@/utils/gucApiProxy';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import ExpandableCourseCard from './ExpandableCourseCard';

interface Course {
  value: string;
  text: string;
}

interface CourseWithGrades {
  value: string;
  text: string;
  midtermGrade?: GradeData;
  detailedGrades?: GradeData[];
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
  const [gradeCounts, setGradeCounts] = useState<{ [courseId: string]: { total: number; unseen: number } }>({});

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

  // Calculate grade counts for a course
  const calculateGradeCounts = async (courseId: string, allGrades: GradeData[]): Promise<{ total: number; unseen: number }> => {
    try {
      const total = allGrades.length;
      const unseen = await GradeTracking.getUnseenGradesCount(courseId, allGrades);
      return { total, unseen };
    } catch (error) {
      console.error('Error calculating grade counts:', error);
      return { total: allGrades.length, unseen: 0 };
    }
  };

  // Prefetch grades for all courses in parallel and populate state
  const prefetchAllCourseGrades = async (courseList: Course[]) => {
    try {
      setLoadingGrades(true);
      
      // First, load midterm grades from the season-level view
      let midtermGrades: GradeData[] = [];
      try {
        const cachedMidtermGrades = await GradeCache.getCachedCurrentGrades();
        if (cachedMidtermGrades) {
          midtermGrades = cachedMidtermGrades;
        } else {
          midtermGrades = await GUCAPIProxy.getCurrentGrades();
          await GradeCache.setCachedCurrentGrades(midtermGrades);
        }
      } catch (error) {
        console.error('Error loading midterm grades:', error);
      }
      
      // Helper function to match midterm grades to courses
      const matchMidtermGradeToCourse = (course: Course): GradeData | undefined => {
        const extractCourseCode = (text: string) => {
          const match = text.match(/([A-Z]{2,4}[a-z]?\d{3,4})/);
          return match ? match[1] : '';
        };
        
        const courseCode = extractCourseCode(course.text);
        
        return midtermGrades.find(grade => {
          const gradeCode = extractCourseCode(grade.course);
          
          const exactMatch = grade.course === course.text;
          const containsMatch1 = grade.course.toLowerCase().includes(course.text.toLowerCase());
          const containsMatch2 = course.text.toLowerCase().includes(grade.course.toLowerCase());
          const codeMatch = courseCode && gradeCode && courseCode === gradeCode;
          
          return exactMatch || containsMatch1 || containsMatch2 || codeMatch;
        });
      };
      
      // Load course-specific grades (quizzes, assignments) for each course
      const gradePromises = courseList.map(async (course) => {
        try {
          const cachedGrades = await GradeCache.getCachedCurrentCourseGrades(course.value);
          let courseGrades: GradeData[];
          if (cachedGrades) {
            courseGrades = cachedGrades;
          } else {
            // This will now only return course-specific grades (no midterm grades)
            courseGrades = await GUCAPIProxy.getCourseGrades(course.value);
            await GradeCache.setCachedCurrentCourseGrades(course.value, courseGrades);
          }
          
          // All grades from getCourseGrades are now course-specific (quizzes, assignments)
          const detailedGrades = courseGrades;
          
          // Match midterm grade from season-level data
          const midtermGrade = matchMidtermGradeToCourse(course);

          return {
            ...course,
            midtermGrade,
            detailedGrades: detailedGrades,
            isExpanded: false,
            isLoadingDetails: false,
          } as CourseWithGrades;
        } catch {
          // Even on error, try to match midterm grade
          const midtermGrade = matchMidtermGradeToCourse(course);
          return {
            ...course,
            midtermGrade,
            detailedGrades: [],
            isExpanded: false,
            isLoadingDetails: false,
          } as CourseWithGrades;
        }
      });
      const results = await Promise.all(gradePromises);
      setCoursesWithGrades(results);

      // Calculate grade counts for all courses
      const gradeCountPromises = results.map(async (course) => {
        const allGrades = [
          ...(course.midtermGrade ? [course.midtermGrade] : []),
          ...(course.detailedGrades || [])
        ];
        const counts = await calculateGradeCounts(course.value, allGrades);
        return { courseId: course.value, counts };
      });

      const gradeCountResults = await Promise.all(gradeCountPromises);
      const newGradeCounts: { [courseId: string]: { total: number; unseen: number } } = {};
      gradeCountResults.forEach(({ courseId, counts }) => {
        newGradeCounts[courseId] = counts;
      });
      setGradeCounts(newGradeCounts);
    } finally {
      setLoadingGrades(false);
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
          // Prefetch all course grades in parallel
          await prefetchAllCourseGrades(cachedCourses);
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
      
      // Prefetch all course grades in parallel
      await prefetchAllCourseGrades(availableCourses);
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
        // This will now only return course-specific grades (no midterm grades)
        courseGrades = await GUCAPIProxy.getCourseGrades(courseId);
        await GradeCache.setCachedCurrentCourseGrades(courseId, courseGrades);
      }
      
      // All grades from getCourseGrades are now course-specific (quizzes, assignments)
      const detailedGrades = courseGrades;
      
      // Don't overwrite midterm grade - it should already be set from season-level data
      // If it's not set, try to load and match it
      if (!updatedCourses[courseIndex].midtermGrade) {
        try {
          const midtermGrades = await GUCAPIProxy.getCurrentGrades();
          const extractCourseCode = (text: string) => {
            const match = text.match(/([A-Z]{2,4}[a-z]?\d{3,4})/);
            return match ? match[1] : '';
          };
          
          const course = updatedCourses[courseIndex];
          const courseCode = extractCourseCode(course.text);
          
          const midtermGrade = midtermGrades.find(grade => {
            const gradeCode = extractCourseCode(grade.course);
            
            const exactMatch = grade.course === course.text;
            const containsMatch1 = grade.course.toLowerCase().includes(course.text.toLowerCase());
            const containsMatch2 = course.text.toLowerCase().includes(grade.course.toLowerCase());
            const codeMatch = courseCode && gradeCode && courseCode === gradeCode;
            
            return exactMatch || containsMatch1 || containsMatch2 || codeMatch;
          });
          
          updatedCourses[courseIndex].midtermGrade = midtermGrade;
        } catch (error) {
          // If we can't load midterm grades, keep existing (or undefined)
        }
      }

      updatedCourses[courseIndex].detailedGrades = detailedGrades;
      updatedCourses[courseIndex].isLoadingDetails = false;
      setCoursesWithGrades([...updatedCourses]);

      // Update grade counts for this course
      const allGrades = [
        ...(updatedCourses[courseIndex].midtermGrade ? [updatedCourses[courseIndex].midtermGrade] : []),
        ...(updatedCourses[courseIndex].detailedGrades || [])
      ];
      const counts = await calculateGradeCounts(courseId, allGrades);
      setGradeCounts(prev => ({
        ...prev,
        [courseId]: counts
      }));
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
      if (!course.midtermGrade && (!course.detailedGrades || course.detailedGrades.length === 0)) {
        await loadCourseGrades(course.value, courseIndex);
      }
      
      // Mark grades as seen when expanding
      const allGrades = [
        ...(course.midtermGrade ? [course.midtermGrade] : []),
        ...(course.detailedGrades || [])
      ];
      if (allGrades.length > 0) {
        await GradeTracking.markCourseGradesAsSeen(course.value, allGrades);
        
        // Update grade counts to reflect seen grades
        const counts = await calculateGradeCounts(course.value, allGrades);
        setGradeCounts(prev => ({
          ...prev,
          [course.value]: counts
        }));
      }
    } else {
      // Collapsing
      course.isExpanded = false;
    }
    
    setCoursesWithGrades([...updatedCourses]);
  };

  const calculateAverage = () => {
    const coursesWithMidtermGrades = coursesWithGrades.filter(course => course.midtermGrade);
    if (coursesWithMidtermGrades.length === 0) return 0;
    
    const allGrades = coursesWithMidtermGrades.map(course => course.midtermGrade!);
    if (allGrades.length === 0) return 0;
    
    return allGrades.reduce((sum, grade) => sum + grade.percentage, 0) / allGrades.length;
  };

  const handleRefresh = async () => {
    try {
      // Clear current grades cache (including midterm grades)
      await GradeCache.clearCurrentCoursesCache();
      await GradeCache.clearCurrentCourseGradesCache();
      await GradeCache.clearCurrentGradesCache(); // Clear midterm grades cache
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
          {coursesWithGrades.some(course => course.midtermGrade) && (
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
        {coursesWithGrades.map((course, index) => {
          const courseGradeCounts = gradeCounts[course.value] || { total: 0, unseen: 0 };
          return (
            <ExpandableCourseCard
              key={course.value}
              course={course}
              onToggle={() => handleCourseToggle(index)}
              getGradeColor={getGradeColor}
              formatCourseName={formatCourseName}
              getCourseCodeParts={getCourseCodeParts}
              totalGradesCount={courseGradeCounts.total}
              unseenGradesCount={courseGradeCounts.unseen}
              formatGradeDisplay={(grade) => {
                if (grade.total !== undefined) {
                  if (grade.obtained !== undefined) {
                    // Both obtained and total are available
                    const obtainedStr = grade.obtained % 1 === 0 ? grade.obtained.toString() : grade.obtained.toFixed(2);
                    const totalStr = grade.total % 1 === 0 ? grade.total.toString() : grade.total.toFixed(2);
                    return `${obtainedStr}/${totalStr}`;
                  } else {
                    // Only total is available, show placeholder
                    const totalStr = grade.total % 1 === 0 ? grade.total.toString() : grade.total.toFixed(2);
                    return `PLACEHOLDER:${totalStr}`;
                  }
                }
                // Only show decimals if they exist for percentage
                const percentageStr = grade.percentage % 1 === 0 ? grade.percentage.toString() : grade.percentage.toFixed(2);
                return `${percentageStr}%`;
              }}
            />
          );
        })}
      </View>
      
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
});