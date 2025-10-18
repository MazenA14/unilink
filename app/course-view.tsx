import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getCmsCourseView } from '@/utils/handlers/cmsHandler';
import type { CMSCourseView } from '@/utils/parsers/cmsCourseViewParser';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CMSCourseViewScreen() {
  const { id, sid } = useLocalSearchParams<{ id: string; sid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courseData, setCourseData] = useState<CMSCourseView | null>(null);
  const [announcementsExpanded, setAnnouncementsExpanded] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

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

  const handleDownload = useCallback(async (url: string) => {
    try {
      const fullUrl = url.startsWith('http') ? url : `https://cms.guc.edu.eg${url}`;
      console.log('Downloading file:', fullUrl);
      await Linking.openURL(fullUrl);
    } catch (e: any) {
      setError(e?.message || 'Failed to open download link');
    }
  }, []);

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

  const parseAnnouncementText = useCallback((html: string) => {
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
  }, []);

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

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }] }>
        <ActivityIndicator />
        <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>Loading course…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={[styles.header, { paddingTop: Math.max(60, insets.top + 20) }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {(() => {
              const courseName = courseData?.header.courseName || 'Course';
              const courseCodeMatch = courseName.match(/\(([^)]+)\)/);
              const courseCode = courseCodeMatch ? courseCodeMatch[1].replace(/\|/g, '') : '';
              const cleanCourseName = courseName.replace(/\s*\([^)]+\)\s*/g, '').trim();
              return courseCode ? `${cleanCourseName} - ${courseCode}` : cleanCourseName;
            })()}
          </Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.tint }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {!!courseData?.header.seasonName && (
          <Text style={[styles.subtitle, { color: colors.secondaryFont }]}>
            {courseData.header.seasonName}
          </Text>
        )}
        {courseData?.header.totalWeeks && (
          <Text style={[styles.meta, { color: colors.secondaryFont }]}>
            {courseData.header.totalWeeks} weeks • {courseData.header.contentCount || 0} content items
          </Text>
        )}
      </View>

      {!!error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Announcements Section */}
        {courseData?.announcementsHtml && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <TouchableOpacity 
              style={styles.announcementHeader}
              onPress={() => setAnnouncementsExpanded(!announcementsExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.announcementHeaderContent}>
                <Ionicons 
                  name="megaphone-outline" 
                  size={20} 
                  color={colors.tint} 
                  style={styles.announcementIcon}
                />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Announcements</Text>
              </View>
              <Ionicons 
                name={announcementsExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.secondaryFont}
              />
            </TouchableOpacity>
            
            {announcementsExpanded && (
              <View style={styles.announcementContent}>
                {parseAnnouncementText(courseData.announcementsHtml).map((part, index) => {
                  if (part.type === 'link') {
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleLinkPress(part.url!)}
                        style={styles.linkContainer}
                      >
                        <Text style={[styles.linkText, { color: colors.tint }]}>{part.content}</Text>
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
                          { color: colors.text },
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
            <Text style={[styles.sectionTitle, styles.courseContentTitle, { color: colors.text }]}>Course Content</Text>
            {courseData.weeks.map((week, weekIndex) => {
              const isExpanded = expandedWeeks.has(weekIndex);
              const hasContent = week.contents && week.contents.length > 0;
              const hasAnnouncement = week.announcement && week.announcement.trim() !== '';
              const hasDescription = week.description && week.description.trim() !== '';
              
              return (
                <View key={weekIndex} style={[styles.weekCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <TouchableOpacity 
                    style={styles.weekHeader}
                    onPress={() => toggleWeek(weekIndex)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.weekHeaderContent}>
                      <Ionicons 
                        name="calendar-outline" 
                        size={18} 
                        color={colors.tint} 
                        style={styles.weekIcon}
                      />
                      <Text style={[styles.weekTitle, { color: colors.text }]}>{week.weekLabel}</Text>
                      {hasContent && (
                        <Text style={[styles.weekContentCount, { color: colors.secondaryFont }]}>
                          {week.contents!.length} item{week.contents!.length !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                    <Ionicons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={18} 
                      color={colors.secondaryFont}
                    />
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <View style={styles.weekContent}>
                      {/* Debug info - remove this later */}
                      {/* <Text style={[styles.debugText, { color: colors.secondaryFont }]}>
                        Debug: hasAnnouncement={String(hasAnnouncement)}, hasDescription={String(hasDescription)}, hasContent={String(hasContent)}
                      </Text> */}
                      
                      {hasAnnouncement && (
                        <View style={styles.weekAnnouncement}>
                          <Text style={[styles.weekAnnouncementLabel, { color: colors.text }]}>Announcement:</Text>
                          <Text style={[styles.weekAnnouncementText, { color: colors.secondaryFont }]}>{week.announcement}</Text>
                        </View>
                      )}
                      
                      {hasDescription && (
                        <View style={styles.weekDescription}>
                          <Text style={[styles.weekDescriptionLabel, { color: colors.text }]}>Description:</Text>
                          <Text style={[styles.weekDescriptionText, { color: colors.secondaryFont }]}>{week.description}</Text>
                        </View>
                      )}

                      {hasContent && (
                        <View style={styles.contentsContainer}>
                          <Text style={[styles.contentsTitle, { color: colors.text }]}>Content:</Text>
                          {week.contents!.map((content, contentIndex) => (
                            <View key={contentIndex} style={[styles.contentItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                              <View style={styles.contentItemHeader}>
                                <Text style={[styles.contentTitle, { color: colors.text }]}>{content.title}</Text>
                                {content.seen && (
                                  <Ionicons name="eye" size={16} color={colors.secondaryFont} style={styles.seenIcon} />
                                )}
                              </View>
                              {content.type && (
                                <Text style={[styles.contentType, { color: colors.secondaryFont }]}>({content.type})</Text>
                              )}
                              {content.description && (
                                <Text style={[styles.contentDescription, { color: colors.secondaryFont }]}>{content.description}</Text>
                              )}
                              <View style={styles.buttonContainer}>
                                {/* Show appropriate button based on content type */}
                                {content.type === 'VoD' && content.watchUrl ? (
                                  <TouchableOpacity 
                                    style={[styles.watchButton, { backgroundColor: colors.tint }]}
                                    onPress={() => handleWatchVideo(content.watchUrl!)}
                                  >
                                    <Ionicons name="play-outline" size={16} color="#fff" style={styles.downloadIcon} />
                                    <Text style={styles.downloadButtonText}>Watch Video</Text>
                                  </TouchableOpacity>
                                ) : content.downloadUrl ? (
                                  <TouchableOpacity 
                                    style={[styles.downloadButton, { backgroundColor: colors.tint }]}
                                    onPress={() => handleDownload(content.downloadUrl!)}
                                  >
                                    <Ionicons name="download-outline" size={16} color="#fff" style={styles.downloadIcon} />
                                    <Text style={styles.downloadButtonText}>Download</Text>
                                  </TouchableOpacity>
                                ) : null}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      {/* Fallback content if nothing else shows */}
                      {!hasAnnouncement && !hasDescription && !hasContent && (
                        <Text style={[styles.emptyContent, { color: colors.secondaryFont }]}>
                          No content available for this week.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* <TouchableOpacity style={[styles.button, { backgroundColor: colors.tint }]} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8 },
  header: { padding: 20, paddingBottom: 10 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700', flex: 1, marginRight: 12 },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  subtitle: { marginTop: 6, fontSize: 14 },
  meta: { marginTop: 4, fontSize: 12 },
  error: { marginHorizontal: 20, marginBottom: 8 },
  content: { flex: 1, paddingHorizontal: 20 },
  section: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  courseContentTitle: { marginBottom: 8 },
  announcementHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 },
  announcementHeaderContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  announcementIcon: { marginRight: 8 },
  announcementContent: { marginTop: 12 },
  announcementText: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  boldText: { fontWeight: 'bold' },
  paragraphBreak: { marginBottom: 12, height: 0 },
  linkContainer: { marginBottom: 8 },
  linkText: { fontSize: 14, textDecorationLine: 'underline' },
  announcementTable: { marginVertical: 8 },
  weeksContainer: { marginBottom: 16 },
  weekCard: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 12 },
  weekHeaderContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  weekIcon: { marginRight: 8 },
  weekTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  weekContentCount: { fontSize: 12, marginLeft: 8 },
  weekContent: { paddingHorizontal: 16, paddingBottom: 16 },
  weekAnnouncement: { marginBottom: 8 },
  weekAnnouncementLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  weekAnnouncementText: { fontSize: 14 },
  weekDescription: { marginBottom: 8 },
  weekDescriptionLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  weekDescriptionText: { fontSize: 14 },
  contentsContainer: { marginTop: 8 },
  contentsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  contentItem: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  contentItemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  contentTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  seenIcon: { marginLeft: 8 },
  contentType: { fontSize: 12, marginBottom: 4 },
  contentDescription: { fontSize: 12, marginBottom: 8 },
  buttonContainer: { marginTop: 8 },
  downloadButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start' },
  watchButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start' },
  downloadIcon: { marginRight: 4 },
  downloadButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  debugText: { fontSize: 10, marginBottom: 8, fontStyle: 'italic' },
  emptyContent: { fontSize: 14, textAlign: 'center', marginTop: 16 },
  button: { alignSelf: 'flex-start', marginTop: 16, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});


