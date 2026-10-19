import { AppBar } from '@/components/navigation/AppBar';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing, Type, withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CmsUnseenSummary, fetchCmsUnseenSummary, getCachedCmsUnseenSummary, getCmsCourses, getCmsCourseView } from '@/utils/handlers/cmsHandler';
import type { CMSCourseRow } from '@/utils/parsers/cmsCoursesParser';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { perfAsync } from '@/utils/perfLog';

export default function CMSHomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [courses, setCourses] = useState<CMSCourseRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [unseen, setUnseen] = useState<CmsUnseenSummary | null>(null);

  const load = useCallback(async (bypassCache: boolean = false) => {
    try {
      setError(null);
      if (bypassCache) setRefreshing(true); else setLoading(true);
      const [data, unseenSummary] = await perfAsync('CMS home: everything', () => Promise.all([
        perfAsync(`CMS home: courses${bypassCache ? ' (refresh)' : ''}`, () => getCmsCourses(!bypassCache ? false : true)),
        perfAsync('CMS home: unseen summary', () => fetchCmsUnseenSummary().catch(() => null)),
      ]));
      setCourses(data);
      if (unseenSummary) setUnseen(unseenSummary);
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

  // Pick up items marked seen inside a course when returning to this screen
  useFocusEffect(
    useCallback(() => {
      getCachedCmsUnseenSummary().then((cached) => {
        if (cached) setUnseen(cached);
      });
    }, [])
  );

  const groupedCourses = useMemo(() => {
    if (!courses) return [];

    const groups = courses.reduce((acc, course) => {
      const seasonKey = course.seasonId;
      if (!acc[seasonKey]) {
        acc[seasonKey] = [];
      }
      acc[seasonKey].push(course);
      return acc;
    }, {} as Record<string, CMSCourseRow[]>);

    const sortedSeasons = Object.keys(groups).sort((a, b) => {
      const aNum = Number(a);
      const bNum = Number(b);
      return bNum - aNum;
    });

    // Unseen counts only describe the current offering, so attach them to the
    // newest season a course appears in.
    const claimedCourseIds = new Set<string>();
    const unseenFor = (course: CMSCourseRow) => {
      if (!unseen || claimedCourseIds.has(course.courseId)) return 0;
      const entry = unseen[course.courseId];
      if (!entry) return 0;
      claimedCourseIds.add(course.courseId);
      return entry.unseen;
    };

    const result = sortedSeasons.map(seasonId => {
      const firstCourse = groups[seasonId][0];
      const seasonTitle = firstCourse?.seasonTitle || `Season ${seasonId}`;
      const seasonCourses = groups[seasonId].map(course => ({ ...course, unseenCount: unseenFor(course) }));
      return {
        seasonId,
        seasonName: `${seasonTitle} - ${seasonId}`,
        courses: seasonCourses,
        unseenTotal: seasonCourses.reduce((sum, c) => sum + c.unseenCount, 0),
      };
    });

    return result;
  }, [courses, unseen]);

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

      const isCancelled = row.status.toLowerCase() === 'canceled' || row.status.toLowerCase() === 'cancelled';
      if (isCancelled) {
        setError('Cannot view cancelled course');
        return;
      }

      getCmsCourseView(row.courseId, row.seasonId).catch(() => {});
      router.push({ pathname: '/course-view', params: { id: row.courseId, sid: row.seasonId } });
    } catch (e: any) {
      setError(e?.message || 'Failed to open course');
    }
  }, []);

  if (loading && !courses) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppBar title="CMS" large />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.cms} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading CMS courses…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppBar
        title="CMS"
        large
        subtitle={groupedCourses.length > 0 ? `${groupedCourses.length} season${groupedCourses.length !== 1 ? 's' : ''}` : undefined}
      />
      {!!error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerSoft, borderColor: withAlpha(colors.danger, 0.3) }]}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}
      <FlatList
        data={groupedCourses}
        keyExtractor={(item) => item.seasonId}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24, paddingHorizontal: Spacing.xl },
        ]}
        renderItem={({ item: seasonGroup }) => {
          const isExpanded = expandedSeasons.has(seasonGroup.seasonId);
          return (
            <View
              style={[
                styles.seasonSection,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.divider },
                Shadow.card(colors),
              ]}
            >
              <TouchableOpacity
                style={styles.seasonHeader}
                onPress={() => toggleSeason(seasonGroup.seasonId)}
                activeOpacity={0.7}
              >
                <View style={[styles.seasonIconChip, { backgroundColor: withAlpha(colors.cms, 0.14) }]}>
                  <Ionicons name="school-outline" size={20} color={colors.cms} />
                </View>
                <View style={styles.seasonHeaderContent}>
                  <Text style={[Type.h3, { color: colors.textPrimary }]} numberOfLines={1}>{seasonGroup.seasonName}</Text>
                  <View style={styles.pillRow}>
                    <View style={[styles.countPill, { backgroundColor: withAlpha(colors.cms, 0.12) }]}>
                      <Text style={[styles.countPillText, { color: colors.cms }]}>
                        {seasonGroup.courses.length} course{seasonGroup.courses.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {seasonGroup.unseenTotal > 0 && (
                      <View style={[styles.countPill, styles.unseenPill, { backgroundColor: colors.dangerSoft }]}>
                        <View style={[styles.unseenDot, { backgroundColor: colors.danger }]} />
                        <Text style={[styles.countPillText, { color: colors.danger }]}>
                          {seasonGroup.unseenTotal} new
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[styles.chevronChip, { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.seasonContent}>
                  {seasonGroup.courses.map((course) => {
                    // Parse course name to extract course code and clean name
                    const courseCodeMatch = course.name.match(/\(([^)]+)\)/);
                    const courseCode = courseCodeMatch ? courseCodeMatch[1].replace(/\|/g, '') : '';
                    const cleanCourseName = course.name.replace(/\s*\([^)]+\)\s*/g, '').trim();

                    const isCancelled = course.status.toLowerCase() === 'canceled' || course.status.toLowerCase() === 'cancelled';

                    return (
                      <TouchableOpacity
                        key={`${course.courseId}-${course.seasonId}`}
                        style={[
                          styles.card,
                          { backgroundColor: colors.surfaceAlt, borderColor: colors.divider },
                          isCancelled && styles.cardCancelled,
                        ]}
                        onPress={() => onPressViewCourse(course)}
                        disabled={isCancelled}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isCancelled }}
                      >
                        <View style={styles.cardRow}>
                        <View style={styles.cardBody}>
                        <View style={styles.cardTopRow}>
                          {!!courseCode && (
                            <View style={[styles.codePill, { backgroundColor: withAlpha(colors.cms, 0.12) }]}>
                              <Text style={[styles.codePillText, { color: colors.cms }]}>{courseCode}</Text>
                            </View>
                          )}
                          {isCancelled && (
                            <View style={[styles.codePill, { backgroundColor: colors.dangerSoft }]}>
                              <Text style={[styles.codePillText, { color: colors.danger }]}>Cancelled</Text>
                            </View>
                          )}
                          {course.unseenCount > 0 && (
                            <View
                              style={[styles.unseenBadge, { backgroundColor: colors.danger }]}
                              accessibilityLabel={`${course.unseenCount} unseen item${course.unseenCount !== 1 ? 's' : ''}`}
                            >
                              <Text style={[styles.unseenBadgeText, { color: colors.onAccent }]}>{course.unseenCount} new</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[Type.bodyStrong, { color: colors.textPrimary, marginTop: Spacing.xs }]}>
                          {cleanCourseName}
                        </Text>
                        <Text style={[Type.caption, { color: colors.textSecondary, marginTop: 2, textTransform: 'none', letterSpacing: 0 }]}>
                          {course.season}
                        </Text>
                        </View>
                        {!isCancelled && (
                          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                        )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconChip, { backgroundColor: withAlpha(colors.cms, 0.12) }]}>
              <Ionicons name="folder-open-outline" size={28} color={colors.cms} />
            </View>
            <Text style={[Type.body, { color: colors.textSecondary, textAlign: 'center' }]}>No courses found.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 24 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  seasonSection: { marginBottom: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  seasonHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  seasonIconChip: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  seasonHeaderContent: { flex: 1, gap: Spacing.xs },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  unseenPill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  unseenDot: { width: 6, height: 6, borderRadius: 3 },
  unseenBadge: { marginLeft: 'auto', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  unseenBadgeText: { fontSize: 11, fontWeight: '800' },
  countPill: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill, marginTop: 2 },
  countPillText: { fontSize: 11, fontWeight: '700' },
  chevronChip: { width: 30, height: 30, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  seasonContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.sm },
  card: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardBody: { flex: 1 },
  cardCancelled: { opacity: 0.7 },
  cardTopRow: { flexDirection: 'row', gap: Spacing.xs },
  codePill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  codePillText: { fontSize: 11, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingTop: Spacing.huge, gap: Spacing.md },
  emptyIconChip: { width: 64, height: 64, borderRadius: Radius.xxl, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: Spacing.sm, fontSize: 14, fontWeight: '500' },
});
