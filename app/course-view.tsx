import { AppBar } from '@/components/navigation/AppBar';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing, Type, withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getCmsCourseView, previewCmsContent, saveCmsContent } from '@/utils/handlers/cmsHandler';
import type { CMSCourseView } from '@/utils/parsers/cmsCourseViewParser';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CMSCourseViewScreen() {
  const { id, sid } = useLocalSearchParams<{ id: string; sid: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseData, setCourseData] = useState<CMSCourseView | null>(null);
  const [announcementsExpanded, setAnnouncementsExpanded] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  // Tracks the in-flight action per content item, e.g. "217866:preview".
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const load = useCallback(async (bypassCache: boolean = false) => {
    try {
      setError(null);
      if (bypassCache) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      if (!id || !sid) throw new Error('Missing course parameters');
      const data = await getCmsCourseView(String(id), String(sid), bypassCache);
      setCourseData(data);
    } catch (e: any) {
      console.error('Error loading course view:', e);
      setError(e?.message || 'Failed to load course');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, sid]);

  const onRefresh = useCallback(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePreview = useCallback(async (key: string, url: string, title?: string) => {
    if (busyItem) return;
    try {
      setError(null);
      setBusyItem(`${key}:preview`);
      await previewCmsContent(url, title);
    } catch (e: any) {
      setError(e?.message || 'Failed to preview file');
    } finally {
      setBusyItem(null);
    }
  }, [busyItem]);

  const handleSave = useCallback(async (key: string, url: string, title?: string) => {
    if (busyItem) return;
    try {
      setError(null);
      setBusyItem(`${key}:download`);
      const saved = await saveCmsContent(url, title);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Saved "${saved.fileName}" to Downloads`, ToastAndroid.LONG);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to download file');
    } finally {
      setBusyItem(null);
    }
  }, [busyItem]);

  const handleWatchVideo = useCallback(async (url: string) => {
    try {
      // Use the course ID and season ID to construct the course page URL
      if (!id || !sid) {
        setError('Missing course parameters');
        return;
      }
      const coursePageUrl = `https://cms.guc.edu.eg/apps/student/CourseViewStn.aspx?id=${id}&sid=${sid}`;
      console.log('Opening course page:', coursePageUrl);
      await Linking.openURL(coursePageUrl);
    } catch (e: any) {
      setError(e?.message || 'Failed to open course page');
    }
  }, [id, sid]);

  const handleLinkPress = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (e: any) {
      setError(e?.message || 'Failed to open link');
    }
  }, []);

  const parseAnnouncementText = (html: string) => {
    // First, extract tables and replace them with placeholders
    const tableMatches: { placeholder: string; tableHtml: string }[] = [];
    let processedHtml = html;
    let tableIndex = 0;

    // Find all tables in the HTML
    const tableRegex = /<table[^>]*>.*?<\/table>/gs;
    let match;
    while ((match = tableRegex.exec(html)) !== null) {
      const placeholder = `__TABLE_PLACEHOLDER_${tableIndex}__`;
      tableMatches.push({
        placeholder,
        tableHtml: match[0]
      });
      processedHtml = processedHtml.replace(match[0], placeholder);
      tableIndex++;
    }

    // Split by both <p>, <h[1-6]>, and table placeholders
    const elements = processedHtml.split(/(<p[^>]*>|<h[1-6][^>]*>|__TABLE_PLACEHOLDER_\d+__)/i);
    const allParts: { type: 'text' | 'link' | 'table', content: string, url?: string, bold?: boolean, tableData?: any }[] = [];

    elements.forEach((element, elementIndex) => {
      if (!element.trim()) return;

      // Check if this is a table placeholder
      const isTablePlaceholder = /__TABLE_PLACEHOLDER_\d+__/.test(element);
      if (isTablePlaceholder) {
        const tableMatch = tableMatches.find(t => t.placeholder === element);
        if (tableMatch) {
          // Parse the table HTML and add it as a table part
          const { parseHtmlTable } = require('@/components/ui/Table');
          const tableData = parseHtmlTable(tableMatch.tableHtml);
          if (tableData) {
            allParts.push({
              type: 'table',
              content: '',
              tableData
            });
          }
        }
        return;
      }

      // Check if this is a heading tag
      const isHeading = /<h[1-6][^>]*>/i.test(element);
      const isParagraph = /<p[^>]*>/i.test(element);

      if (isHeading || isParagraph) {
        // Find the corresponding closing tag
        const tagName = element.match(/<(\w+)/i)?.[1] || '';
        const nextElement = elements[elementIndex + 1];
        if (!nextElement) return;

        // Remove closing tag and clean up
        const cleanElement = nextElement.replace(new RegExp(`</${tagName}>`, 'gi'), '').trim();
        if (!cleanElement) return;

        // Extract links and format text for this element
        const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
        const parts: { type: 'text' | 'link', content: string, url?: string, bold?: boolean }[] = [];
        let lastIndex = 0;
        let match;

        while ((match = linkRegex.exec(cleanElement)) !== null) {
          // Add text before the link, handling <strong> tags
          if (match.index > lastIndex) {
            const textBefore = cleanElement.substring(lastIndex, match.index);

            // Split by <strong> tags to handle bold text
            const strongParts = textBefore.split(/(<strong[^>]*>|<\/strong>)/i);
            let isBold = false;

            strongParts.forEach((part) => {
              if (/<strong[^>]*>/i.test(part)) {
                isBold = true;
              } else if (/<\/strong>/i.test(part)) {
                isBold = false;
              } else if (part.trim()) {
                const cleanText = part
                  .replace(/<[^>]*>/g, ' ') // Remove HTML tags
                  .replace(/&nbsp;/g, '') // Remove &nbsp; entities
                  .replace(/\s+/g, ' ') // Normalize whitespace
                  .trim();
                if (cleanText) {
                  parts.push({
                    type: 'text',
                    content: cleanText,
                    bold: isBold
                  });
                }
              }
            });
          }

          // Add the link
          parts.push({
            type: 'link',
            content: match[2].trim(),
            url: match[1]
          });

          lastIndex = match.index + match[0].length;
        }

        // Add remaining text in this element, handling <strong> tags
        if (lastIndex < cleanElement.length) {
          const remainingText = cleanElement.substring(lastIndex);

          // Split by <strong> tags to handle bold text
          const strongParts = remainingText.split(/(<strong[^>]*>|<\/strong>)/i);
          let isBold = false;

          strongParts.forEach((part) => {
            if (/<strong[^>]*>/i.test(part)) {
              isBold = true;
            } else if (/<\/strong>/i.test(part)) {
              isBold = false;
            } else if (part.trim()) {
              const cleanText = part
                .replace(/<[^>]*>/g, ' ') // Remove HTML tags
                .replace(/&nbsp;/g, '') // Remove &nbsp; entities
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
              if (cleanText) {
                parts.push({
                  type: 'text',
                  content: cleanText,
                  bold: isBold
                });
              }
            }
          });
        }

        // Add line break before headings and paragraphs (except the first one)
        if (elementIndex > 0 && parts.length > 0) {
          allParts.push({ type: 'text', content: '\n' });
        }

        allParts.push(...parts);
      }
    });

    return allParts;
  };

  const announcementParts = useMemo(() => {
    if (!announcementsExpanded || !courseData?.announcementsHtml) return [];
    return parseAnnouncementText(courseData.announcementsHtml);
  }, [announcementsExpanded, courseData?.announcementsHtml]);

  const toggleWeek = useCallback((weekIndex: number) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekIndex)) {
        newSet.delete(weekIndex);
      } else {
        newSet.add(weekIndex);
      }
      return newSet;
    });
  }, []);

  const courseTitle = (() => {
    const courseName = courseData?.header.courseName || 'Course';
    const courseCodeMatch = courseName.match(/\(([^)]+)\)/);
    const courseCode = courseCodeMatch ? courseCodeMatch[1].replace(/\|/g, '') : '';
    const cleanCourseName = courseName.replace(/\s*\([^)]+\)\s*/g, '').trim();
    return courseCode ? `${cleanCourseName} - ${courseCode}` : cleanCourseName;
  })();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppBar title="Course" variant="back" />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.cms} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading course…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppBar
        title={courseTitle}
        subtitle={courseData?.header.seasonName}
        variant="back"
      />

      {(courseData?.header.totalWeeks || !!error) && (
        <View style={styles.metaRow}>
          {!!courseData?.header.totalWeeks && (
            <View style={[styles.metaPill, { backgroundColor: withAlpha(colors.cms, 0.12) }]}>
              <Ionicons name="calendar-outline" size={13} color={colors.cms} />
              <Text style={[styles.metaPillText, { color: colors.cms }]}>{courseData.header.totalWeeks} weeks</Text>
            </View>
          )}
          {!!courseData?.header.contentCount && (
            <View style={[styles.metaPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider, borderWidth: 1 }]}>
              <Ionicons name="documents-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.metaPillText, { color: colors.textSecondary }]}>{courseData.header.contentCount} items</Text>
            </View>
          )}
        </View>
      )}

      {!!error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerSoft, borderColor: withAlpha(colors.danger, 0.3) }]}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Announcements Section */}
        {courseData?.announcementsHtml && (
          <View style={[styles.section, { backgroundColor: colors.surfaceElevated, borderColor: colors.divider }, Shadow.card(colors)]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setAnnouncementsExpanded(!announcementsExpanded)}
              activeOpacity={0.7}
            >
              <View style={[styles.sectionIconChip, { backgroundColor: withAlpha(colors.cms, 0.14) }]}>
                <Ionicons name="megaphone-outline" size={18} color={colors.cms} />
              </View>
              <Text style={[Type.h3, { color: colors.textPrimary, flex: 1 }]}>Announcements</Text>
              <View style={[styles.chevronChip, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons
                  name={announcementsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textSecondary}
                />
              </View>
            </TouchableOpacity>

            {announcementsExpanded && (
              <View style={styles.announcementContent}>
                {announcementParts.map((part, index) => {
                  if (part.type === 'link') {
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleLinkPress(part.url!)}
                        style={styles.linkContainer}
                      >
                        <Text style={[styles.linkText, { color: colors.cms }]}>{part.content}</Text>
                      </TouchableOpacity>
                    );
                  } else if (part.type === 'table') {
                    const Table = require('@/components/ui/Table').default;
                    return (
                      <Table
                        key={index}
                        data={part.tableData}
                        style={styles.announcementTable}
                      />
                    );
                  } else {
                    return (
                      <Text
                        key={index}
                        style={[
                          styles.announcementText,
                          { color: colors.textPrimary },
                          part.content === '\n' && styles.paragraphBreak,
                          part.bold && styles.boldText
                        ]}
                      >
                        {part.content}
                      </Text>
                    );
                  }
                })}
              </View>
            )}
          </View>
        )}

        {/* Weeks Section */}
        {courseData?.weeks && courseData.weeks.length > 0 && (
          <View style={styles.weeksContainer}>
            <Text style={[Type.overline, styles.courseContentTitle, { color: colors.textSecondary }]}>Course Content</Text>
            {courseData.weeks.map((week, weekIndex) => {
              const isExpanded = expandedWeeks.has(weekIndex);
              const hasContent = week.contents && week.contents.length > 0;
              const hasAnnouncement = week.announcement && week.announcement.trim() !== '';
              const hasDescription = week.description && week.description.trim() !== '';

              return (
                <View
                  key={weekIndex}
                  style={[styles.weekCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.divider }, Shadow.card(colors)]}
                >
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => toggleWeek(weekIndex)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sectionIconChip, { backgroundColor: withAlpha(colors.cms, 0.14) }]}>
                      <Ionicons name="calendar-outline" size={16} color={colors.cms} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[Type.h3, { color: colors.textPrimary }]} numberOfLines={1}>{week.weekLabel}</Text>
                      {hasContent && (
                        <Text style={[styles.weekContentCount, { color: colors.textSecondary }]}>
                          {week.contents!.length} item{week.contents!.length !== 1 ? 's' : ''}
                        </Text>
                      )}
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
                    <View style={styles.weekContent}>
                      {hasAnnouncement && (
                        <View style={styles.weekAnnouncement}>
                          <Text style={[styles.weekAnnouncementLabel, { color: colors.textPrimary }]}>Announcement</Text>
                          <Text style={[styles.weekAnnouncementText, { color: colors.textSecondary }]}>{week.announcement}</Text>
                        </View>
                      )}

                      {hasDescription && (
                        <View style={styles.weekDescription}>
                          <Text style={[styles.weekAnnouncementLabel, { color: colors.textPrimary }]}>Description</Text>
                          <Text style={[styles.weekAnnouncementText, { color: colors.textSecondary }]}>{week.description}</Text>
                        </View>
                      )}

                      {hasContent && (
                        <View style={styles.contentsContainer}>
                          {week.contents!.map((content, contentIndex) => (
                            <View
                              key={contentIndex}
                              style={[styles.contentItem, { backgroundColor: colors.surfaceAlt, borderColor: colors.divider }]}
                            >
                              <View style={styles.contentItemHeader}>
                                <Text style={[Type.bodyStrong, { color: colors.textPrimary, flex: 1 }]}>{content.title}</Text>
                                {content.seen && (
                                  <Ionicons name="eye" size={15} color={colors.textTertiary} style={styles.seenIcon} />
                                )}
                              </View>
                              {content.type && (
                                <View style={[styles.typeBadge, { backgroundColor: colors.infoSoft }]}>
                                  <Text style={[styles.typeBadgeText, { color: colors.info }]}>{content.type}</Text>
                                </View>
                              )}
                              {content.description && (
                                <Text style={[styles.contentDescription, { color: colors.textSecondary }]}>{content.description}</Text>
                              )}
                              <View style={styles.buttonContainer}>
                                {content.type === 'VoD' && content.watchUrl ? (
                                  <TouchableOpacity
                                    style={[styles.watchButton, { backgroundColor: colors.cms }, Shadow.glow(colors.cms)]}
                                    onPress={() => handleWatchVideo(content.watchUrl!)}
                                    activeOpacity={0.85}
                                  >
                                    <Ionicons name="play" size={14} color="#fff" style={styles.actionIcon} />
                                    <Text style={styles.actionButtonText}>Watch Video</Text>
                                  </TouchableOpacity>
                                ) : content.downloadUrl ? (
                                  (() => {
                                    const itemKey = content.contentId || `${weekIndex}-${contentIndex}`;
                                    const previewing = busyItem === `${itemKey}:preview`;
                                    const downloading = busyItem === `${itemKey}:download`;
                                    const anyBusy = busyItem !== null;
                                    return (
                                      <View style={styles.actionButtons}>
                                        <TouchableOpacity
                                          style={[styles.previewButton, { borderColor: colors.cms }, anyBusy && styles.buttonDisabled]}
                                          onPress={() => handlePreview(itemKey, content.downloadUrl!, content.title)}
                                          disabled={anyBusy}
                                          activeOpacity={0.75}
                                        >
                                          {previewing ? (
                                            <ActivityIndicator size="small" color={colors.cms} style={styles.actionIcon} />
                                          ) : (
                                            <Ionicons name="eye-outline" size={14} color={colors.cms} style={styles.actionIcon} />
                                          )}
                                          <Text style={[styles.previewButtonText, { color: colors.cms }]}>Preview</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                          style={[styles.downloadButton, { backgroundColor: colors.cms }, Shadow.glow(colors.cms), anyBusy && styles.buttonDisabled]}
                                          onPress={() => handleSave(itemKey, content.downloadUrl!, content.title)}
                                          disabled={anyBusy}
                                          activeOpacity={0.85}
                                        >
                                          {downloading ? (
                                            <ActivityIndicator size="small" color="#fff" style={styles.actionIcon} />
                                          ) : (
                                            <Ionicons name="download-outline" size={14} color="#fff" style={styles.actionIcon} />
                                          )}
                                          <Text style={styles.actionButtonText}>Download</Text>
                                        </TouchableOpacity>
                                      </View>
                                    );
                                  })()
                                ) : null}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {!hasAnnouncement && !hasDescription && !hasContent && (
                        <View style={styles.emptyWeek}>
                          <Ionicons name="file-tray-outline" size={22} color={colors.textTertiary} />
                          <Text style={[styles.emptyContent, { color: colors.textSecondary }]}>
                            No content available for this week.
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {courseData && !courseData.announcementsHtml && courseData.weeks.length === 0 && (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconChip, { backgroundColor: withAlpha(colors.cms, 0.12) }]}>
              <Ionicons name="folder-open-outline" size={28} color={colors.cms} />
            </View>
            <Text style={[Type.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              No content available for this course yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: Spacing.sm, fontSize: 14, fontWeight: '500' },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs, marginHorizontal: Spacing.xl },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: Radius.pill },
  metaPillText: { fontSize: 12, fontWeight: '700' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.xl, marginTop: Spacing.md },
  section: { padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sectionIconChip: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  chevronChip: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  announcementContent: { marginTop: Spacing.md },
  announcementText: { fontSize: 14, lineHeight: 21, marginBottom: Spacing.sm },
  boldText: { fontWeight: 'bold' },
  paragraphBreak: { marginBottom: 12, height: 0 },
  linkContainer: { marginBottom: Spacing.sm },
  linkText: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  announcementTable: { marginVertical: Spacing.sm },
  weeksContainer: { marginBottom: Spacing.lg },
  courseContentTitle: { marginBottom: Spacing.sm, marginLeft: 2 },
  weekCard: { borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing.md, padding: Spacing.lg },
  weekContentCount: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  weekContent: { marginTop: Spacing.lg, gap: Spacing.md },
  weekAnnouncement: { gap: 2 },
  weekDescription: { gap: 2 },
  weekAnnouncementLabel: { fontSize: 12, fontWeight: '700' },
  weekAnnouncementText: { fontSize: 14, lineHeight: 20 },
  contentsContainer: { gap: Spacing.sm },
  contentItem: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1 },
  contentItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  seenIcon: { marginLeft: Spacing.sm },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill, marginBottom: Spacing.xs },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  contentDescription: { fontSize: 12, marginBottom: Spacing.sm, lineHeight: 17 },
  buttonContainer: { marginTop: Spacing.xs },
  actionButtons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  downloadButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  previewButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, alignSelf: 'flex-start', borderWidth: 1.5 },
  previewButtonText: { fontSize: 12, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  watchButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  actionIcon: { marginRight: 5 },
  actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyWeek: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  emptyContent: { fontSize: 14, textAlign: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: Spacing.huge, gap: Spacing.md },
  emptyIconChip: { width: 64, height: 64, borderRadius: Radius.xxl, alignItems: 'center', justifyContent: 'center' },
});
