import { InstructorProfileModal } from '@/components/InstructorProfileModal';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GUCAPIProxy, Instructor } from '@/utils/gucApiProxy';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function InstructorsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courses, setCourses] = useState<{value: string, text: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'instructors' | 'courses'>('instructors');
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');
  
  // Course dropdown state - track which courses are expanded
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [courseInstructors, setCourseInstructors] = useState<{[courseValue: string]: Instructor[]}>({});
  const [loadingCourseInstructors, setLoadingCourseInstructors] = useState<{[courseValue: string]: boolean}>({});
  const [selectedCourseForInstructor, setSelectedCourseForInstructor] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false, bypassCache = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch both instructors and courses in parallel
      const [instructorsData, coursesData] = await Promise.all([
        GUCAPIProxy.getInstructors(bypassCache),
        GUCAPIProxy.getCourses(bypassCache)
      ]);
      
      setInstructors(instructorsData);
      setCourses(coursesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchData(true, true); // isRefresh = true, bypassCache = true
  }, [fetchData]);

  const handleInstructorPress = useCallback((instructor: Instructor, courseValue?: string) => {
    setSelectedInstructor(instructor.name);
    setSelectedCourseForInstructor(courseValue || null);
    setModalVisible(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    setSelectedInstructor('');
    setSelectedCourseForInstructor(null);
  }, []);

  const fetchInstructorProfile = useCallback(async (instructorName: string) => {
    if (selectedCourseForInstructor) {
      // Use course instructor profile method
      return await GUCAPIProxy.getCourseInstructorProfile(selectedCourseForInstructor, instructorName);
    } else {
      // Use normal instructor profile method
      return await GUCAPIProxy.getInstructorProfile(instructorName);
    }
  }, [selectedCourseForInstructor]);

  const fetchCourseInstructors = useCallback(async (course: {value: string, text: string}) => {
    try {
      setLoadingCourseInstructors(prev => ({ ...prev, [course.value]: true }));
      setError(null);
      
      const instructors = await GUCAPIProxy.getInstructorsByCourse(course.value);
      setCourseInstructors(prev => ({ ...prev, [course.value]: instructors }));
    } catch (err: any) {
      setError(err.message || 'Failed to load course instructors');
    } finally {
      setLoadingCourseInstructors(prev => ({ ...prev, [course.value]: false }));
    }
  }, []);

  const handleCoursePress = useCallback((course: {value: string, text: string}) => {
    const isExpanded = expandedCourses.has(course.value);
    
    if (isExpanded) {
      // Collapse the course
      setExpandedCourses(prev => {
        const newSet = new Set(prev);
        newSet.delete(course.value);
        return newSet;
      });
    } else {
      // Expand the course
      setExpandedCourses(prev => new Set(prev).add(course.value));
      
      // Fetch instructors if not already loaded
      if (!courseInstructors[course.value]) {
        fetchCourseInstructors(course);
      }
    }
  }, [expandedCourses, courseInstructors, fetchCourseInstructors]);


  // Sort data
  const sortedInstructors = instructors.sort((a, b) => a.name.localeCompare(b.name));
  const sortedCourses = courses.sort((a, b) => a.text.localeCompare(b.text));

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderInstructor = ({ item }: { item: Instructor }) => (
    <TouchableOpacity
      style={[styles.instructorCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => handleInstructorPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.instructorAvatar, { backgroundColor: colors.tint }]}>
        <Ionicons name="person" size={24} color="white" />
      </View>
      <View style={styles.instructorInfo}>
        <Text style={[styles.instructorName, { color: colors.mainFont }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.instructorSubtitle, { color: colors.secondaryFont }]}>
          Instructor
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.secondaryFont} />
    </TouchableOpacity>
  );

  const renderCourse = ({ item }: { item: {value: string, text: string} }) => {
    const isExpanded = expandedCourses.has(item.value);
    const instructors = courseInstructors[item.value] || [];
    const isLoading = loadingCourseInstructors[item.value] || false;
    
    return (
      <View style={[
        styles.courseCard,
        { backgroundColor: colors.cardBackground, borderColor: colors.border }
      ]}>
        <TouchableOpacity
          style={styles.courseHeader}
          onPress={() => handleCoursePress(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.courseIcon, { backgroundColor: colors.gradeGood }]}>
            <Ionicons name="book" size={24} color="white" />
          </View>
          <View style={styles.courseInfo}>
            <Text style={[styles.courseName, { color: colors.mainFont }]} numberOfLines={2}>
              {item.text.split('-').pop()?.trim() || item.text}
            </Text>
            <Text style={[styles.courseSubtitle, { color: colors.secondaryFont }]}>
              Course
            </Text>
          </View>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={colors.secondaryFont} 
          />
        </TouchableOpacity>
        
        {/* Instructor Dropdown */}
        {isExpanded && (
          <View style={styles.instructorDropdown}>
            {isLoading ? (
              <View style={styles.dropdownLoadingContainer}>
                <ActivityIndicator size="small" color={colors.tint} />
                <Text style={[styles.dropdownLoadingText, { color: colors.secondaryFont }]}>
                  Loading instructors...
                </Text>
              </View>
            ) : instructors.length > 0 ? (
              instructors.map((instructor, index) => (
                <TouchableOpacity
                  key={instructor.value}
                  style={[
                    styles.dropdownInstructorItem,
                    index < instructors.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }
                  ]}
                  onPress={() => handleInstructorPress(instructor, item.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dropdownInstructorAvatar, { backgroundColor: colors.tint }]}>
                    <Ionicons name="person" size={16} color="white" />
                  </View>
                  <Text style={[styles.dropdownInstructorName, { color: colors.mainFont }]} numberOfLines={2}>
                    {instructor.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.secondaryFont} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.dropdownEmptyContainer}>
                <Ionicons name="people-outline" size={32} color={colors.secondaryFont} />
                <Text style={[styles.dropdownEmptyText, { color: colors.secondaryFont }]}>
                  No instructors found
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };


  const renderTabHeader = () => (
    <View style={[styles.tabContainer, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'instructors' && { backgroundColor: colors.tint }
        ]}
        onPress={() => setActiveTab('instructors')}
      >
        <Ionicons 
          name="people" 
          size={20} 
          color={activeTab === 'instructors' ? 'white' : colors.secondaryFont} 
        />
        <Text style={[
          styles.tabText,
          { color: activeTab === 'instructors' ? 'white' : colors.secondaryFont }
        ]}>
          Your Instructors ({sortedInstructors.length})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'courses' && { backgroundColor: colors.tint }
        ]}
        onPress={() => setActiveTab('courses')}
      >
        <Ionicons 
          name="book" 
          size={20} 
          color={activeTab === 'courses' ? 'white' : colors.secondaryFont} 
        />
        <Text style={[
          styles.tabText,
          { color: activeTab === 'courses' ? 'white' : colors.secondaryFont }
        ]}>
          By Course ({sortedCourses.length})
        </Text>
      </TouchableOpacity>
    </View>
  );



  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'instructors' ? 'people-outline' : 'book-outline'} 
        size={64} 
        color={colors.secondaryFont} 
      />
      <Text style={[styles.emptyStateTitle, { color: colors.mainFont }]}>
        {activeTab === 'instructors' ? 'No Instructors Found' : 'No Courses Found'}
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: colors.secondaryFont }]}>
        {activeTab === 'instructors' 
          ? 'Try adjusting your search or check back later.' 
          : 'Try adjusting your search or check back later.'
        }
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.gradeFailing} />
      <Text style={[styles.errorStateTitle, { color: colors.mainFont }]}>
        Error Loading Data
      </Text>
      <Text style={[styles.errorStateSubtitle, { color: colors.secondaryFont }]}>
        {error}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: colors.tint }]}
        onPress={() => fetchData()}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.mainFont} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.mainFont }]}>
            Instructors
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>
            Loading data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.mainFont} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.mainFont }]}>
          Instructors
        </Text>
        <View style={styles.placeholder} />
      </View>

      {error ? (
        renderErrorState()
      ) : (
        <View style={styles.content}>
          {renderTabHeader()}
          
          {activeTab === 'instructors' ? (
            <FlatList
              data={sortedInstructors}
              renderItem={renderInstructor}
              keyExtractor={(item) => item.value}
              style={styles.list}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <AppRefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                />
              }
              ListEmptyComponent={renderEmptyState}
            />
          ) : (
            <FlatList
              data={sortedCourses}
              renderItem={renderCourse}
              keyExtractor={(item) => item.value}
              style={styles.list}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <AppRefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                />
              }
              ListEmptyComponent={renderEmptyState}
            />
          )}
        </View>
      )}

      {/* Instructor Profile Modal */}
      <InstructorProfileModal
        visible={modalVisible}
        onClose={handleModalClose}
        instructorName={selectedInstructor}
        onFetchProfile={fetchInstructorProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  list: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  instructorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 22,
  },
  instructorSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  courseCard: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 22,
  },
  courseSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  instructorDropdown: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  dropdownLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  dropdownLoadingText: {
    fontSize: 14,
    textAlign: 'center',
  },
  dropdownInstructorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownInstructorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownInstructorName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  dropdownEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  dropdownEmptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
