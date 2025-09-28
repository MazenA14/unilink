import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/utils/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface UserStats {
  totalUsers: number;
  usersBySeason: { [key: string]: number };
  usersByMajor: { [key: string]: number };
  recentUsers: number; // Users who joined in the last 30 days
}

interface FeedbackStats {
  totalFeedback: number;
  feedbackByVersion: { [key: string]: number };
  recentFeedback: number; // Feedback in the last 30 days
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
      recentUsers: 0,
    },
    feedback: {
      totalFeedback: 0,
      feedbackByVersion: {},
      recentFeedback: 0,
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
      let recentUsers = 0;

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

        // Count recent users
        if (user.date_joined_app) {
          const joinDate = new Date(user.date_joined_app);
          if (joinDate >= thirtyDaysAgo) {
            recentUsers++;
          }
        }
      });

      // Process Feedback data
      const totalFeedback = feedbackData?.length || 0;
      const feedbackByVersion: { [key: string]: number } = {};
      let recentFeedback = 0;

      feedbackData?.forEach(feedback => {
        // Count by version
        if (feedback.version) {
          feedbackByVersion[feedback.version] = (feedbackByVersion[feedback.version] || 0) + 1;
        }

        // Count recent feedback
        if (feedback.date) {
          const feedbackDate = new Date(feedback.date);
          if (feedbackDate >= thirtyDaysAgo) {
            recentFeedback++;
          }
        }
      });

      setStats({
        users: {
          totalUsers,
          usersBySeason,
          usersByMajor,
          recentUsers,
        },
        feedback: {
          totalFeedback,
          feedbackByVersion,
          recentFeedback,
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

  const renderStatCard = (title: string, value: string | number, subtitle?: string) => (
    <View style={[styles.statCard, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.mainFont }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.mainFont }]}>{title}</Text>
      {subtitle && <Text style={[styles.statSubtitle, { color: colors.secondaryFont }]}>{subtitle}</Text>}
    </View>
  );

  const renderAllItems = (items: { [key: string]: number }, title: string) => {
    const sortedItems = Object.entries(items)
      .sort(([, a], [, b]) => b - a);

    if (sortedItems.length === 0) return null;

    return (
      <View style={[styles.allItemsContainer, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}>
        <Text style={[styles.allItemsTitle, { color: colors.mainFont }]}>{title}</Text>
        {sortedItems.map(([key, count]) => (
          <View key={key} style={styles.allItemRow}>
            <Text style={[styles.allItemKey, { color: colors.mainFont }]}>{key}</Text>
            <Text style={[styles.allItemValue, { color: colors.secondaryFont }]}>{count}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTopItems = (items: { [key: string]: number }, title: string, maxItems: number = 3) => {
    const sortedItems = Object.entries(items)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxItems);

    if (sortedItems.length === 0) return null;

    return (
      <View style={[styles.topItemsContainer, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}>
        <Text style={[styles.topItemsTitle, { color: colors.mainFont }]}>{title}</Text>
        {sortedItems.map(([key, count]) => (
          <View key={key} style={styles.topItemRow}>
            <Text style={[styles.topItemKey, { color: colors.mainFont }]}>{key}</Text>
            <Text style={[styles.topItemValue, { color: colors.secondaryFont }]}>{count}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (stats.loading && stats.users.totalUsers === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}>
        <View style={styles.headerContainer}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>STATISTICS</Text>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.tint }]}
            onPress={fetchStatistics}
            disabled={stats.loading}
          >
            <ActivityIndicator size="small" color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>Loading statistics...</Text>
        </View>
      </View>
    );
  }

  if (stats.error) {
    return (
      <View style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}>
        <Text style={[styles.errorText, { color: colors.gradeFailing }]}>Error: {stats.error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>STATISTICS</Text>
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
      
      {/* User Statistics */}
      <View style={styles.statsGrid}>
        {renderStatCard('Total Users', stats.users.totalUsers)}
        {renderStatCard('Recent Users', stats.users.recentUsers, 'Last 30 days')}
        {renderStatCard('Total Feedback', stats.feedback.totalFeedback)}
        {renderStatCard('Recent Feedback', stats.feedback.recentFeedback, 'Last 30 days')}
      </View>

      {/* All Majors */}
      {renderAllItems(stats.users.usersByMajor, 'All Majors')}

      {/* All Seasons */}
      {renderAllItems(stats.users.usersBySeason, 'All Seasons')}

      {/* Top Versions */}
      {renderTopItems(stats.feedback.feedbackByVersion, 'Feedback by Version')}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotatingIcon: {
    // This will be handled by the ActivityIndicator in the loading state
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  topItemsContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  topItemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  topItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  topItemKey: {
    fontSize: 12,
    flex: 1,
  },
  topItemValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  allItemsContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  allItemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  allItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  allItemKey: {
    fontSize: 12,
    flex: 1,
  },
  allItemValue: {
    fontSize: 12,
    fontWeight: '600',
  },
});
