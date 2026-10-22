import { getInitials, InstructorProfileModal } from '@/components/InstructorProfileModal';
import { AppBar } from '@/components/navigation/AppBar';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { SegmentOption, SegmentedControl } from '@/components/ui/SegmentedControl';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing, Type, withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GUCAPIProxy, Instructor } from '@/utils/gucApiProxy';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

type Tab = 'instructors' | 'courses';
type Course = { value: string; text: string };
type ThemeColors = (typeof Colors)['light'];

const TAB_OPTIONS: SegmentOption<Tab>[] = [
  { value: 'instructors', label: 'My Instructors', icon: 'people' },
  { value: 'courses', label: 'By Course', icon: 'book' },
];

// Leading academic titles, ignored when sorting/grouping by name
const TITLE_PREFIX = /^((dr|prof|eng|assoc|asst|mr|mrs|ms)\.?\s+)+/i;
const sortName = (name: string) => name.replace(TITLE_PREFIX, '').trim() || name;

// "CSEN 401", "MATH501", "DMET 502L" …
const COURSE_CODE = /\b([A-Z]{2,5})\s?(\d{3,4}[A-Z]?)\b/;

function parseCourse(text: string): { dept: string | null; number: string | null; name: string } {
  const match = text.match(COURSE_CODE);
  const tail = text.split('-').pop()?.trim() || text;
  if (!match) return { dept: null, number: null, name: tail };
  const name = tail.replace(match[0], '').replace(/^[\s|()\-:]+|[\s|()\-:]+$/g, '').trim();
  return { dept: match[1], number: match[2], name: name || tail };
}

