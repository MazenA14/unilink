import { useCustomAlert } from '@/components/CustomAlert';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GradeCache } from '@/utils/gradeCache';
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
            midtermGrade: undefined,
            detailedGrades: [],
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
        midtermGrade: undefined,
        detailedGrades: [],
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
      
      // Set the first grade as midterm grade and the rest as detailed grades
      updatedCourses[courseIndex].midtermGrade = courseGrades.length > 0 ? courseGrades[0] : undefined;
      updatedCourses[courseIndex].detailedGrades = courseGrades.length > 1 ? courseGrades.slice(1) : [];
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
      if (!course.midtermGrade && (!course.detailedGrades || course.detailedGrades.length === 0)) {
        await loadCourseGrades(course.value, courseIndex);
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
        {coursesWithGrades.map((course, index) => (
          <ExpandableCourseCard
            key={course.value}
            course={course}
            onToggle={() => handleCourseToggle(index)}
            getGradeColor={getGradeColor}
            formatCourseName={formatCourseName}
            getCourseCodeParts={getCourseCodeParts}
            formatGradeDisplay={(grade) => `${grade.percentage.toFixed(1)}%`}
          />
        ))}
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