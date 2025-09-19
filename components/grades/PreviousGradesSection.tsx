import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import CourseGrid from './CourseGrid';
import SeasonSelector from './SeasonSelector';
import { CourseWithGrades, Season, YearGroup } from './types';

interface PreviousGradesSectionProps {
  yearGroups: YearGroup[];
  selectedSeason: Season | null;
  coursesWithGrades: CourseWithGrades[];
  loadingSeasons: boolean;
  loadingCourses: boolean;
  loadingGrades: boolean;
  refreshing: boolean;
  onSeasonSelect: (season: Season) => void;
  onCourseToggle: (courseIndex: number) => void;
  getGradeColor: (percentage: number) => string;
  formatCourseName: (courseText: string) => string;
  getCourseCodeParts: (courseText: string) => { code: string; number: string };
  formatGradeDisplay: (grade: any) => string;
  calculateAverage: () => number;
}

export default function PreviousGradesSection({
  yearGroups,
  selectedSeason,
  coursesWithGrades,
  loadingSeasons,
  loadingCourses,
  loadingGrades,
  refreshing,
  onSeasonSelect,
  onCourseToggle,
  getGradeColor,
  formatCourseName,
  getCourseCodeParts,
  formatGradeDisplay,
  calculateAverage,
}: PreviousGradesSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <>
      {/* Seasons Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Previous Grades</Text>
        {loadingSeasons ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.tabIconDefault }]}>
              {refreshing ? 'Refreshing...' : 'Loading semester grades...'}
            </Text>
          </View>
        ) : yearGroups.length > 0 ? (
          <SeasonSelector
            yearGroups={yearGroups}
            selectedSeason={selectedSeason}
            onSeasonSelect={onSeasonSelect}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Grades Available</Text>
            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
              No previous semester grades were found in your account.
            </Text>
          </View>
        )}
      </View>

      {/* Unified Course Grades Section */}
      {selectedSeason && (
        <View style={styles.section}>
          <View style={styles.courseSelectionContainer}>
            <CourseGrid
              coursesWithGrades={coursesWithGrades}
              loadingCourses={loadingCourses}
              loadingGrades={loadingGrades}
              onCourseToggle={onCourseToggle}
              getGradeColor={getGradeColor}
              formatCourseName={formatCourseName}
              getCourseCodeParts={getCourseCodeParts}
              formatGradeDisplay={formatGradeDisplay}
              calculateAverage={calculateAverage}
            />
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  courseSelectionContainer: {
    marginTop: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
});