function avatarColor(name: string, colors: ThemeColors): string {
  const palette = [colors.tint, colors.secondary, colors.success, colors.warning, colors.cms];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function matchesQuery(text: string, words: string[]): boolean {
  const haystack = text.toLowerCase();
  return words.every(w => haystack.includes(w));
}

export default function InstructorsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('instructors');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');

  // Course dropdown state - track which courses are expanded
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [courseInstructors, setCourseInstructors] = useState<{[courseValue: string]: Instructor[]}>({});
  const [loadingCourseInstructors, setLoadingCourseInstructors] = useState<{[courseValue: string]: boolean}>({});
  const [courseErrors, setCourseErrors] = useState<{[courseValue: string]: string}>({});
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

  const fetchCourseInstructors = useCallback(async (course: Course) => {
    try {
      setLoadingCourseInstructors(prev => ({ ...prev, [course.value]: true }));
      setCourseErrors(prev => {
        const { [course.value]: _, ...rest } = prev;
        return rest;
      });

      const instructors = await GUCAPIProxy.getInstructorsByCourse(course.value);
      setCourseInstructors(prev => ({ ...prev, [course.value]: instructors }));
    } catch (err: any) {
      // Scoped to the card so one failed course doesn't blank the whole screen
      setCourseErrors(prev => ({ ...prev, [course.value]: err.message || 'Failed to load instructors' }));
    } finally {
      setLoadingCourseInstructors(prev => ({ ...prev, [course.value]: false }));
    }
  }, []);

  const handleCoursePress = useCallback((course: Course) => {
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

  const searchWords = useMemo(
    () => searchQuery.toLowerCase().split(/\s+/).filter(Boolean),
    [searchQuery]
  );

  // Alphabetical A–Z sections, ignoring titles like "Dr."
  const instructorSections = useMemo(() => {
    const filtered = instructors
      .filter(i => matchesQuery(i.name, searchWords))
      .sort((a, b) => sortName(a.name).localeCompare(sortName(b.name)));
    const sections: { title: string; data: Instructor[] }[] = [];
    for (const instructor of filtered) {
      const first = sortName(instructor.name)[0]?.toUpperCase() ?? '#';
      const letter = /[A-Z]/.test(first) ? first : '#';
      const last = sections[sections.length - 1];
      if (last?.title === letter) last.data.push(instructor);
      else sections.push({ title: letter, data: [instructor] });
    }
    return sections;
  }, [instructors, searchWords]);

  const filteredCourses = useMemo(
    () => courses
      .filter(c => matchesQuery(c.text, searchWords))
      .sort((a, b) => a.text.localeCompare(b.text)),
    [courses, searchWords]
  );

  const resultCount = activeTab === 'instructors'
    ? instructorSections.reduce((n, s) => n + s.data.length, 0)
    : filteredCourses.length;
  const totalCount = activeTab === 'instructors' ? instructors.length : courses.length;

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderInstructor = ({ item, index, section }: { item: Instructor; index: number; section: { data: Instructor[] } }) => {
    const isFirst = index === 0;
    const isLast = index === section.data.length - 1;
    const accent = avatarColor(item.name, colors);
    return (
      <TouchableOpacity
        style={[
          styles.instructorRow,
          { backgroundColor: colors.surface },
          isFirst && styles.groupTop,
          isLast && styles.groupBottom,
        ]}
        onPress={() => handleInstructorPress(item)}
        activeOpacity={0.6}
      >
        <View style={[styles.avatar, { backgroundColor: withAlpha(accent, 0.16) }]}>
          <Text style={[styles.avatarText, { color: accent }]}>{getInitials(item.name)}</Text>
        </View>
        <View style={[styles.rowBody, !isLast && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth }]}>
          <Text style={[styles.instructorName, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderCourse = ({ item }: { item: Course }) => {
    const isExpanded = expandedCourses.has(item.value);
    const instructors = courseInstructors[item.value];
    const isLoading = loadingCourseInstructors[item.value] || false;
    const courseError = courseErrors[item.value];
    const { dept, number, name } = parseCourse(item.text);

    return (
      <View
        style={[
          styles.courseCard,
          { backgroundColor: colors.surfaceElevated, borderColor: isExpanded ? withAlpha(colors.tint, 0.35) : colors.border },
          isExpanded ? Shadow.card(colors) : Shadow.xs(colors),
        ]}
      >
        <TouchableOpacity
          style={styles.courseHeader}
          onPress={() => handleCoursePress(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.codeBadge, { backgroundColor: withAlpha(colors.tint, isExpanded ? 0.16 : 0.1) }]}>
            {dept && number ? (
              <>
                <Text style={[styles.codeDept, { color: colors.tint }]}>{dept}</Text>
                <Text style={[styles.codeNumber, { color: colors.tint }]}>{number}</Text>
              </>
            ) : (
              <Ionicons name="book" size={20} color={colors.tint} />
            )}
          </View>
          <View style={styles.courseInfo}>
            <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={2}>
              {name}
            </Text>
            <Text style={[styles.courseMeta, { color: colors.textTertiary }]}>
              {instructors
                ? `${instructors.length} instructor${instructors.length === 1 ? '' : 's'}`
                : 'Tap to see instructors'}
            </Text>
          </View>
          <View style={[styles.chevronWrap, { backgroundColor: isExpanded ? colors.tint : colors.surface }]}>
            <Ionicons
              name="chevron-down"
              size={16}
              color={isExpanded ? colors.onPrimary : colors.textSecondary}
              style={isExpanded && styles.chevronOpen}
            />
          </View>
        </TouchableOpacity>

        {/* Instructor Dropdown */}
        {isExpanded && (
          <View style={[styles.dropdown, { backgroundColor: colors.surface }]}>
            {isLoading ? (
              <View style={styles.dropdownState}>
                <ActivityIndicator size="small" color={colors.tint} />
                <Text style={[styles.dropdownStateText, { color: colors.textSecondary }]}>
                  Loading instructors…
                </Text>
              </View>
            ) : courseError ? (
              <TouchableOpacity style={styles.dropdownState} onPress={() => fetchCourseInstructors(item)}>
                <Ionicons name="refresh" size={16} color={colors.error} />
                <Text style={[styles.dropdownStateText, { color: colors.error }]}>
                  Couldn&apos;t load · Tap to retry
                </Text>
              </TouchableOpacity>
            ) : instructors && instructors.length > 0 ? (
              instructors.map((instructor, index) => {
                const accent = avatarColor(instructor.name, colors);
                return (
                  <TouchableOpacity
                    key={instructor.value}
                    style={[
                      styles.dropdownItem,
                      index < instructors.length - 1 && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth },
                    ]}
                    onPress={() => handleInstructorPress(instructor, item.value)}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.smallAvatar, { backgroundColor: withAlpha(accent, 0.16) }]}>
                      <Text style={[styles.smallAvatarText, { color: accent }]}>{getInitials(instructor.name)}</Text>
                    </View>
                    <Text style={[styles.dropdownName, { color: colors.textPrimary }]} numberOfLines={2}>
                      {instructor.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.dropdownState}>
                <Ionicons name="people-outline" size={16} color={colors.textTertiary} />
                <Text style={[styles.dropdownStateText, { color: colors.textSecondary }]}>
                  No instructors listed
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => {
    const searching = searchWords.length > 0;
    return (
      <View style={styles.centerState}>
        <View style={[styles.stateIcon, { backgroundColor: colors.surface }]}>
          <Ionicons
            name={searching ? 'search' : activeTab === 'instructors' ? 'people-outline' : 'book-outline'}
            size={28}
            color={colors.textTertiary}
          />
        </View>
        <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
          {searching ? 'No matches' : activeTab === 'instructors' ? 'No instructors yet' : 'No courses found'}
        </Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          {searching
            ? `Nothing matches “${searchQuery.trim()}”. Try a different name.`
            : 'Pull down to refresh, or check back later.'}
        </Text>
      </View>
    );
  };

  const listProps = {
    style: styles.list,
    contentContainerStyle: styles.listContainer,
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: 'handled' as const,
    keyboardDismissMode: 'on-drag' as const,
    refreshControl: <AppRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />,
    ListEmptyComponent: renderEmptyState,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppBar title="Instructors" />

      {loading && !refreshing ? (
        <ListSkeleton colors={colors} />
      ) : error ? (
        <View style={styles.centerState}>
          <View style={[styles.stateIcon, { backgroundColor: withAlpha(colors.error, 0.12) }]}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.error} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>Couldn&apos;t load instructors</Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={() => fetchData()}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color={colors.onPrimary} />
            <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.controls}>
            <SegmentedControl options={TAB_OPTIONS} value={activeTab} onChange={setActiveTab} />

            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={activeTab === 'instructors' ? 'Search instructors' : 'Search courses or codes'}
                placeholderTextColor={colors.textTertiary}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.resultCount, { color: colors.textTertiary }]}>
              {searchWords.length > 0
                ? `${resultCount} of ${totalCount} ${activeTab === 'instructors' ? 'instructors' : 'courses'}`
                : activeTab === 'instructors'
                  ? `${totalCount} instructor${totalCount === 1 ? '' : 's'} · Tap one to view their profile`
                  : `${totalCount} course${totalCount === 1 ? '' : 's'} · Tap one to see who teaches it`}
            </Text>
          </View>

          {activeTab === 'instructors' ? (
            <SectionList
              {...listProps}
              sections={instructorSections}
              renderItem={renderInstructor}
              keyExtractor={(item) => item.value}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section }) => (
                <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>{section.title}</Text>
              )}
            />
          ) : (
            <FlatList
              {...listProps}
              data={filteredCourses}
              renderItem={renderCourse}
              keyExtractor={(item) => item.value}
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

function ListSkeleton({ colors }: { colors: ThemeColors }) {
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

  const block = { backgroundColor: colors.surfaceSunken };

  return (
    <Animated.View style={[styles.controls, { opacity: pulse }]}>
      <View style={[styles.skeletonTrack, block]} />
      <View style={[styles.skeletonSearch, { backgroundColor: colors.surface }]} />
      <View style={[styles.skeletonLine, block, { width: 90, marginTop: Spacing.lg, marginBottom: Spacing.sm }]} />
      <View style={[styles.groupTop, styles.groupBottom, { backgroundColor: colors.surface, overflow: 'hidden' }]}>
        {[0.7, 0.55, 0.8, 0.6, 0.5, 0.75].map((w, i) => (
          <View key={i} style={styles.instructorRow}>
            <View style={[styles.avatar, block]} />
            <View style={[styles.skeletonLine, block, { width: `${w * 100}%` as `${number}%` }]} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  controls: {
    paddingHorizontal: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 11,
  },
  resultCount: {
    ...Type.caption,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  list: {
    flex: 1,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  // Instructors (inset grouped list)
  sectionHeader: {
    ...Type.overline,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  groupTop: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  groupBottom: {
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    gap: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 15,
    paddingRight: 14,
  },
  instructorName: {
    ...Type.body,
    flex: 1,
    fontWeight: '600',
  },
  // Courses
  courseCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: Spacing.md,
  },
  codeBadge: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeDept: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  codeNumber: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginTop: -1,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    ...Type.body,
    fontWeight: '700',
    lineHeight: 20,
  },
  courseMeta: {
    ...Type.caption,
    fontWeight: '500',
    marginTop: 3,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdown: {
    marginHorizontal: Spacing.sm + 2,
    marginBottom: Spacing.sm + 2,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: Spacing.md - 2,
  },
  smallAvatar: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallAvatarText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dropdownName: {
    ...Type.callout,
    flex: 1,
  },
  dropdownState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  dropdownStateText: {
    ...Type.subtext,
  },
  // Loading / empty / error
  skeletonTrack: {
    height: 46,
    borderRadius: Radius.lg,
  },
  skeletonSearch: {
    height: 44,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  skeletonLine: {
    height: 12,
    borderRadius: Radius.xs,
    marginVertical: 14,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.huge,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  stateTitle: {
    ...Type.h3,
    marginBottom: Spacing.xs + 2,
    textAlign: 'center',
  },
  stateText: {
    ...Type.subtext,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 3,
    borderRadius: Radius.pill,
  },
  retryButtonText: {
    ...Type.callout,
  },
});
