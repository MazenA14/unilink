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
import { getGradeColor } from '@/utils/gradingColors';
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
  
  // Refresh trigger for current grades
  const [currentGradesRefreshTrigger, setCurrentGradesRefreshTrigger] = useState(0);

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

      // Use new efficient method to get all seasons with their data
      const seasonsWithData = await GUCAPI.getAllSeasonsWithData();
      
      // Convert to the format expected by the UI
      const seasonsWithGrades = seasonsWithData.map(seasonData => {
        // Extract year from season name (e.g., "Spring 2024" -> "2024")
        const yearMatch = seasonData.seasonName.match(/(\d{4})/);
        const year = yearMatch ? yearMatch[1] : 'Unknown';
        
        return {
          value: seasonData.seasonId,
          text: seasonData.seasonName,
          hasGrades: seasonData.midtermGrades.length > 0,
          year,
          // Store additional data for later use
          _courses: seasonData.courses,
          _midtermGrades: seasonData.midtermGrades
        };
      });
      
      // Group seasons by year
      const yearGroupsMap = new Map<string, Season[]>();
      seasonsWithGrades.forEach(season => {
        const year = season.year || 'Unknown';
        if (!yearGroupsMap.has(year)) {
          yearGroupsMap.set(year, []);
        }
        yearGroupsMap.get(year)!.push(season);
      });
      
      // TODO: Use cached joined season to highlight user's academic year
      // const { AuthManager } = await import('@/utils/auth');
      // const userAcademicYear = await AuthManager.getAcademicYear();
      // This can be used to prioritize or highlight seasons from the user's academic year
      
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

  // Helper function to check if courses match grades
  const coursesMatchGrades = (courses: {value: string, text: string}[], grades: GradeData[]): boolean => {
    if (courses.length === 0 || grades.length === 0) return false;
    
    // Check if any course matches any grade
    const extractCourseCode = (text: string) => {
      const match = text.match(/([A-Z]{2,4}[a-z]?\d{3,4})/);
      return match ? match[1] : '';
    };
    
    for (const course of courses) {
      const courseCode = extractCourseCode(course.text);
      for (const grade of grades) {
        const gradeCode = extractCourseCode(grade.course);
        if (courseCode && gradeCode && courseCode === gradeCode) {
          return true; // Found at least one match
        }
      }
    }
    
    return false; // No matches found
  };

  const loadCoursesWithGrades = async (seasonId: string) => {
    try {
      setLoadingCourses(true);
      setLoadingGrades(true);
      
      
      // Find the selected season in our seasons data to get courses and midterm grades
      const foundSeason = [...yearGroups.flatMap(yg => yg.seasons)].find(season => season.value === seasonId);
      
      
      if (foundSeason && foundSeason._courses && foundSeason._midtermGrades) {
        
        const fetchedCourses = foundSeason._courses;
        const midtermGrades = foundSeason._midtermGrades;
        
        setGrades(midtermGrades);
        
        // Create courses with their midterm grades
        const coursesWithGradesData: CourseWithGrades[] = fetchedCourses.map(course => {
          // Find matching midterm grade for this course
          const extractCourseCode = (text: string) => {
            const match = text.match(/([A-Z]{2,4}[a-z]?\d{3,4})/);
            return match ? match[1] : '';
          };
          
          const courseCode = extractCourseCode(course.text);
          
          const midtermGrade = midtermGrades.find(grade => {
            const gradeCode = extractCourseCode(grade.course);
            
            const exactMatch = grade.course === course.text;
            const containsMatch1 = grade.course.toLowerCase().includes(course.text.toLowerCase());
            const containsMatch2 = course.text.toLowerCase().includes(grade.course.toLowerCase());
            const codeMatch = courseCode && gradeCode && courseCode === gradeCode;
            
            return exactMatch || containsMatch1 || containsMatch2 || codeMatch;
          });
          
          return {
            ...course,
            midtermGrade,
            isExpanded: false,
            isLoadingDetails: false,
          };
        });
        
        setCoursesWithGrades(coursesWithGradesData);
        
      } else {
        // Fallback to old method if season data not found
        
        const [apiCourses, apiMidtermGrades] = await Promise.all([
          GUCAPI.getAvailableCoursesWithSeason(seasonId),
          GUCAPI.getPreviousGrades(seasonId)
        ]);
        
        // If we have grades but no courses, create courses from grades
        let fetchedCourses = apiCourses;
        if (apiMidtermGrades.length > 0 && apiCourses.length === 0) {
          fetchedCourses = apiMidtermGrades.map((grade, index) => ({
            value: `grade_${index}`,
            text: grade.course
          }));
        }
        
        setGrades(apiMidtermGrades);
        
        const coursesWithGradesData: CourseWithGrades[] = fetchedCourses.map(course => {
          const extractCourseCode = (text: string) => {
            const match = text.match(/([A-Z]{2,4}[a-z]?\d{3,4})/);
            return match ? match[1] : '';
          };
          
          const courseCode = extractCourseCode(course.text);
          
          const midtermGrade = apiMidtermGrades.find(grade => {
            const gradeCode = extractCourseCode(grade.course);
            
            const exactMatch = grade.course === course.text;
            const containsMatch1 = grade.course.toLowerCase().includes(course.text.toLowerCase());
            const containsMatch2 = course.text.toLowerCase().includes(grade.course.toLowerCase());
            const codeMatch = courseCode && gradeCode && courseCode === gradeCode;
            
            return exactMatch || containsMatch1 || containsMatch2 || codeMatch;
          });
          
          return {
            ...course,
            midtermGrade,
            isExpanded: false,
            isLoadingDetails: false,
          };
        });
        
        setCoursesWithGrades(coursesWithGradesData);
      }
      
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
      
      // Use the new detailed grades API method
      const detailedGrades = await GUCAPI.getDetailedCourseGrades(seasonId, courseId);
      
      // Cache the results
      await GradeCache.setCachedDetailedGrades(seasonId, courseId, detailedGrades);
      
      return detailedGrades;
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
      // Clear current grades related caches to ensure fresh data
      await GradeCache.clearCurrentGradesCache();
      await GradeCache.clearCurrentCoursesCache();
      await GradeCache.clearCurrentCourseGradesCache();
      await GradeCache.clearCourseIdToNameCache();
      
      // Force refresh current grades from API (bypass cache)
      await loadCurrentGrades(true);
      // Trigger refresh of courses in CurrentGradesSection
      setCurrentGradesRefreshTrigger(prev => prev + 1);
    }
    setRefreshing(false);
  }, [selectedSeason, gradeType]);

  const handleCurrentGradesRefresh = useCallback(async () => {
    try {
      // Clear current grades related caches to ensure fresh data
      await GradeCache.clearCurrentGradesCache();
      await GradeCache.clearCurrentCoursesCache();
      await GradeCache.clearCurrentCourseGradesCache();
      await GradeCache.clearCourseIdToNameCache();
      
      // Force refresh current grades from API (bypass cache)
      await loadCurrentGrades(true);
      // Trigger refresh of courses in CurrentGradesSection
      setCurrentGradesRefreshTrigger(prev => prev + 1);
    } catch (error) {
    }
  }, []);

  // (Development helpers removed)

  const handleSeasonSelect = (season: Season) => {
    // Only clear courses if selecting a different season and not currently loading
    if (selectedSeason?.value !== season.value && !loadingCourses && !loadingGrades) {
      setSelectedSeason(season);
      setCoursesWithGrades([]);
      setGrades([]);
    }
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
      } else {
      }
    } else {
      // Collapsing
      course.isExpanded = false;
    }
    
    setCoursesWithGrades([...updatedCourses]);
  };

  // Use unified grading color function
  const getGradeColorForComponent = (percentage: number) => getGradeColor(percentage, colors);

  // Format grade display to show actual marks instead of percentage
  const formatGradeDisplay = (grade: GradeData) => {
    if (grade.obtained !== undefined && grade.total !== undefined) {
      // Only show decimals if they exist (not .00)
      const obtainedStr = grade.obtained % 1 === 0 ? grade.obtained.toString() : grade.obtained.toFixed(2);
      const totalStr = grade.total % 1 === 0 ? grade.total.toString() : grade.total.toFixed(2);
      return `${obtainedStr}/${totalStr}`;
    }
    // Only show decimals if they exist for percentage
    const percentageStr = grade.percentage % 1 === 0 ? grade.percentage.toString() : grade.percentage.toFixed(2);
    return `${percentageStr}%`;
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

        {/* Custom refresh message for previous grades */}
        {refreshing && gradeType === 'previous' && (
          <View style={[styles.refreshMessageContainer, { backgroundColor: colors.tabColor + '10' }]}>
            <Text style={[styles.refreshMessage, { color: colors.tabColor }]}>
              This might take a minute
            </Text>
          </View>
        )}

        {/* Current Grades Content */}
        {gradeType === 'current' && (
          <CurrentGradesSection
            getGradeColor={getGradeColorForComponent}
            formatCourseName={formatCourseName}
            getCourseCodeParts={getCourseCodeParts}
            onRefresh={handleCurrentGradesRefresh}
            refreshTrigger={currentGradesRefreshTrigger}
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
            getGradeColor={getGradeColorForComponent}
            formatCourseName={formatCourseName}
            getCourseCodeParts={getCourseCodeParts}
            formatGradeDisplay={formatGradeDisplay}
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
  refreshMessageContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshMessage: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
