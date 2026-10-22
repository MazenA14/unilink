import { AppBar } from '@/components/navigation/AppBar';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing, Type, withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CmsUnseenSummary, fetchCmsUnseenSummary, getCachedCmsUnseenSummary, getCmsCourses, getCmsCourseView } from '@/utils/handlers/cmsHandler';
import type { CMSCourseRow } from '@/utils/parsers/cmsCoursesParser';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [unseen, setUnseen] = useState<CmsUnseenSummary | null>(null);

  const load = useCallback(async (bypassCache: boolean = false) => {
    try {
      setError(null);
      if (bypassCache) setRefreshing(true); else setLoading(true);
      const [data, unseenSummary] = await Promise.all([
        getCmsCourses(!bypassCache ? false : true),
        fetchCmsUnseenSummary().catch(() => null),
      ]);
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
        <CmsHomeSkeleton colors={colors} />
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
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerSoft }]}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}
      <FlatList
        data={groupedCourses}
        keyExtractor={(item) => item.seasonId}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        renderItem={({ item: seasonGroup, index }) => {
          const isExpanded = expandedSeasons.has(seasonGroup.seasonId);
          const isCurrent = index === 0;
          return (
            <View style={styles.seasonSection}>
              <TouchableOpacity
                style={[
                  styles.seasonHeader,
                  { backgroundColor: isExpanded ? 'transparent' : colors.surface },
                ]}
                onPress={() => toggleSeason(seasonGroup.seasonId)}
                activeOpacity={0.7}
              >
                <View style={styles.seasonHeaderContent}>
                  <View style={styles.seasonTitleRow}>
                    <Text style={[Type.h3, { color: colors.textPrimary, flexShrink: 1 }]} numberOfLines={1}>
                      {seasonGroup.seasonName}
                    </Text>
                    {isCurrent && (
                      <View style={[styles.currentPill, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
                        <Text style={[styles.currentPillText, { color: colors.tint }]}>Latest</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.seasonMeta, { color: colors.textTertiary }]}>
                    {seasonGroup.courses.length} course{seasonGroup.courses.length !== 1 ? 's' : ''}
                    {seasonGroup.unseenTotal > 0 && (
                      <Text style={{ color: colors.tint, fontWeight: '700' }}>{`  ·  ${seasonGroup.unseenTotal} new`}</Text>
                    )}
                  </Text>
                </View>
                <View style={[styles.chevronChip, { backgroundColor: isExpanded ? colors.tint : colors.surfaceSunken }]}>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={isExpanded ? colors.onPrimary : colors.textSecondary}
                    style={isExpanded && styles.chevronOpen}
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
                    const codeParts = splitCourseCode(courseCode);

                    const isCancelled = course.status.toLowerCase() === 'canceled' || course.status.toLowerCase() === 'cancelled';
                    const hasNew = course.unseenCount > 0;

                    return (
                      <TouchableOpacity
                        key={`${course.courseId}-${course.seasonId}`}
                        style={[
                          styles.card,
                          {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: hasNew ? withAlpha(colors.tint, 0.35) : colors.border,
                          },
                          hasNew ? Shadow.card(colors) : Shadow.xs(colors),
                          isCancelled && styles.cardCancelled,
                        ]}
                        onPress={() => onPressViewCourse(course)}
                        disabled={isCancelled}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isCancelled }}
                      >
                        <View
                          style={[
                            styles.codeBadge,
                            { backgroundColor: isCancelled ? colors.surfaceSunken : withAlpha(colors.tint, 0.1) },
                          ]}
                        >
                          {codeParts ? (
                            <>
                              <Text style={[styles.codeDept, { color: isCancelled ? colors.textTertiary : colors.tint }]} numberOfLines={1}>
                                {codeParts.dept}
                              </Text>
                              <Text style={[styles.codeNumber, { color: isCancelled ? colors.textTertiary : colors.tint }]} numberOfLines={1}>
                                {codeParts.number}
                              </Text>
                            </>
                          ) : (
                            <Ionicons name="book" size={20} color={isCancelled ? colors.textTertiary : colors.tint} />
                          )}
                          {hasNew && (
                            <View
                              style={[styles.unseenBadge, { backgroundColor: colors.tint, borderColor: colors.surfaceElevated }]}
                              accessibilityLabel={`${course.unseenCount} unseen item${course.unseenCount !== 1 ? 's' : ''}`}
                            >
                              <Text style={[styles.unseenBadgeText, { color: colors.onPrimary }]}>
                                {course.unseenCount > 99 ? '99+' : course.unseenCount}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.cardBody}>
                          <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={2}>
                            {cleanCourseName}
                          </Text>
                          <View style={styles.cardMetaRow}>
                            {isCancelled ? (
                              <View style={[styles.statusPill, { backgroundColor: colors.dangerSoft }]}>
                                <Text style={[styles.statusPillText, { color: colors.danger }]}>Cancelled</Text>
                              </View>
                            ) : hasNew ? (
                              <Text style={[styles.cardMeta, { color: colors.tint, fontWeight: '700' }]}>
                                {course.unseenCount} new item{course.unseenCount !== 1 ? 's' : ''}
                              </Text>
                            ) : (
                              <Text style={[styles.cardMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                                {course.season}
                              </Text>
                            )}
                          </View>
                        </View>
                        {!isCancelled && (
                          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                        )}
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
            <View style={[styles.emptyIconChip, { backgroundColor: colors.surface }]}>
              <Ionicons name="folder-open-outline" size={28} color={colors.textTertiary} />
            </View>
            <Text style={[Type.h3, { color: colors.textPrimary }]}>No courses found</Text>
            <Text style={[Type.subtext, { color: colors.textSecondary, textAlign: 'center' }]}>
              Pull down to refresh.
            </Text>
          </View>
        }
      />
    </View>
  );
}

type ThemeColors = (typeof Colors)['light'];

// "CSEN401" / "CSEN 401" -> { dept: "CSEN", number: "401" }
function splitCourseCode(code: string): { dept: string; number: string } | null {
  const match = code.trim().match(/^([A-Za-z]+)\s*(\d+[A-Za-z]?)$/);
  return match ? { dept: match[1].toUpperCase(), number: match[2] } : null;
}

function CmsHomeSkeleton({ colors }: { colors: ThemeColors }) {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const line = (width: number | `${number}%`, height = 12) => (
    <View style={{ width, height, borderRadius: Radius.xs, backgroundColor: colors.surfaceSunken }} />
  );

  return (
    <Animated.View style={[styles.listContent, { opacity: pulse }]}>
      <View style={[styles.seasonHeader, { paddingHorizontal: Spacing.xs }]}>
        <View style={{ flex: 1, gap: Spacing.sm }}>
          {line('55%', 16)}
          {line('25%')}
        </View>
      </View>
      <View style={styles.seasonContent}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[styles.card, { backgroundColor: colors.surface, borderColor: 'transparent' }]}>
            <View style={[styles.codeBadge, { backgroundColor: colors.surfaceSunken }]} />
            <View style={{ flex: 1, gap: Spacing.sm }}>
              {line('75%', 14)}
              {line('40%')}
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: 24 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  // Season
  seasonSection: { marginBottom: Spacing.md },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
  },
  seasonHeaderContent: { flex: 1, gap: 3 },
  seasonTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  seasonMeta: { ...Type.caption, fontWeight: '500' },
  currentPill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },
  currentPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  chevronChip: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  seasonContent: { gap: Spacing.sm + 2 },
  // Course card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  cardCancelled: { opacity: 0.6 },
  codeBadge: {
    width: 54,
    height: 54,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  codeDept: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  codeNumber: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginTop: -1 },
  unseenBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unseenBadgeText: { fontSize: 10, fontWeight: '800' },
  cardBody: { flex: 1, gap: 4 },
  courseName: { ...Type.body, fontWeight: '700', lineHeight: 20 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center' },
  cardMeta: { ...Type.caption, fontWeight: '500' },
  statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: Spacing.huge, gap: Spacing.sm },
  emptyIconChip: { width: 64, height: 64, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
});
