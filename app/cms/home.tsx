import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getCmsCourses, getCmsCourseView } from '@/utils/handlers/cmsHandler';
import type { CMSCourseRow } from '@/utils/parsers/cmsCoursesParser';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CMSHomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [courses, setCourses] = useState<CMSCourseRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());

  const load = useCallback(async (bypassCache: boolean = false) => {
    try {
      setError(null);
      if (bypassCache) setRefreshing(true); else setLoading(true);
      const data = await getCmsCourses(!bypassCache ? false : true);
      setCourses(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const groupedCourses = useMemo(() => {
    if (!courses) return [];
    
    // console.log('Raw courses:', courses.length, courses.map(c => ({ name: c.name, seasonId: c.seasonId, season: c.season })));
    
    // Group courses by seasonId (e.g., "65", "64", "63")
    const groups = courses.reduce((acc, course) => {
      const seasonKey = course.seasonId;
      if (!acc[seasonKey]) {
        acc[seasonKey] = [];
      }
      acc[seasonKey].push(course);
      return acc;
    }, {} as Record<string, CMSCourseRow[]>);

    // console.log('Grouped courses:', Object.keys(groups).map(k => ({ seasonId: k, count: groups[k].length })));

    // Sort seasons by season number descending (bigger first)
    const sortedSeasons = Object.keys(groups).sort((a, b) => {
      const aNum = Number(a);
      const bNum = Number(b);
      
      // Sort by season number descending (bigger first)
      return bNum - aNum;
    });

    const result = sortedSeasons.map(seasonId => {
      const firstCourse = groups[seasonId][0];
      const seasonTitle = firstCourse?.seasonTitle || `Season ${seasonId}`;
      return {
        seasonId,
        // seasonName: `${seasonId} - ${seasonTitle}`,
        seasonName: `${seasonTitle} - ${seasonId}`,
        courses: groups[seasonId]
      };
    });

    // console.log('Final grouped result:', result.map(r => ({ seasonName: r.seasonName, courseCount: r.courses.length })));
    return result;
  }, [courses]);

  // Auto-expand the newest season when courses are first loaded
  useEffect(() => {
    if (groupedCourses.length > 0 && expandedSeasons.size === 0) {
      const newestSeasonId = groupedCourses[0].seasonId; // First item is newest due to sorting
      setExpandedSeasons(new Set([newestSeasonId]));
    }
  }, [groupedCourses.length]); // Only depend on the length, not the size of expandedSeasons

  const toggleSeason = useCallback((seasonId: string) => {
    setExpandedSeasons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seasonId)) {
        newSet.delete(seasonId);
      } else {
        newSet.add(seasonId);
      }
      return newSet;
    });
  }, []);

  const onPressViewCourse = useCallback(async (row: CMSCourseRow) => {
    try {
      setError(null);
      // Prefetch course view to validate access and warm cache, then navigate
      getCmsCourseView(row.courseId, row.seasonId).catch(() => {});
      router.push({ pathname: '/course-view', params: { id: row.courseId, sid: row.seasonId } });
    } catch (e: any) {
      setError(e?.message || 'Failed to open course');
    }
  }, []);

  if (loading && !courses) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
        <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>Loading CMS courses…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      {/* Header matching Grades/Dashboard spacing */}
      <View style={[styles.header, { paddingTop: Math.max(60, insets.top + 20) }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>CMS</Text>
          {groupedCourses.length > 0 && (
            <Text style={[styles.seasonsCounter, { color: colors.secondaryFont }]}>
              {groupedCourses.length} season{groupedCourses.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>
      {/* Content */}
      {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
      <FlatList
        data={groupedCourses}
        keyExtractor={(item) => item.seasonId}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24, paddingHorizontal: 20 },
        ]}
        renderItem={({ item: seasonGroup }) => {
          const isExpanded = expandedSeasons.has(seasonGroup.seasonId);
          return (
            <View style={[styles.seasonSection, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <TouchableOpacity 
                style={styles.seasonHeader}
                onPress={() => toggleSeason(seasonGroup.seasonId)}
                activeOpacity={0.7}
              >
                <View style={styles.seasonHeaderContent}>
                  <Text style={[styles.seasonTitle, { color: colors.text }]}>{seasonGroup.seasonName}</Text>
                  <Text style={[styles.courseCount, { color: colors.secondaryFont }]}>
                    {seasonGroup.courses.length} course{seasonGroup.courses.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Ionicons 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.secondaryFont}
                />
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={styles.seasonContent}>
                  {seasonGroup.courses.map((course) => {
                    // Parse course name to extract course code and clean name
                    const courseCodeMatch = course.name.match(/\(([^)]+)\)/);
                    const courseCode = courseCodeMatch ? courseCodeMatch[1].replace(/\|/g, '') : '';
                    const cleanCourseName = course.name.replace(/\s*\([^)]+\)\s*/g, '').trim();
                    
                    return (
                      <View key={`${course.courseId}-${course.seasonId}`} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.courseName, { color: colors.text }]}>
                          {cleanCourseName}{courseCode && ` - ${courseCode}`}
                        </Text>
                        <Text style={[styles.meta, { color: colors.secondaryFont }]}>{course.season}</Text>
                        <TouchableOpacity style={[styles.button, { backgroundColor: colors.tint }]} onPress={() => onPressViewCourse(course)}>
                          <Text style={styles.buttonText}>View Course</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.secondaryFont }]}>No courses found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20, paddingBottom: 10 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontWeight: 'bold' },
  seasonsCounter: { fontSize: 14, fontWeight: '500' },
  listContent: { paddingBottom: 24 },
  seasonSection: { marginBottom: 16, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  seasonHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  seasonHeaderContent: { flex: 1 },
  seasonTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  courseCount: { fontSize: 14, fontWeight: '500' },
  seasonContent: { paddingHorizontal: 16, paddingBottom: 16 },
  card: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  courseName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 12, marginBottom: 2 },
  button: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center' },
  loadingText: { marginTop: 8 },
  error: { marginBottom: 8 },
});


