import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GradeCache } from '@/utils/gradeCache';
import { GUCAPIProxy as GUCAPI, GradeData } from '@/utils/gucApiProxy';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Season {
  value: string;
  text: string;
  hasGrades?: boolean;
  year?: string;
}

interface YearGroup {
  year: string;
  seasons: Season[];
}


interface Course {
  value: string;
  text: string;
}

interface CourseWithGrades extends Course {
  midtermGrade?: GradeData;
  detailedGrades?: GradeData[];
  isExpanded?: boolean;
  isLoadingDetails?: boolean;
}

type GradeType = 'current' | 'previous';


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

      console.log('Loading current grades from API...');
      const fetchedGrades = await GUCAPI.getCurrentGrades();
      
      setGrades(fetchedGrades);
      
      // Cache the results
      await GradeCache.setCachedCurrentGrades(fetchedGrades);
      
    } catch (error: any) {
      console.error('Error loading current grades:', error);
      
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

      console.log('Loading seasons from API...');
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
            console.warn(`Failed to check grades for season ${season.text}:`, error);
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
      console.error('Error loading seasons:', error);
      
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
        console.log(`Using cached data for season ${seasonId}: ${fetchedCourses.length} courses, ${midtermGrades.length} midterm grades`);
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
      console.log('=== MIDTERM GRADE MATCHING DEBUG ===');
      console.log('Fetched courses:', fetchedCourses.map(c => c.text));
      console.log('Midterm grades:', midtermGrades.map(g => g.course));
      
      const coursesWithGradesData: CourseWithGrades[] = fetchedCourses.map(course => {
        // Find matching midterm grade for this course
        // Extract course code from both strings to match them properly
        const extractCourseCode = (text: string) => {
          const match = text.match(/([A-Z]{2,4}[a-z]?\d{3,4})/);
          return match ? match[1] : '';
        };
        
        const courseCode = extractCourseCode(course.text);
        console.log(`Matching course "${course.text}" with code "${courseCode}"`);
        
        const midtermGrade = midtermGrades.find(grade => {
          const gradeCode = extractCourseCode(grade.course);
          console.log(`  Checking against grade "${grade.course}" with code "${gradeCode}"`);
          
          return (
            grade.course === course.text ||
            grade.course.toLowerCase().includes(course.text.toLowerCase()) ||
            course.text.toLowerCase().includes(grade.course.toLowerCase()) ||
            (courseCode && gradeCode && courseCode === gradeCode)
          );
        });
        
        console.log(`Course "${course.text}" -> Midterm grade: ${midtermGrade ? midtermGrade.percentage + '%' : 'NOT FOUND'}`);
        
        return {
          ...course,
          midtermGrade,
          isExpanded: false,
          isLoadingDetails: false,
        };
      });
      
      console.log('=====================================');
      
      setCoursesWithGrades(coursesWithGradesData);
    } catch (error) {
      console.error('Error loading courses with grades:', error);
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
        console.log(`Using cached grades for course ${courseId}`);
        return cachedGrades;
      }
      
      // Check if courseId is a fallback ID (starts with 'course_')
      if (courseId.startsWith('course_')) {
        // For fallback courses, filter existing grades by course name
        console.log('=== DETAILED COURSE GRADE FILTERING ===');
        console.log('Course name:', courseName);
        console.log('Total grades available:', grades.length);
        
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
          console.log(`Found ${filteredGrades.length} detailed grades for ${courseName}`);
          return filteredGrades;
        }
        console.log('==========================================');
        return [];
      } else {
        // For real course IDs, make API call
        const fetchedGrades = await GUCAPI.getPreviousGrades(seasonId, courseId);
        await GradeCache.setCachedDetailedGrades(seasonId, courseId, fetchedGrades);
        return fetchedGrades;
      }
    } catch (error) {
      console.error('Error loading detailed course grades:', error);
      return [];
    }
  };


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (gradeType === 'previous') {
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
            console.log(`Loading fresh data for course ${course.value}`);
          } catch (error) {
            console.log('Error preparing fresh data load:', error);
          }
        }
        
        const detailedGrades = await loadDetailedCourseGrades(
          selectedSeason.value,
          course.value,
          course.text
        );
        console.log(`=== COURSE EXPANSION DEBUG ===`);
        console.log(`Course: ${course.text}`);
        console.log(`Course ID: ${course.value}`);
        console.log(`Detailed grades returned: ${detailedGrades.length}`);
        console.log(`Detailed grades:`, detailedGrades.map(g => `${g.course}: ${g.percentage}%`));
        console.log(`================================`);
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

  // Extract course code letters for the bubble (e.g., "CSEN" from "CSEN102" or "PHYSt" from "PHYSt301")
  const getCourseCode = (courseText: string) => {
    const match = courseText.match(/([A-Z]{2,4}[a-z]?\d{3,4})/);
    return match ? match[1].replace(/\d+/g, '') : (courseText.split(' ')[0] || 'C').substring(0, 4).toUpperCase();
  };


  const calculateAverage = () => {
    const coursesWithMidtermGrades = coursesWithGrades.filter(course => course.midtermGrade);
    if (coursesWithMidtermGrades.length === 0) return 0;
    const sum = coursesWithMidtermGrades.reduce((total, course) => total + (course.midtermGrade?.percentage || 0), 0);
    return sum / coursesWithMidtermGrades.length;
  };

  const renderSeasonItem = ({ item }: { item: Season }) => (
    <TouchableOpacity
      style={[
        styles.seasonCard,
        {
          backgroundColor: selectedSeason?.value === item.value ? colors.tint : colors.background,
          borderColor: colors.border,
        },
      ]}
      onPress={() => handleSeasonSelect(item)}
    >
      <Text
        style={[
          styles.seasonText,
          {
            color: selectedSeason?.value === item.value ? colors.background : colors.text,
          },
        ]}
      >
        {item.text}
      </Text>
    </TouchableOpacity>
  );

  const renderYearGroup = ({ item }: { item: YearGroup }) => (
    <View style={styles.yearGroup}>
      <Text style={[styles.yearTitle, { color: colors.text }]}>{item.year}</Text>
      <FlatList
        data={item.seasons}
        renderItem={renderSeasonItem}
        keyExtractor={(season) => season.value}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.seasonsList}
        contentContainerStyle={styles.seasonsListContent}
      />
    </View>
  );


  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Grades</Text>
        
        {/* Grade Type Selector */}
        <View style={styles.gradeTypeSelector}>
          <TouchableOpacity
            style={[
              styles.gradeTypeButton,
              {
                backgroundColor: gradeType === 'current' ? colors.tint : 'transparent',
                borderColor: colors.tint,
              },
            ]}
            onPress={() => setGradeType('current')}
          >
            <Text
              style={[
                styles.gradeTypeButtonText,
                {
                  color: gradeType === 'current' ? colors.background : colors.tint,
                },
              ]}
            >
              Current Grades
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.gradeTypeButton,
              {
                backgroundColor: gradeType === 'previous' ? colors.tint : 'transparent',
                borderColor: colors.tint,
              },
            ]}
            onPress={() => setGradeType('previous')}
          >
            <Text
              style={[
                styles.gradeTypeButtonText,
                {
                  color: gradeType === 'previous' ? colors.background : colors.tint,
                },
              ]}
            >
              Previous Grades
            </Text>
          </TouchableOpacity>
        </View>

        
        {/* <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          {gradeType === 'current' 
            ? 'View your current semester grades'
            : 'Select a season to view previous grades'
          }
        </Text> */}
      </View>

      {/* Current Grades Content */}
      {gradeType === 'current' && (
        <View style={styles.section}>
          <View style={styles.courseGridHeader}>
            <Text style={[styles.courseGridTitle, { color: colors.text }]}>Current Grades</Text>
            {grades.length > 0 && (
              <View style={styles.courseGridMetrics}>
                <Text style={[styles.courseGridSubtitle, { color: colors.tabIconDefault }]}>
                  {grades.length} course{grades.length !== 1 ? 's' : ''} available
                </Text>
                <Text style={[styles.courseGridAverage, { color: colors.text }]}>
                  Average: <Text style={{ color: getGradeColor(grades.reduce((sum, grade) => sum + grade.percentage, 0) / grades.length) }}>
                    {(grades.reduce((sum, grade) => sum + grade.percentage, 0) / grades.length).toFixed(1)}%
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
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderRadius: 12,
                  },
                ]}>
                  <View style={styles.expandableCourseContent}>
                    <View style={styles.expandableCourseLeft}>
                      <View style={[
                        styles.expandableCourseIcon,
                        { backgroundColor: colors.tint + '15' }
                      ]}>
                        <Text style={[
                          styles.expandableCourseIconText,
                          { color: colors.tint }
                        ]}>
                          {getCourseCode(grade.course)}
                        </Text>
                      </View>
                      <View style={styles.expandableCourseTitleContainer}>
                        <Text
                          style={[styles.expandableCourseTitle, { color: colors.text }]}
                          numberOfLines={0}
                        >
                          {grade.course}
                        </Text>
                        <Text style={[styles.expandableCourseSubtitle, { color: colors.tabIconDefault }]}>
                          Current Grade
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.expandableCourseRight}>
                      <View style={styles.expandableCourseGradeContainer}>
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
      )}

      {/* Previous Grades Content */}
      {gradeType === 'previous' && (
        <>
          {/* Seasons Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Previous Grades</Text>
            {loadingSeasons ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.loadingText, { color: colors.tabIconDefault }]}>
                  {refreshing ? 'Refreshing...' : 'Loading semester grades...'}
                </Text>
              </View>
            ) : yearGroups.length > 0 ? (
              <FlatList
                data={yearGroups}
                renderItem={renderYearGroup}
                keyExtractor={(item) => item.year}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Grades Available</Text>
                <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                  No previous semester grades were found in your account.
                </Text>
              </View>
            )}
          </View>

          {/* Unified Course Grades Section */}
          {selectedSeason && (
            <View style={styles.section}>
              <View style={styles.courseSelectionContainer}>
                <View style={styles.courseGridHeader}>
                  <Text style={[styles.courseGridTitle, { color: colors.text }]}>Available Courses</Text>
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
                
                {loadingCourses || loadingGrades ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.tint} />
                    <Text style={[styles.loadingText, { color: colors.tabIconDefault }]}>
                      Loading courses...
                    </Text>
                  </View>
                ) : coursesWithGrades.length > 0 ? (
                  <View style={styles.courseGrid}>
                    {coursesWithGrades.map((course, index) => (
                      <View key={course.value} style={styles.expandableCourseContainer}>
                        <TouchableOpacity
                          style={[
                            styles.expandableCourseCard,
                            {
                              backgroundColor: colors.background,
                              borderColor: colors.border,
                              borderTopLeftRadius: 12,
                              borderTopRightRadius: 12,
                              borderBottomLeftRadius: course.isExpanded ? 0 : 12,
                              borderBottomRightRadius: course.isExpanded ? 0 : 12,
                            },
                          ]}
                          onPress={() => handleCourseToggle(index)}
                        >
                          <View style={styles.expandableCourseContent}>
                            <View style={styles.expandableCourseLeft}>
                              <View style={[
                                styles.expandableCourseIcon,
                                { backgroundColor: course.midtermGrade ? colors.tint + '15' : colors.border + '30' }
                              ]}>
                                <Text style={[
                                  styles.expandableCourseIconText,
                                  { color: course.midtermGrade ? colors.tint : colors.tabIconDefault }
                                ]}>
                                  {getCourseCode(course.text)}
                                </Text>
                              </View>
                              <View style={styles.expandableCourseTitleContainer}>
                                <Text
                                  style={[styles.expandableCourseTitle, { color: colors.text }]}
                                  numberOfLines={0}
                                >
                                  {course.text}
                                </Text>
                                <Text style={[styles.expandableCourseSubtitle, { color: colors.tabIconDefault }]}>
                                  {course.midtermGrade ? 'Midterm Result' : 'No Midterm Grade'}
                                </Text>
                              </View>
                            </View>
                            
                            <View style={styles.expandableCourseRight}>
                              {course.midtermGrade && (
                                <View style={styles.expandableCourseGradeContainer}>
                                  <Text
                                    style={[
                                      styles.expandableCourseGrade,
                                      { color: getGradeColor(course.midtermGrade.percentage) }
                                    ]}
                                  >
                                    {course.midtermGrade.percentage.toFixed(1)}%
                                  </Text>
                                </View>
                              )}
                              
                              <Ionicons 
                                name={course.isExpanded ? "caret-up" : "caret-down"} 
                                size={16} 
                                color={colors.secondaryFont}
                                style={styles.expandIcon}
                              />
                            </View>
                          </View>
                        </TouchableOpacity>
                        
                        {course.isExpanded && (
                          <View style={[
                            styles.expandedContent,
                            {
                              backgroundColor: colors.background,
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
                                    {course.midtermGrade 
                                      ? `Midterm Grade: ${course.midtermGrade.percentage.toFixed(1)}%`
                                      : 'All Grades'
                                    }
                                  </Text>
                                </View>
                                {course.detailedGrades.map((grade, gradeIndex) => (
                                  <View key={gradeIndex} style={[styles.detailedGradeItem, { borderColor: colors.border }]}>
                                    <Text style={[styles.detailedGradeName, { color: colors.text }]} numberOfLines={0}>
                                      {grade.course}
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
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                    No courses found for this season
                  </Text>
                )}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 20,
  },
  horizontalList: {
    marginBottom: 10,
  },
  listItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 10,
    minWidth: 120,
  },
  listItemText: {
    fontSize: 14,
    textAlign: 'center',
  },
  gradeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  courseName: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  gradeContainer: {
    alignItems: 'flex-end',
  },
  gradePercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  gradeStatus: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gradesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  average: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  gradeTypeSelector: {
    flexDirection: 'row',
    marginVertical: 16,
    marginHorizontal: -4,
  },
  gradeTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginHorizontal: 4,
  },
  gradeTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  comingSoonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  yearGroup: {
    marginBottom: 24,
  },
  yearTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  seasonsList: {
    marginBottom: 8,
  },
  seasonsListContent: {
    paddingHorizontal: 4,
  },
  seasonCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  seasonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
  sectionSubtitle: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '500',
  },
  courseSelectionContainer: {
    marginTop: 16,
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
  selectedCourseGrades: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    backgroundColor: '#f8f9fa',
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedCourseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  selectedCourseTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedCourseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedCourseIconText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectedCourseTitleWrapper: {
    flex: 1,
  },
  selectedCourseTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedCourseSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  selectedCourseStats: {
    alignItems: 'flex-end',
  },
  selectedCourseAverage: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  selectedCourseAverageLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  courseGradeLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  courseGradesList: {
    marginTop: 8,
  },
  // New expandable course card styles
  expandableCourseContainer: {
    marginBottom: 4,
  },
  expandableCourseCard: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  expandableCourseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  expandableCourseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  expandableCourseIcon: {
    width: 60,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expandableCourseIconText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandableCourseTitleContainer: {
    flex: 1,
  },
  expandableCourseTitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 2,
  },
  expandableCourseSubtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  expandableCourseRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  expandableCourseGradeContainer: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  expandableCourseGrade: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  loadingDetailContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  expandIcon: {
    opacity: 0.7,
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
  expandedAverage: {
    fontSize: 14,
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
});
