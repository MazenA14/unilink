import { Colors } from '@/constants/Colors';
import { Radius } from '@/constants/Theme';
import { APP_VERSION } from '@/constants/Version';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/utils/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface UserStats {
  totalUsers: number;
  usersBySeason: { [key: string]: number };
  usersByMajor: { [key: string]: number };
  usersByJoinedVersion: { [key: string]: number };
  usersByCurrentVersion: { [key: string]: number };
  recentUsers: number; // Active users who used the app in the last 10 days
  activeToday: number; // Active users who used the app in the last 24 hours
  latestVersionUsers: number; // Users on the current app version
}

interface FeedbackStats {
  totalFeedback: number;
  feedbackByVersion: { [key: string]: number };
  recentFeedback: number; // Feedback in the last 30 days
  mostActiveFeedbackDay: string; // Day with most feedback
}

interface StatisticsData {
  users: UserStats;
  feedback: FeedbackStats;
  loading: boolean;
  error: string | null;
}

export default function StatisticsSection() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [stats, setStats] = useState<StatisticsData>({
    users: {
      totalUsers: 0,
      usersBySeason: {},
      usersByMajor: {},
      usersByJoinedVersion: {},
      usersByCurrentVersion: {},
      recentUsers: 0,
      activeToday: 0,
      latestVersionUsers: 0,
    },
    feedback: {
      totalFeedback: 0,
      feedbackByVersion: {},
      recentFeedback: 0,
      mostActiveFeedbackDay: 'N/A',
    },
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true, error: null }));

      // Fetch Users data
      const { data: usersData, error: usersError } = await supabase
        .from('Users')
        .select('*');

      if (usersError) {
        throw new Error(`Users fetch error: ${usersError.message}`);
      }

      // Fetch Feedback data
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('Feedback')
        .select('*');

      if (feedbackError) {
        throw new Error(`Feedback fetch error: ${feedbackError.message}`);
      }

      // Process Users data
      const totalUsers = usersData?.length || 0;
      const usersBySeason: { [key: string]: number } = {};
      const usersByMajor: { [key: string]: number } = {};
      const usersByJoinedVersion: { [key: string]: number } = {};
      const usersByCurrentVersion: { [key: string]: number } = {};
      let recentUsers = 0;
      let activeToday = 0;
      let latestVersionUsers = 0;

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      usersData?.forEach(user => {
        // Count by season
        if (user.joined_season) {
          const season = user.joined_season.toString();
          usersBySeason[season] = (usersBySeason[season] || 0) + 1;
        }

        // Count by major
        if (user.major) {
          usersByMajor[user.major] = (usersByMajor[user.major] || 0) + 1;
        }

        // Count by the version they joined on
        if (user.joined_version !== null && user.joined_version !== undefined) {
          const version = user.joined_version.toString();
          usersByJoinedVersion[version] = (usersByJoinedVersion[version] || 0) + 1;
        }

        // Count by the version they're currently running
        if (user.current_version !== null && user.current_version !== undefined) {
          const version = user.current_version.toString();
          usersByCurrentVersion[version] = (usersByCurrentVersion[version] || 0) + 1;
        }

        // Count active users
        if (user.last_open_time) {
          const lastOpenDate = new Date(user.last_open_time);
          if (lastOpenDate >= tenDaysAgo) {
            recentUsers++;
          }
          if (lastOpenDate >= oneDayAgo) {
            activeToday++;
          }
        }

        // Count users on latest version
        if (user.current_version !== null && user.current_version !== undefined) {
          const currentVersion = parseFloat(APP_VERSION);
          if (user.current_version === currentVersion) {
            latestVersionUsers++;
          }
        }
      });


      // Process Feedback data
      const totalFeedback = feedbackData?.length || 0;
      const feedbackByVersion: { [key: string]: number } = {};
      const feedbackByDay: { [key: string]: number } = {};
      let recentFeedback = 0;

      feedbackData?.forEach(feedback => {
        // Count by version
        if (feedback.version !== null && feedback.version !== undefined) {
          feedbackByVersion[feedback.version] = (feedbackByVersion[feedback.version] || 0) + 1;
        }

        // Count recent feedback
        if (feedback.date) {
          const feedbackDate = new Date(feedback.date);
          if (feedbackDate >= thirtyDaysAgo) {
            recentFeedback++;
          }

          // Count by day
          const dayKey = feedbackDate.toISOString().split('T')[0];
          feedbackByDay[dayKey] = (feedbackByDay[dayKey] || 0) + 1;
        }
      });


      // Find most active feedback day
      let mostActiveFeedbackDay = 'N/A';
      let maxFeedbackCount = 0;
      Object.entries(feedbackByDay).forEach(([day, count]) => {
        if (count > maxFeedbackCount) {
          maxFeedbackCount = count;
          mostActiveFeedbackDay = new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      });

      setStats({
        users: {
          totalUsers,
          usersBySeason,
          usersByMajor,
          usersByJoinedVersion,
          usersByCurrentVersion,
          recentUsers,
          activeToday,
          latestVersionUsers,
        },
        feedback: {
          totalFeedback,
          feedbackByVersion,
          recentFeedback,
          mostActiveFeedbackDay,
        },
        loading: false,
        error: null,
      });

    } catch (error) {
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch statistics',
      }));
    }
  };

  const renderStatCard = (title: string, value: string | number, subtitle?: string, icon?: keyof typeof Ionicons.glyphMap) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {icon && (
        <View style={[styles.statIconChip, { backgroundColor: colors.background }]}>
          <Ionicons name={icon} size={16} color={colors.tint} />
        </View>
      )}
      <Text style={[styles.statValue, { color: colors.mainFont }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.secondaryFont }]}>{title}</Text>
      {subtitle && <Text style={[styles.statSubtitle, { color: colors.secondaryFont }]}>{subtitle}</Text>}
    </View>
  );

  const renderSectionHeader = (title: string) => (
    <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>{title}</Text>
  );

  const renderBreakdownList = (items: { [key: string]: number }, emptyLabel: string, formatKey?: (key: string) => string) => {
    const total = Object.values(items).reduce((sum, n) => sum + n, 0);
    const sortedItems = Object.entries(items).sort(([, a], [, b]) => b - a);

    if (sortedItems.length === 0) {
      return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.secondaryFont }]}>{emptyLabel}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {sortedItems.map(([key, count], index) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <View
              key={key}
              style={[
                styles.breakdownRow,
                index < sortedItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.breakdownTopRow}>
                <Text style={[styles.breakdownKey, { color: colors.mainFont }]} numberOfLines={1}>
                  {formatKey ? formatKey(key) : key}
                </Text>
                <Text style={[styles.breakdownValue, { color: colors.mainFont }]}>{count}</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.tint }]} />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (stats.loading && stats.users.totalUsers === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>Loading statistics...</Text>
        </View>
      </View>
    );
  }

  if (stats.error) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.errorText, { color: colors.gradeFailing }]}>Error: {stats.error}</Text>
        </View>
      </View>
    );
  }

  const activePct = stats.users.totalUsers > 0
    ? Math.round((stats.users.recentUsers / stats.users.totalUsers) * 100)
    : 0;
  const latestVersionPct = stats.users.totalUsers > 0
    ? Math.round((stats.users.latestVersionUsers / stats.users.totalUsers) * 100)
    : 0;

  return (
    <View style={styles.container}>
      {/* Overview */}
      <View style={styles.overviewHeaderRow}>
        <Text style={[styles.sectionTitle, styles.overviewSectionTitle, { color: colors.secondaryFont }]}>OVERVIEW</Text>
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: colors.tint }]}
          onPress={fetchStatistics}
          disabled={stats.loading}
        >
          {stats.loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="refresh" size={16} color="white" />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.statsGrid}>
        {renderStatCard('Total Users', stats.users.totalUsers, undefined, 'people')}
        {renderStatCard('Active Today', stats.users.activeToday, 'Last 24 hours', 'flash')}
        {renderStatCard('Active Users', stats.users.recentUsers, `${activePct}% · Last 10 days`, 'pulse')}
        {renderStatCard('On Latest Version', stats.users.latestVersionUsers, `${latestVersionPct}% · v${APP_VERSION}`, 'checkmark-done')}
        {renderStatCard('Total Feedback', stats.feedback.totalFeedback, undefined, 'chatbubbles')}
        {renderStatCard('Recent Feedback', stats.feedback.recentFeedback, 'Last 30 days', 'time')}
      </View>

      {/* App Versions */}
      {renderSectionHeader('CURRENT APP VERSION')}
      {renderBreakdownList(stats.users.usersByCurrentVersion, 'No version data available', v => `v${v}`)}

      {renderSectionHeader('JOINED ON VERSION')}
      {renderBreakdownList(stats.users.usersByJoinedVersion, 'No version data available', v => `v${v}`)}

      {/* Majors */}
      {renderSectionHeader('MAJORS')}
      {renderBreakdownList(stats.users.usersByMajor, 'No major data available')}

      {/* Seasons */}
      {renderSectionHeader('JOINED SEASON')}
      {renderBreakdownList(stats.users.usersBySeason, 'No season data available')}

      {/* Feedback */}
      {renderSectionHeader('FEEDBACK')}
      <View style={styles.statsGrid}>
        {renderStatCard('Most Active Day', stats.feedback.mostActiveFeedbackDay, undefined, 'calendar')}
        {renderStatCard('Total Feedback', stats.feedback.totalFeedback, undefined, 'chatbubble-ellipses')}
      </View>
      {renderBreakdownList(stats.feedback.feedbackByVersion, 'No feedback version data available', v => `v${v}`)}

      {/* Data Tables */}
      {renderSectionHeader('DATA TABLES')}
      <View style={styles.tableButtonsContainer}>
        <TouchableOpacity
          style={[styles.tableButton, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/users-table')}
        >
          <Ionicons name="people" size={20} color="white" />
          <Text style={styles.tableButtonText}>View Full Users Table</Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tableButton, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/feedback-table')}
        >
          <Ionicons name="chatbubbles" size={20} color="white" />
          <Text style={styles.tableButtonText}>View Full Feedback Table</Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  overviewSectionTitle: {
    marginTop: 0,
    marginBottom: 0,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 26,
    marginBottom: 10,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 10,
  },
  statIconChip: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  statSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 4,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  breakdownRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  breakdownTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownKey: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  tableButtonsContainer: {
    gap: 12,
  },
  tableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    gap: 8,
  },
  tableButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
});
