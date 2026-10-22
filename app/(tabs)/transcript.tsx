import {
    EmptyState,
    LoadingIndicator,
    SemesterTable,
    YearSelector,
} from '@/components/transcript';
import { AppBar } from '@/components/navigation/AppBar';
import { formatYearToShort } from '@/components/transcript/formatYear';
import GradingInfoModal from '@/components/transcript/GradingInfoModal';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing, Type, withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranscript } from '@/hooks/useTranscript';
import { getCumulativeGPAColor } from '@/utils/gradingColors';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TranscriptScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showGradingInfo, setShowGradingInfo] = useState(false);

  const {
    studyYears,
    selectedYear,
    parsedTranscript,
    maintenanceMessage,
    evaluationRequiredMessage,
    loadingYears,
    loadingTranscript,
    refreshing,
    handleYearSelect,
    onRefresh,
  } = useTranscript();

  // Display-only summary figures for the year header
  const semesterCount = parsedTranscript?.semesters.length ?? 0;
  const courseCount = parsedTranscript?.semesters.reduce((sum, s) => sum + s.courses.length, 0) ?? 0;
  const totalHours = parsedTranscript?.semesters.reduce((sum, s) => {
    const hours = parseFloat(s.totalHours);
    return Number.isFinite(hours) ? sum + hours : sum;
  }, 0) ?? 0;
  const gpaColor = parsedTranscript?.cumulativeGPA
    ? getCumulativeGPAColor(parsedTranscript.cumulativeGPA, colors)
    : colors.textTertiary;

  const renderBanner = (
    message: string,
    icon: React.ComponentProps<typeof Ionicons>['name'],
    tone: string,
    softTone: string,
  ) => (
    <View style={[styles.banner, { backgroundColor: softTone, borderColor: withAlpha(tone, 0.4) }]}>
      <View style={[styles.bannerIcon, { backgroundColor: withAlpha(tone, 0.18) }]}>
        <Ionicons name={icon} size={18} color={tone} />
      </View>
      <Text style={[styles.bannerText, { color: colors.textPrimary }]}>{message}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar
        title="Transcript"
        large
        rightActions={
          <TouchableOpacity
            onPress={() => setShowGradingInfo(true)}
            style={[styles.appBarAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityLabel="Grading info"
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.mainFont} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Maintenance banner (shown when GUC redirects to the maintenance page) */}
        {maintenanceMessage &&
          renderBanner(maintenanceMessage, 'construct-outline', colors.warning, colors.warningSoft)}

        {/* Evaluation-required banner (shown when a pending evaluation blocks the transcript) */}
        {evaluationRequiredMessage &&
          renderBanner(evaluationRequiredMessage, 'clipboard-outline', colors.info, colors.infoSoft)}

        {/* Study years */}
        <Text style={[styles.overline, { color: colors.textSecondary }]}>Study Year</Text>
        <View style={styles.yearSection}>
          {loadingYears ? (
            <LoadingIndicator message={refreshing ? 'Refreshing...' : 'Loading study years...'} />
          ) : studyYears.length > 0 ? (
            <YearSelector
              studyYears={studyYears}
              selectedYear={selectedYear}
              onYearSelect={handleYearSelect}
            />
          ) : maintenanceMessage || evaluationRequiredMessage ? null : (
            <EmptyState
              icon="school-outline"
              title="No Study Years Available"
              message="No study years were found in your transcript."
            />
          )}
        </View>

        {/* Selected year */}
        {selectedYear && (
          <View>
            {/* Year summary card */}
            <View
              style={[
                styles.heroCard,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                Shadow.card(colors),
              ]}
            >
              <View style={styles.heroTop}>
                <View style={styles.heroTitle}>
                  <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Academic Year</Text>
                  <Text style={[styles.heroYear, { color: colors.textPrimary }]}>
                    {formatYearToShort(selectedYear.text)}
                  </Text>
                  {parsedTranscript?.date && (
                    <View style={styles.updatedRow}>
                      <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
                      <Text style={[styles.updatedDate, { color: colors.textTertiary }]}>
                        Updated {parsedTranscript.date}
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={[
                    styles.gpaBox,
                    { backgroundColor: withAlpha(gpaColor, 0.12), borderColor: withAlpha(gpaColor, 0.35) },
                  ]}
                >
                  <Text style={[styles.gpaValue, { color: gpaColor }]}>
                    {parsedTranscript?.cumulativeGPA || '--'}
                  </Text>
                  <Text style={[styles.gpaLabel, { color: gpaColor }]}>Cumulative GPA</Text>
                </View>
              </View>

              {parsedTranscript && !loadingTranscript && (
                <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
                  <Stat label="Semesters" value={String(semesterCount)} colors={colors} />
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <Stat label="Courses" value={String(courseCount)} colors={colors} />
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <Stat label="Credit hrs" value={totalHours ? String(totalHours) : '--'} colors={colors} />
                </View>
              )}
            </View>

            {loadingTranscript ? (
              <LoadingIndicator message="Loading transcript data..." />
            ) : parsedTranscript ? (
              <View>
                {parsedTranscript.semesters.map((semester, index) => (
                  <SemesterTable key={index} semester={semester} index={index} />
                ))}
              </View>
            ) : (
              <Text style={[styles.selectedYearSubtitle, { color: colors.textSecondary }]}>
                Select a study year to view transcript
              </Text>
            )}
          </View>
        )}

        {/* Prompt for when no year is selected */}
        {!selectedYear && (
          <EmptyState
            icon="calendar-outline"
            title="Select a Study Year"
            message="Choose a study year from above to view your detailed academic transcript"
          />
        )}

        <GradingInfoModal
          visible={showGradingInfo}
          onClose={() => setShowGradingInfo(false)}
        />
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: typeof Colors.light }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
  },
  appBarAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  overline: {
    ...Type.overline,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  yearSection: {
    marginBottom: Spacing.md,
  },
  heroCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTitle: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  heroLabel: {
    ...Type.overline,
  },
  heroYear: {
    ...Type.display,
    fontSize: 36,
    marginTop: 2,
  },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  updatedDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  gpaBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: 104,
  },
  gpaValue: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  gpaLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  selectedYearSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
