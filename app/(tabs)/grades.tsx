import {
  CourseWithGrades,
  CurrentGradesSection,
  GradeType,
  PreviousGradesSection,
  Season,
  YearGroup
} from '@/components/grades';
import { GradesMenu } from '@/components/GradesMenu';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GradeCache } from '@/utils/gradeCache';
import { GUCAPIProxy as GUCAPI, GradeData } from '@/utils/gucApiProxy';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function GradesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // State management
  const [gradeType, setGradeType] = useState<GradeType>('current');
  const [, setSeasons] = useState<Season[]>([]);
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [coursesWithGrades, setCoursesWithGrades] = useState<CourseWithGrades[]>([]);
  const [grades, setGrades] = useState<GradeData[]>([]);
  
  // Loading states
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Menu state
  const [menuVisible, setMenuVisible] = useState(false);

  // Load data when grade type changes
  useEffect(() => {
    if (gradeType === 'previous') {
      // Debug authentication before loading seasons
      debugAuth();
      loadSeasons();
    } else {
      // Load current grades
      loadCurrentGrades();
      // Clear previous grades data
      setSeasons([]);
      setYearGroups([]);
      setSelectedSeason(null);
    }
  }, [gradeType]);

  const debugAuth = async () => {
    const { DebugUtils } = await import('@/utils/debug');
    await DebugUtils.checkAuthStatus();
  };

  const loadCurrentGrades = async (forceRefresh: boolean = false) => {
    try {
      setLoadingGrades(true);
      
      // Try to load from cache first (unless forced refresh)
      if (!forceRefresh) {
        const cachedGrades = await GradeCache.getCachedCurrentGrades();
        if (cachedGrades) {
          setGrades(cachedGrades);
          setLoadingGrades(false);
          return;
        }
      }

      const fetchedGrades = await GUCAPI.getCurrentGrades();
      
      setGrades(fetchedGrades);
      
      // Cache the results
      await GradeCache.setCachedCurrentGrades(fetchedGrades);
      
    } catch (error: any) {
      
      const errorMessage = error?.message || 'Unknown error occurred';
      
      if (errorMessage.includes('Session expired') || errorMessage.includes('login')) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Navigate back to login screen
                // You can implement navigation logic here
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          `Failed to load current grades: ${errorMessage}`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoadingGrades(false);
    }
  };


  // Load courses and grades when season is selected
  useEffect(() => {
    if (selectedSeason) {
      loadCoursesWithGrades(selectedSeason.value);
    } else {
      setCoursesWithGrades([]);
      setGrades([]);
    }
  }, [selectedSeason]);

  const loadSeasons = async (forceRefresh: boolean = false) => {
    try {
      setLoadingSeasons(true);
      
      // Try to load from cache first (unless forced refresh)
      if (!forceRefresh) {
        const cachedData = await GradeCache.getCachedSeasonsWithGrades();
        if (cachedData) {
          setSeasons(cachedData.seasons);
          setYearGroups(cachedData.yearGroups);
          setLoadingSeasons(false);
          return;
        }
      }

      const fetchedSeasons = await GUCAPI.getAvailableSeasons();
      
      // Check which seasons have grades and add year information
      const seasonsWithGradeCheck = await Promise.all(
        fetchedSeasons.map(async (season) => {
          try {
            const grades = await GUCAPI.getPreviousGrades(season.value);
            const hasGrades = grades && grades.length > 0;
            
            // Extract year from season text (e.g., "Spring 2024" -> "2024")
            const yearMatch = season.text.match(/(\d{4})/);
            const year = yearMatch ? yearMatch[1] : 'Unknown';
            
            return {
              ...season,
              hasGrades,
              year
            };
          } catch (error) {
            // If we can't check grades, assume it has them to avoid hiding valid seasons
            const yearMatch = season.text.match(/(\d{4})/);
            const year = yearMatch ? yearMatch[1] : 'Unknown';
            return {
              ...season,
              hasGrades: true,
              year
            };
          }
        })
      );
      
      // Filter out seasons with no grades
      const seasonsWithGrades = seasonsWithGradeCheck.filter(season => season.hasGrades);
      
      // Group seasons by year
      const yearGroupsMap = new Map<string, Season[]>();
      seasonsWithGrades.forEach(season => {
        const year = season.year || 'Unknown';
        if (!yearGroupsMap.has(year)) {
          yearGroupsMap.set(year, []);
        }
        yearGroupsMap.get(year)!.push(season);
      });
      
      // Convert to array and sort by year (newest first)
      const groupedYears = Array.from(yearGroupsMap.entries())
        .map(([year, seasons]) => ({
          year,
          seasons: seasons.sort((a, b) => {
            // Sort seasons within year (Fall, Spring, Summer)
            const seasonOrder: { [key: string]: number } = { 'Fall': 1, 'Spring': 2, 'Summer': 3 };
            const aOrder = seasonOrder[a.text.split(' ')[0]] || 4;
            const bOrder = seasonOrder[b.text.split(' ')[0]] || 4;
            return aOrder - bOrder;
          })
        }))
        .sort((a, b) => parseInt(b.year) - parseInt(a.year)); // Newest year first
      
      // Update state
      setSeasons(seasonsWithGrades);
      setYearGroups(groupedYears);
      
      // Cache the results
      await GradeCache.setCachedSeasonsWithGrades(seasonsWithGrades, groupedYears);
      
    } catch (error: any) {
      
      const errorMessage = error?.message || 'Unknown error occurred';
      
      if (errorMessage.includes('Session expired') || errorMessage.includes('login')) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Navigate back to login screen
                // You can implement navigation logic here
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          `Failed to load seasons: ${errorMessage}`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoadingSeasons(false);
    }
  };

  const loadCoursesWithGrades = async (seasonId: string) => {
    try {
      setLoadingCourses(true);
      setLoadingGrades(true);
      
      // Try to load from cache first
      const [cachedCourses, cachedMidtermGrades] = await Promise.all([
        GradeCache.getCachedCourses(seasonId),
        GradeCache.getCachedMidtermGrades(seasonId)
      ]);
      
      let fetchedCourses, midtermGrades;
      
      if (cachedCourses && cachedMidtermGrades) {
        // Use cached data
        fetchedCourses = cachedCourses;
        midtermGrades = cachedMidtermGrades;
      } else {
        // Load from API
        const [apiCourses, apiMidtermGrades] = await Promise.all([
          GUCAPI.getAvailableCourses(seasonId),
          GUCAPI.getPreviousGrades(seasonId)
        ]);
        
        fetchedCourses = apiCourses;
        midtermGrades = apiMidtermGrades;
        
        // Cache the results
        await Promise.all([
          GradeCache.setCachedCourses(seasonId, fetchedCourses),
          GradeCache.setCachedMidtermGrades(seasonId, midtermGrades)
        ]);
      }
      
      setGrades(midtermGrades);
      
      // Create courses with their midterm grades
      
      const coursesWithGradesData: CourseWithGrades[] = fetchedCourses.map(course => {
        // Find matching midterm grade for this course
        // Extract course code from both strings to match them properly
        const extractCourseCode = (text: string) => {
          const match = text.match(/([A-Z]{2,4}[a-z]?\d{3,4})/);
          return match ? match[1] : '';
        };
        
        const courseCode = extractCourseCode(course.text);
        
        const midtermGrade = midtermGrades.find(grade => {
          const gradeCode = extractCourseCode(grade.course);
          
          return (
            grade.course === course.text ||
            grade.course.toLowerCase().includes(course.text.toLowerCase()) ||
            course.text.toLowerCase().includes(grade.course.toLowerCase()) ||
            (courseCode && gradeCode && courseCode === gradeCode)
          );
        });
        
        
        return {
          ...course,
          midtermGrade,
          isExpanded: false,
          isLoadingDetails: false,
        };
      });
      
      
      setCoursesWithGrades(coursesWithGradesData);
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to load courses and grades. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingCourses(false);
      setLoadingGrades(false);
    }
  };

  const loadDetailedCourseGrades = async (seasonId: string, courseId: string, courseName: string): Promise<GradeData[]> => {
    try {
      // Check cache first
      const cachedGrades = await GradeCache.getCachedDetailedGrades(seasonId, courseId);
      if (cachedGrades) {
        return cachedGrades;
      }
      
      // Check if courseId is a fallback ID (starts with 'course_')
      if (courseId.startsWith('course_')) {
        // For fallback courses, filter existing grades by course name
        
        if (courseName && grades.length > 0) {
          // Try exact match first
          let filteredGrades = grades.filter(grade => grade.course === courseName);
          
          // If no exact match, try partial matching
          if (filteredGrades.length === 0) {
            filteredGrades = grades.filter(grade => 
              grade.course.toLowerCase().includes(courseName.toLowerCase()) ||
              courseName.toLowerCase().includes(grade.course.toLowerCase())
            );
          }
          
          // Cache the results
          await GradeCache.setCachedDetailedGrades(seasonId, courseId, filteredGrades);
          return filteredGrades;
        }
        return [];
      } else {
        // For real course IDs, make API call
        const fetchedGrades = await GUCAPI.getPreviousGrades(seasonId, courseId);
        await GradeCache.setCachedDetailedGrades(seasonId, courseId, fetchedGrades);
        return fetchedGrades;
      }
    } catch (error) {
      return [];
    }
  };


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (gradeType === 'previous') {
      // Clear courses cache for all seasons to ensure fresh data
      await GradeCache.clearAllCache();
      
      // Force refresh from API (bypass cache)
      await loadSeasons(true);
      if (selectedSeason) {
        await loadCoursesWithGrades(selectedSeason.value);
      }
    } else {
      // Force refresh current grades from API (bypass cache)
      await loadCurrentGrades(true);
    }
    setRefreshing(false);
  }, [selectedSeason, gradeType]);

  const handleCurrentGradesRefresh = useCallback(async () => {
    // This will be called by the CurrentGradesSection component
    // We can add any additional refresh logic here if needed
  }, []);

  // (Development helpers removed)

  const handleSeasonSelect = (season: Season) => {
    setSelectedSeason(season);
    setCoursesWithGrades([]);
    setGrades([]);
  };

  const handleCourseToggle = async (courseIndex: number) => {
    const updatedCourses = [...coursesWithGrades];
    const course = updatedCourses[courseIndex];
    
    if (!course.isExpanded) {
      // Expanding - show loading and load detailed grades if not already loaded
      course.isExpanded = true;
      if (!course.detailedGrades && selectedSeason) {
        course.isLoadingDetails = true;
        setCoursesWithGrades([...updatedCourses]);
        
        // Clear cache for this course to ensure fresh data
        if (selectedSeason) {
          try {
            // Note: We don't need to manually clear cache here since the new system
            // will automatically handle cache validation and expiration
          } catch (error) {
          }
        }
        
        const detailedGrades = await loadDetailedCourseGrades(
          selectedSeason.value,
          course.value,
          course.text
        );
        course.detailedGrades = detailedGrades;
        course.isLoadingDetails = false;
      }
    } else {
      // Collapsing
      course.isExpanded = false;
    }
    
    setCoursesWithGrades([...updatedCourses]);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 85) return colors.gradeExcellent;
    if (percentage >= 75) return colors.gradeGood;
    if (percentage >= 65) return colors.gradeAverage;
    if (percentage >= 40) return colors.gradeBelowAverage;
    return colors.gradeFailing;
  };

  // Extract course code and number for the bubble (e.g., "CSEN" and "601" from "CSEN601")
  const getCourseCodeParts = (courseText: string) => {
    const match = courseText.match(/([A-Z]{2,4}[a-z]?)(\d{3,4})/);
    if (match) {
      return { code: match[1], number: match[2] };
    }
    // Fallback: try to extract from the course name after the dash
    const parts = courseText.split(' - ');
    if (parts.length > 1) {
      const afterDash = parts[1].trim();
      const courseCodeMatch = afterDash.match(/^([A-Z]+)(\d+)\s+(.+)$/);
      if (courseCodeMatch) {
        return { code: courseCodeMatch[1], number: courseCodeMatch[2] };
      }
    }
    return { code: (courseText.split(' ')[0] || 'C').substring(0, 4).toUpperCase(), number: '000' };
  };

  // Format course name to show only the relevant part after the dash, removing course code and semester number
  const formatCourseName = (courseText: string) => {
    // Replace &amp; with & in the course text
    const cleanText = courseText.replace(/&amp;/g, '&');
    
    // Split by dash and get the part after it
    const parts = cleanText.split(' - ');
    if (parts.length > 1) {
      const afterDash = parts[1].trim();
      
      // Remove course code and number from the title (e.g., "CSEN601" from "CSEN601 Network Media lab")
      const courseCodeMatch = afterDash.match(/^([A-Z]+\d+)\s+(.+)$/);
      if (courseCodeMatch) {
        const courseTitle = courseCodeMatch[2];
        return courseTitle;
      }
      
      // Return the part after the dash without semester number
      return afterDash;
    }
    
    // Fallback to original text if no dash found
    return cleanText;
  };


  const calculateAverage = () => {
    const coursesWithMidtermGrades = coursesWithGrades.filter(course => course.midtermGrade);
    if (coursesWithMidtermGrades.length === 0) return 0;
    const sum = coursesWithMidtermGrades.reduce((total, course) => total + (course.midtermGrade?.percentage || 0), 0);
    return sum / coursesWithMidtermGrades.length;
  };

  // Menu handlers
  const handleMenuPress = () => {
    setMenuVisible(true);
  };

  const handleMenuClose = () => {
    setMenuVisible(false);
  };

  const handleMenuOptionPress = (option: string) => {
    setGradeType(option as GradeType);
    setMenuVisible(false);
  };



  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>Grades</Text>
            <TouchableOpacity
              style={[styles.menuButton, { backgroundColor: colors.tint }]}
              onPress={handleMenuPress}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="menu" 
                size={20} 
                color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Grades Content */}
        {gradeType === 'current' && (
          <CurrentGradesSection
            getGradeColor={getGradeColor}
            formatCourseName={formatCourseName}
            getCourseCodeParts={getCourseCodeParts}
            onRefresh={handleCurrentGradesRefresh}
          />
        )}

        {/* Previous Grades Content */}
        {gradeType === 'previous' && (
          <PreviousGradesSection
            yearGroups={yearGroups}
            selectedSeason={selectedSeason}
            coursesWithGrades={coursesWithGrades}
            loadingSeasons={loadingSeasons}
            loadingCourses={loadingCourses}
            loadingGrades={loadingGrades}
            refreshing={refreshing}
            onSeasonSelect={handleSeasonSelect}
            onCourseToggle={handleCourseToggle}
            getGradeColor={getGradeColor}
            formatCourseName={formatCourseName}
            getCourseCodeParts={getCourseCodeParts}
            calculateAverage={calculateAverage}
          />
        )}
      </ScrollView>

      {/* Grades Menu - Outside ScrollView */}
      <GradesMenu
        visible={menuVisible}
        onClose={handleMenuClose}
        onOptionPress={handleMenuOptionPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    paddingTop: 60,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
