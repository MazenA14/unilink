import { useCustomAlert } from '@/components/CustomAlert';
import { AppBar } from '@/components/navigation/AppBar';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing, Type, withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GUCAPIProxy } from '@/utils/gucApiProxy';
import { ExamSeat, parseExamDate } from '@/utils/parsers/examSeatsParser';
import { MaterialIcons } from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type ThemeColors = (typeof Colors)['light'];

const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAY_MS = 24 * 60 * 60 * 1000;

// Parser returns 2099-12-31 when a date can't be read
const isUnknownDate = (d: Date) => d.getFullYear() === 2099;

function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / DAY_MS);
}

function countdownLabel(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0) return 'Done';
  if (days < 14) return `In ${days} days`;
  const weeks = Math.round(days / 7);
  return `In ${weeks} weeks`;
}

function examTypeColor(examType: string, colors: ThemeColors): string {
  const type = examType.toLowerCase();
  if (type.includes('makeup')) return colors.warning;
  if (type.includes('final')) return colors.tint;
  if (type.includes('midterm')) return colors.secondary;
  if (type.includes('quiz')) return colors.cms;
  return colors.textSecondary;
}

type ExamEntry = { exam: ExamSeat; date: Date; days: number };

export default function ExamSeatsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [examSeats, setExamSeats] = useState<ExamSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const { showAlert, AlertComponent } = useCustomAlert();

  useEffect(() => {
    loadExamSeats();
  }, []);


  const loadExamSeats = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setLoadError(false);

      // Fetch exam seats data with caching (bypass cache on refresh)
      const parsedSeats = await GUCAPIProxy.getExamSeatsData(isRefresh);

      // Sort exam seats by date (earliest first)
      const sortedSeats = parsedSeats.sort((a, b) => {
        const dateA = parseExamDate(a.date);
        const dateB = parseExamDate(b.date);
        return dateA.getTime() - dateB.getTime();
      });

      setExamSeats(sortedSeats);
    } catch (error) {
      console.error('Failed to load exam seats:', error);
      if (isRefresh && examSeats.length > 0) {
        // Keep showing the data we have; just tell them the refresh failed
        showAlert({
          title: 'Error',
          message: 'Failed to refresh exam seats. Please try again.',
          type: 'error',
        });
      } else {
        setLoadError(true);
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    loadExamSeats(true);
  };

  const { next, upcoming, completed } = useMemo(() => {
    const entries: ExamEntry[] = examSeats.map(exam => {
      const date = parseExamDate(exam.date);
      return { exam, date, days: isUnknownDate(date) ? Infinity : daysUntil(date) };
    });
    const future = entries.filter(e => e.days >= 0);
    return {
      next: future[0] ?? null,
      upcoming: future.slice(1),
      // Most recent first
      completed: entries.filter(e => e.days < 0).reverse(),
    };
  }, [examSeats]);

  const renderBody = () => {
    if (loading) return <ExamSkeleton colors={colors} />;

    if (loadError) {
      return (
        <View style={styles.centerState}>
          <View style={[styles.stateIcon, { backgroundColor: withAlpha(colors.error, 0.12) }]}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.error} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>Couldn&apos;t load exam seats</Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={() => loadExamSeats()}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color={colors.onPrimary} />
            <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (examSeats.length === 0) {
      return (
        <View style={styles.centerState}>
          <View style={[styles.stateIcon, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="event-seat" size={28} color={colors.textTertiary} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>No exam seats yet</Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            Seats usually appear a few days before exams start. Pull down to refresh.
          </Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.summaryRow}>
          <SummaryPill colors={colors} value={upcoming.length + (next ? 1 : 0)} label="Upcoming" accent={colors.tint} />
          <SummaryPill colors={colors} value={completed.length} label="Completed" accent={colors.success} />
        </View>

        {next && <NextExamCard entry={next} colors={colors} />}

        {upcoming.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Later</Text>
            {upcoming.map((entry, index) => (
              <ExamCard key={`u-${index}`} entry={entry} colors={colors} />
            ))}
          </>
        )}

        {completed.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.completedToggle}
              onPress={() => setShowCompleted(v => !v)}
              activeOpacity={0.6}
            >
              <Text style={[styles.sectionLabel, styles.sectionLabelInline, { color: colors.textTertiary }]}>
                Completed · {completed.length}
              </Text>
              <Ionicons
                name={showCompleted ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
            {showCompleted && completed.map((entry, index) => (
              <ExamCard key={`c-${index}`} entry={entry} colors={colors} done />
            ))}
          </>
        )}
      </>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppBar title="Exam Seats" />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          {renderBody()}
        </ScrollView>
      </View>

      {/* Custom Alert Component */}
      <AlertComponent />
    </>
  );
}

function SummaryPill({ colors, value, label, accent }: { colors: ThemeColors; value: number; label: string; accent: string }) {
  return (
    <View style={[styles.summaryPill, { backgroundColor: colors.surface }]}>
      <View style={[styles.summaryDot, { backgroundColor: accent }]} />
      <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function TypeChip({ colors, examType, onAccent }: { colors: ThemeColors; examType: string; onAccent?: boolean }) {
  if (!examType) return null;
  const accent = examTypeColor(examType, colors);
  return (
    <View style={[styles.typeChip, { backgroundColor: onAccent ? withAlpha(colors.onPrimary, 0.18) : withAlpha(accent, 0.14) }]}>
      <Text style={[styles.typeChipText, { color: onAccent ? colors.onPrimary : accent }]} numberOfLines={1}>
        {examType}
      </Text>
    </View>
  );
}

function NextExamCard({ entry, colors }: { entry: ExamEntry; colors: ThemeColors }) {
  const { exam, date, days } = entry;
  const known = Number.isFinite(days);
  const urgent = days <= 1;
  const fg = colors.onPrimary;

  return (
    <View style={[styles.nextCard, { backgroundColor: colors.tint }, Shadow.glow(colors.tint)]}>
      <View style={styles.nextTop}>
        <Text style={[styles.nextEyebrow, { color: withAlpha(fg, 0.85) }]}>UP NEXT</Text>
        {known && (
          <View style={[styles.countdown, { backgroundColor: urgent ? fg : withAlpha(fg, 0.16) }]}>
            <Ionicons name="hourglass-outline" size={12} color={urgent ? colors.tint : fg} />
            <Text style={[styles.countdownText, { color: urgent ? colors.tint : fg }]}>{countdownLabel(days)}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.nextCourse, { color: fg }]} numberOfLines={2}>
        {exam.courseName}
      </Text>

      <View style={styles.nextMeta}>
        <TypeChip colors={colors} examType={exam.examType} onAccent />
        <Text style={[styles.nextMetaText, { color: fg }]}>
          {exam.examDay}{known ? `, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}` : ''}
        </Text>
        <Text style={[styles.nextMetaText, { color: fg }]}>·</Text>
        <Text style={[styles.nextMetaText, { color: fg }]}>
          {exam.startTime} – {exam.endTime}
        </Text>
      </View>

      <View style={[styles.nextStub, { backgroundColor: withAlpha(fg, 0.12) }]}>
        <View style={styles.stubCol}>
          <Text style={[styles.stubLabel, { color: withAlpha(fg, 0.75) }]}>HALL</Text>
          <Text style={[styles.nextStubValue, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>
            {exam.hall || '—'}
          </Text>
        </View>
        <View style={[styles.stubDivider, { borderColor: withAlpha(fg, 0.35) }]} />
        <View style={styles.stubCol}>
          <Text style={[styles.stubLabel, { color: withAlpha(fg, 0.75) }]}>SEAT</Text>
          <Text style={[styles.nextStubValue, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>
            {exam.seat || '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ExamCard({ entry, colors, done }: { entry: ExamEntry; colors: ThemeColors; done?: boolean }) {
  const { exam, date, days } = entry;
  const known = Number.isFinite(days);
  const accent = done ? colors.success : examTypeColor(exam.examType, colors);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
        Shadow.xs(colors),
        done && styles.cardDone,
      ]}
    >
      <View style={styles.cardMain}>
        <View style={[styles.dateBlock, { backgroundColor: withAlpha(accent, 0.12) }]}>
          {known ? (
            <>
              <Text style={[styles.dateMonth, { color: accent }]}>{MONTHS_SHORT[date.getMonth()]}</Text>
              <Text style={[styles.dateDay, { color: accent }]}>{date.getDate()}</Text>
              <Text style={[styles.dateWeekday, { color: accent }]}>{exam.examDay.slice(0, 3)}</Text>
            </>
          ) : (
            <Ionicons name="calendar-outline" size={22} color={accent} />
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text style={[styles.cardCourse, { color: colors.textPrimary }]} numberOfLines={2}>
            {exam.courseName}
          </Text>
          <View style={styles.cardMetaRow}>
            <TypeChip colors={colors} examType={exam.examType} />
            {known && (
              <Text style={[styles.cardCountdown, { color: done ? colors.success : colors.textSecondary }]}>
                {done ? '✓ Done' : countdownLabel(days)}
              </Text>
            )}
          </View>
          <View style={styles.cardTimeRow}>
            <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
            <Text style={[styles.cardTime, { color: colors.textSecondary }]}>
              {exam.startTime} – {exam.endTime}
            </Text>
          </View>
        </View>
      </View>

      {/* Ticket stub */}
      <View style={styles.perforation}>
        <View style={[styles.notch, styles.notchLeft, { backgroundColor: colors.background, borderColor: colors.border }]} />
        <View style={[styles.dashLine, { borderColor: colors.borderStrong }]} />
        <View style={[styles.notch, styles.notchRight, { backgroundColor: colors.background, borderColor: colors.border }]} />
      </View>
      <View style={styles.stub}>
        <View style={styles.stubItem}>
          <Ionicons name="location-outline" size={15} color={colors.textTertiary} />
          <Text style={[styles.stubLabelSmall, { color: colors.textTertiary }]}>Hall</Text>
          <Text style={[styles.stubValue, { color: colors.textPrimary }]} numberOfLines={1}>{exam.hall || '—'}</Text>
        </View>
        <View style={[styles.stubItem, styles.stubItemRight]}>
          <MaterialIcons name="event-seat" size={15} color={colors.textTertiary} />
          <Text style={[styles.stubLabelSmall, { color: colors.textTertiary }]}>Seat</Text>
          <Text style={[styles.stubValue, { color: colors.textPrimary }]} numberOfLines={1}>{exam.seat || '—'}</Text>
        </View>
      </View>
    </View>
  );
}

function ExamSkeleton({ colors }: { colors: ThemeColors }) {
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
    <Animated.View style={{ opacity: pulse }}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryPill, { backgroundColor: colors.surface, height: 40 }]} />
        <View style={[styles.summaryPill, { backgroundColor: colors.surface, height: 40 }]} />
      </View>
      <View style={[styles.nextCard, { backgroundColor: colors.surface, height: 210 }]} />
      {[0, 1].map(i => (
        <View key={i} style={[styles.card, styles.cardMain, { backgroundColor: colors.surface, borderColor: 'transparent', padding: 14 }]}>
          <View style={[styles.dateBlock, { backgroundColor: colors.surfaceSunken }]} />
          <View style={{ flex: 1, gap: Spacing.sm }}>
            {line('80%', 14)}
            {line('40%')}
            {line('55%')}
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const NOTCH = 14;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
    marginBottom: Spacing.lg,
  },
  summaryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryValue: {
    ...Type.h3,
  },
  summaryLabel: {
    ...Type.subtext,
  },
  // Up next hero
  nextCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  nextTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  nextEyebrow: {
    ...Type.overline,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  countdownText: {
    ...Type.caption,
    fontWeight: '800',
  },
  nextCourse: {
    ...Type.h2,
    lineHeight: 26,
  },
  nextMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm - 2,
    marginTop: Spacing.sm + 2,
  },
  nextMetaText: {
    ...Type.subtext,
    fontWeight: '600',
  },
  nextStub: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  stubCol: {
    flex: 1,
    alignItems: 'center',
  },
  stubLabel: {
    ...Type.overline,
    fontSize: 10,
  },
  nextStubValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  stubDivider: {
    width: 0,
    alignSelf: 'stretch',
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    marginHorizontal: Spacing.md,
  },
  // Sections
  sectionLabel: {
    ...Type.overline,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  sectionLabelInline: {
    marginTop: 0,
    marginBottom: 0,
  },
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  // Exam ticket card
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  cardDone: {
    opacity: 0.7,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md + 2,
    padding: 14,
    paddingBottom: Spacing.md,
  },
  dateBlock: {
    width: 56,
    height: 64,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  dateWeekday: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.8,
  },
  cardInfo: {
    flex: 1,
    gap: 6,
  },
  cardCourse: {
    ...Type.body,
    fontWeight: '700',
    lineHeight: 20,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    maxWidth: 140,
  },
  typeChipText: {
    ...Type.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  cardCountdown: {
    ...Type.caption,
  },
  cardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardTime: {
    ...Type.subtext,
  },
  perforation: {
    flexDirection: 'row',
    alignItems: 'center',
    height: NOTCH,
  },
  notch: {
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    borderWidth: 1,
  },
  notchLeft: {
    marginLeft: -NOTCH / 2 - 1,
  },
  notchRight: {
    marginRight: -NOTCH / 2 - 1,
  },
  dashLine: {
    flex: 1,
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginHorizontal: Spacing.xs,
  },
  stub: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  stubItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stubItemRight: {
    justifyContent: 'flex-end',
  },
  stubLabelSmall: {
    ...Type.subtext,
  },
  stubValue: {
    ...Type.bodyStrong,
    flexShrink: 1,
  },
  // Empty / error
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
