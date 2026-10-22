import { AppBar } from '@/components/navigation/AppBar';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing, Type, withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getCmsCourseView, markCmsContentSeen, previewCmsContent, saveCmsContent } from '@/utils/handlers/cmsHandler';
import type { CMSCourseView } from '@/utils/parsers/cmsCourseViewParser';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Platform, ScrollView, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
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

  // Opening an item on CMS marks it seen there; mirror that locally right away.
  const markSeen = useCallback((contentId?: string) => {
    if (!contentId || !id || !sid) return;
    setCourseData(prev => {
      if (!prev) return prev;
      let changed = false;
      const weeks = prev.weeks.map(week => ({
        ...week,
        contents: week.contents.map(item => {
          if (item.contentId !== contentId || !item.unseen) return item;
          changed = true;
          return { ...item, unseen: false, seen: true };
        }),
      }));
      return changed ? { ...prev, weeks } : prev;
    });
    markCmsContentSeen(String(id), String(sid), contentId).catch(() => {});
  }, [id, sid]);

  const handlePreview = useCallback(async (key: string, url: string, title?: string) => {
    if (busyItem) return;
    try {
      setError(null);
      setBusyItem(`${key}:preview`);
      await previewCmsContent(url, title);
      markSeen(key);
    } catch (e: any) {
      setError(e?.message || 'Failed to preview file');
    } finally {
      setBusyItem(null);
    }
  }, [busyItem, markSeen]);

  const handleSave = useCallback(async (key: string, url: string, title?: string) => {
    if (busyItem) return;
    try {
      setError(null);
      setBusyItem(`${key}:download`);
      const saved = await saveCmsContent(url, title);
      markSeen(key);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Saved "${saved.fileName}" to Downloads`, ToastAndroid.LONG);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to download file');
    } finally {
      setBusyItem(null);
    }
  }, [busyItem, markSeen]);

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

  const totalUnseen = useMemo(
    () => courseData?.weeks.reduce((sum, w) => sum + w.contents.filter(c => c.unseen).length, 0) ?? 0,
    [courseData]
  );

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
        <CourseSkeleton colors={colors} />
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

      {!!error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerSoft }]}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats */}
        {(!!courseData?.header.totalWeeks || !!courseData?.header.contentCount || totalUnseen > 0) && (
          <View style={styles.statsRow}>
            {!!courseData?.header.totalWeeks && (
              <StatTile colors={colors} icon="calendar-outline" value={courseData.header.totalWeeks} label="Weeks" />
            )}
            {!!courseData?.header.contentCount && (
              <StatTile colors={colors} icon="documents-outline" value={courseData.header.contentCount} label="Items" />
            )}
            {totalUnseen > 0 && (
              <StatTile colors={colors} icon="sparkles" value={totalUnseen} label="New" highlight />
            )}
          </View>
        )}

        {/* Announcements Section */}
        {courseData?.announcementsHtml && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surfaceElevated, borderColor: announcementsExpanded ? withAlpha(colors.tint, 0.35) : colors.border },
              announcementsExpanded ? Shadow.card(colors) : Shadow.xs(colors),
            ]}
          >
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => setAnnouncementsExpanded(!announcementsExpanded)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconTile, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
                <Ionicons name="megaphone" size={18} color={colors.tint} />
              </View>
              <View style={styles.cardHeaderBody}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Announcements</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textTertiary }]}>
                  {announcementsExpanded ? 'Tap to collapse' : 'Tap to read'}
                </Text>
              </View>
              <Chevron colors={colors} open={announcementsExpanded} />
            </TouchableOpacity>

            {announcementsExpanded && (
              <View style={[styles.announcementContent, { backgroundColor: colors.surface }]}>
                {announcementParts.map((part, index) => {
                  if (part.type === 'link') {
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleLinkPress(part.url!)}
                        style={styles.linkContainer}
                      >
                        <Ionicons name="link" size={14} color={colors.link} />
                        <Text style={[styles.linkText, { color: colors.link }]}>{part.content}</Text>
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
          <View>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Course Content</Text>
            {courseData.weeks.map((week, weekIndex) => {
              const isExpanded = expandedWeeks.has(weekIndex);
              const hasContent = week.contents && week.contents.length > 0;
              const hasAnnouncement = week.announcement && week.announcement.trim() !== '';
              const hasDescription = week.description && week.description.trim() !== '';
              const weekUnseen = week.contents.filter(c => c.unseen).length;

              return (
                <View
                  key={weekIndex}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: weekUnseen > 0 ? withAlpha(colors.tint, 0.35) : colors.border,
                    },
                    isExpanded || weekUnseen > 0 ? Shadow.card(colors) : Shadow.xs(colors),
                  ]}
                >
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => toggleWeek(weekIndex)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconTile,
                        { backgroundColor: weekUnseen > 0 ? withAlpha(colors.tint, 0.12) : colors.surface },
                      ]}
                    >
                      <Ionicons name="calendar" size={17} color={weekUnseen > 0 ? colors.tint : colors.textSecondary} />
                    </View>
                    <View style={styles.cardHeaderBody}>
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{week.weekLabel}</Text>
                      <Text style={[styles.cardSubtitle, { color: colors.textTertiary }]}>
                        {hasContent
                          ? `${week.contents!.length} item${week.contents!.length !== 1 ? 's' : ''}`
                          : 'No files'}
                      </Text>
                    </View>
                    {weekUnseen > 0 && (
                      <View style={[styles.newPill, { backgroundColor: colors.tint }]}>
                        <Text style={[styles.newPillText, { color: colors.onPrimary }]}>{weekUnseen} new</Text>
                      </View>
                    )}
                    <Chevron colors={colors} open={isExpanded} />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.weekContent}>
                      {hasAnnouncement && (
                        <View style={[styles.callout, { backgroundColor: withAlpha(colors.warning, 0.1) }]}>
                          <Ionicons name="megaphone-outline" size={15} color={colors.warning} style={styles.calloutIcon} />
                          <View style={styles.calloutBody}>
                            <Text style={[styles.calloutLabel, { color: colors.warning }]}>Announcement</Text>
                            <Text style={[styles.calloutText, { color: colors.textPrimary }]}>{week.announcement}</Text>
                          </View>
                        </View>
                      )}

                      {hasDescription && (
                        <View style={[styles.callout, { backgroundColor: colors.surface }]}>
                          <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} style={styles.calloutIcon} />
                          <View style={styles.calloutBody}>
                            <Text style={[styles.calloutLabel, { color: colors.textSecondary }]}>Description</Text>
                            <Text style={[styles.calloutText, { color: colors.textPrimary }]}>{week.description}</Text>
                          </View>
                        </View>
                      )}

                      {hasContent && week.contents!.map((content, contentIndex) => (
                        <View
                          key={contentIndex}
                          style={[
                            styles.contentItem,
                            {
                              backgroundColor: content.unseen ? withAlpha(colors.tint, 0.05) : colors.surface,
                              borderColor: content.unseen ? withAlpha(colors.tint, 0.3) : 'transparent',
                            },
                          ]}
                        >
                          <View style={styles.contentTop}>
                            <View style={[styles.typeIcon, { backgroundColor: colors.surfaceElevated }]}>
                              <Ionicons name={contentTypeIcon(content.type)} size={18} color={content.unseen ? colors.tint : colors.textSecondary} />
                            </View>
                            <View style={styles.contentBody}>
                              <View style={styles.contentTitleRow}>
                                <Text style={[styles.contentTitle, { color: colors.textPrimary }]}>{content.title}</Text>
                                {content.unseen && (
                                  <View style={[styles.newDotBadge, { backgroundColor: withAlpha(colors.tint, 0.12) }]} accessibilityLabel="Not opened yet">
                                    <View style={[styles.unseenDot, { backgroundColor: colors.tint }]} />
                                    <Text style={[styles.newDotBadgeText, { color: colors.tint }]}>New</Text>
                                  </View>
                                )}
                              </View>
                              {content.type && (
                                <Text style={[styles.contentType, { color: colors.textTertiary }]}>{content.type}</Text>
                              )}
                            </View>
                          </View>
                          {content.description && (
                            <Text style={[styles.contentDescription, { color: colors.textSecondary }]}>{content.description}</Text>
                          )}
                          {content.type === 'VoD' && content.watchUrl ? (
                            <View style={styles.actionButtons}>
                              <TouchableOpacity
                                style={[styles.actionButton, styles.actionPrimary, { backgroundColor: colors.tint }]}
                                onPress={() => handleWatchVideo(content.watchUrl!)}
                                activeOpacity={0.85}
                              >
                                <Ionicons name="play" size={15} color={colors.onPrimary} />
                                <Text style={[styles.actionText, { color: colors.onPrimary }]}>Watch on CMS</Text>
                              </TouchableOpacity>
                            </View>
                          ) : content.downloadUrl ? (
                            (() => {
                              const itemKey = content.contentId || `${weekIndex}-${contentIndex}`;
                              const previewing = busyItem === `${itemKey}:preview`;
                              const downloading = busyItem === `${itemKey}:download`;
                              const anyBusy = busyItem !== null;
                              return (
                                <View style={styles.actionButtons}>
                                  <TouchableOpacity
                                    style={[
                                      styles.actionButton,
                                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 },
                                      anyBusy && !previewing && styles.buttonDisabled,
                                    ]}
                                    onPress={() => handlePreview(itemKey, content.downloadUrl!, content.title)}
                                    disabled={anyBusy}
                                    activeOpacity={0.75}
                                  >
                                    {previewing ? (
                                      <ActivityIndicator size="small" color={colors.textPrimary} />
                                    ) : (
                                      <Ionicons name="eye-outline" size={15} color={colors.textPrimary} />
                                    )}
                                    <Text style={[styles.actionText, { color: colors.textPrimary }]}>Preview</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[
                                      styles.actionButton,
                                      styles.actionPrimary,
                                      { backgroundColor: colors.tint },
                                      anyBusy && !downloading && styles.buttonDisabled,
                                    ]}
                                    onPress={() => handleSave(itemKey, content.downloadUrl!, content.title)}
                                    disabled={anyBusy}
                                    activeOpacity={0.85}
                                  >
                                    {downloading ? (
                                      <ActivityIndicator size="small" color={colors.onPrimary} />
                                    ) : (
                                      <Ionicons name="download-outline" size={15} color={colors.onPrimary} />
                                    )}
                                    <Text style={[styles.actionText, { color: colors.onPrimary }]}>Download</Text>
                                  </TouchableOpacity>
                                </View>
                              );
                            })()
                          ) : null}
                        </View>
                      ))}

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
            <View style={[styles.emptyIconChip, { backgroundColor: colors.surface }]}>
              <Ionicons name="folder-open-outline" size={28} color={colors.textTertiary} />
            </View>
            <Text style={[Type.h3, { color: colors.textPrimary }]}>Nothing here yet</Text>
            <Text style={[Type.subtext, { color: colors.textSecondary, textAlign: 'center' }]}>
              No content available for this course yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

type ThemeColors = (typeof Colors)['light'];

function contentTypeIcon(type?: string): keyof typeof Ionicons.glyphMap {
  const t = (type || '').toLowerCase();
  if (t.includes('vod') || t.includes('video')) return 'play-circle';
  if (t.includes('lecture')) return 'easel';
  if (t.includes('assignment')) return 'create';
  if (t.includes('exam') || t.includes('quiz')) return 'school';
  if (t.includes('project')) return 'construct';
  if (t.includes('lab') || t.includes('tutorial') || t.includes('practice')) return 'flask';
  if (t.includes('sheet') || t.includes('solution')) return 'document-text';
  return 'document';
}

function Chevron({ colors, open }: { colors: ThemeColors; open: boolean }) {
  return (
    <View style={[styles.chevronChip, { backgroundColor: open ? colors.tint : colors.surface }]}>
      <Ionicons
        name="chevron-down"
        size={16}
        color={open ? colors.onPrimary : colors.textSecondary}
        style={open && styles.chevronOpen}
      />
    </View>
  );
}

function StatTile({
  colors,
  icon,
  value,
  label,
  highlight,
}: {
  colors: ThemeColors;
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.statTile, { backgroundColor: highlight ? withAlpha(colors.tint, 0.1) : colors.surface }]}>
      <Ionicons name={icon} size={15} color={highlight ? colors.tint : colors.textTertiary} />
      <Text style={[styles.statValue, { color: highlight ? colors.tint : colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: highlight ? colors.tint : colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function CourseSkeleton({ colors }: { colors: ThemeColors }) {
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
    <Animated.View style={[styles.contentContainer, { opacity: pulse }]}>
      <View style={styles.statsRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.statTile, { backgroundColor: colors.surface, height: 64 }]} />
        ))}
      </View>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={[styles.card, { backgroundColor: colors.surface, borderColor: 'transparent' }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconTile, { backgroundColor: colors.surfaceSunken }]} />
            <View style={{ flex: 1, gap: Spacing.sm }}>
              {line('60%', 14)}
              {line('25%')}
            </View>
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs },
  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statTile: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
    paddingVertical: Spacing.md,
    paddingHorizontal: 14,
    borderRadius: Radius.lg,
  },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginTop: 2 },
  statLabel: { ...Type.caption, fontWeight: '600' },
  // Cards (announcements + weeks)
  card: { borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.sm + 2, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardHeaderBody: { flex: 1, gap: 2 },
  cardTitle: { ...Type.body, fontWeight: '700' },
  cardSubtitle: { ...Type.caption, fontWeight: '500' },
  iconTile: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  chevronChip: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  newPill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.pill },
  newPillText: { fontSize: 11, fontWeight: '800' },
  sectionLabel: { ...Type.overline, marginTop: Spacing.md, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  // Announcements
  announcementContent: { marginTop: 14, padding: 14, borderRadius: Radius.md },
  announcementText: { fontSize: 14, lineHeight: 21, marginBottom: Spacing.sm },
  boldText: { fontWeight: 'bold' },
  paragraphBreak: { marginBottom: 12, height: 0 },
  linkContainer: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: Spacing.sm },
  linkText: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline', flexShrink: 1 },
  announcementTable: { marginVertical: Spacing.sm },
  // Week content
  weekContent: { marginTop: 14, gap: Spacing.sm },
  callout: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md },
  calloutIcon: { marginTop: 1 },
  calloutBody: { flex: 1, gap: 2 },
  calloutLabel: { ...Type.caption, fontWeight: '700' },
  calloutText: { fontSize: 14, lineHeight: 20 },
  contentItem: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, gap: Spacing.sm },
  contentTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  typeIcon: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  contentBody: { flex: 1, gap: 2 },
  contentTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  contentTitle: { ...Type.callout, flex: 1, lineHeight: 19 },
  contentType: { ...Type.caption, fontWeight: '500' },
  contentDescription: { fontSize: 13, lineHeight: 18 },
  unseenDot: { width: 6, height: 6, borderRadius: 3 },
  newDotBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },
  newDotBadgeText: { fontSize: 11, fontWeight: '800' },
  actionButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: 2 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: Radius.md,
  },
  actionPrimary: {},
  actionText: { fontSize: 13, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  emptyWeek: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  emptyContent: { fontSize: 14, textAlign: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: Spacing.huge, gap: Spacing.sm },
  emptyIconChip: { width: 64, height: 64, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
});
