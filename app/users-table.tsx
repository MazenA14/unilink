import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/utils/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface User {
  guc_id: string;
  username: string;
  date_joined_app: string | null;
  joined_season: string | number | null;
  major: string | null;
  last_open_time: string | null;
  times_opened: number | null;
  joined_version: number | null;
  current_version: number | null;
}

type SortField = keyof User;
type SortDirection = 'asc' | 'desc';

interface FilterState {
  username: string;
  guc_id: string;
  joined_season: string;
  major: string;
}

export default function UsersTableScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date_joined_app');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<FilterState>({
    username: '',
    guc_id: '',
    joined_season: '',
    major: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('Users')
        .select('*');

      if (fetchError) {
        throw new Error(`Failed to fetch users: ${fetchError.message}`);
      }

      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // Apply filters
    if (filters.username) {
      result = result.filter(user =>
        user.username?.toLowerCase().includes(filters.username.toLowerCase())
      );
    }
    if (filters.guc_id) {
      result = result.filter(user =>
        user.guc_id?.toLowerCase().includes(filters.guc_id.toLowerCase())
      );
    }
    if (filters.joined_season) {
      result = result.filter(user =>
        user.joined_season?.toString().toLowerCase().includes(filters.joined_season.toLowerCase())
      );
    }
    if (filters.major) {
      result = result.filter(user =>
        user.major?.toLowerCase().includes(filters.major.toLowerCase())
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [users, filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setFilters({
      username: '',
      guc_id: '',
      joined_season: '',
      major: '',
    });
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <Ionicons name="swap-vertical" size={16} color={colors.secondaryFont} />;
    }
    return (
      <Ionicons
        name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'}
        size={16}
        color={colors.tint}
      />
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renderTopBar = () => (
    <View style={[styles.topBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.mainFont} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.mainFont }]}>Users Table</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.iconButton, { backgroundColor: showFilters ? colors.tint : 'transparent' }]}
          >
            <Ionicons name="filter" size={20} color={showFilters ? 'white' : colors.mainFont} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={fetchUsers}
            style={styles.iconButton}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Ionicons name="refresh" size={20} color={colors.mainFont} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Text style={[styles.statsText, { color: colors.secondaryFont }]}>
          Showing {filteredAndSortedUsers.length} of {users.length} users
        </Text>
      </View>

      {showFilters && (
        <View style={[styles.filtersContainer, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f9f9f9', borderColor: colors.border }]}>
          <Text style={[styles.filtersTitle, { color: colors.mainFont }]}>Filters</Text>
          
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.secondaryFont }]}>Username:</Text>
            <TextInput
              style={[styles.filterInput, { color: colors.mainFont, backgroundColor: colors.background, borderColor: colors.border }]}
              value={filters.username}
              onChangeText={(text) => setFilters(prev => ({ ...prev, username: text }))}
              placeholder="Search username..."
              placeholderTextColor={colors.secondaryFont}
            />
          </View>

          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.secondaryFont }]}>GUC ID:</Text>
            <TextInput
              style={[styles.filterInput, { color: colors.mainFont, backgroundColor: colors.background, borderColor: colors.border }]}
              value={filters.guc_id}
              onChangeText={(text) => setFilters(prev => ({ ...prev, guc_id: text }))}
              placeholder="Search GUC ID..."
              placeholderTextColor={colors.secondaryFont}
            />
          </View>

          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.secondaryFont }]}>Season:</Text>
            <TextInput
              style={[styles.filterInput, { color: colors.mainFont, backgroundColor: colors.background, borderColor: colors.border }]}
              value={filters.joined_season}
              onChangeText={(text) => setFilters(prev => ({ ...prev, joined_season: text }))}
              placeholder="Search season..."
              placeholderTextColor={colors.secondaryFont}
            />
          </View>

          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.secondaryFont }]}>Major:</Text>
            <TextInput
              style={[styles.filterInput, { color: colors.mainFont, backgroundColor: colors.background, borderColor: colors.border }]}
              value={filters.major}
              onChangeText={(text) => setFilters(prev => ({ ...prev, major: text }))}
              placeholder="Search major..."
              placeholderTextColor={colors.secondaryFont}
            />
          </View>

          <TouchableOpacity
            onPress={clearFilters}
            style={[styles.clearButton, { backgroundColor: colors.tint }]}
          >
            <Text style={styles.clearButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderTableHeader = () => (
    <View style={[styles.tableHeader, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f0f0f0', borderColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.headerCell, styles.usernameCell]}
        onPress={() => handleSort('username')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>Username</Text>
        {renderSortIcon('username')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, styles.gucIdCell]}
        onPress={() => handleSort('guc_id')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>GUC ID</Text>
        {renderSortIcon('guc_id')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, styles.seasonCell]}
        onPress={() => handleSort('joined_season')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>Season</Text>
        {renderSortIcon('joined_season')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, styles.majorCell]}
        onPress={() => handleSort('major')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>Major</Text>
        {renderSortIcon('major')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, styles.dateCell]}
        onPress={() => handleSort('date_joined_app')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>Date Joined</Text>
        {renderSortIcon('date_joined_app')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, styles.lastOpenCell]}
        onPress={() => handleSort('last_open_time')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>Last Open</Text>
        {renderSortIcon('last_open_time')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, styles.timesOpenedCell]}
        onPress={() => handleSort('times_opened')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>Times Opened</Text>
        {renderSortIcon('times_opened')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, styles.versionCell]}
        onPress={() => handleSort('joined_version')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>Joined Ver</Text>
        {renderSortIcon('joined_version')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, styles.versionCell]}
        onPress={() => handleSort('current_version')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>Current Ver</Text>
        {renderSortIcon('current_version')}
      </TouchableOpacity>
    </View>
  );

  const renderUserRow = ({ item, index }: { item: User; index: number }) => (
    <View
      style={[
        styles.tableRow,
        { backgroundColor: index % 2 === 0 ? colors.background : (colorScheme === 'dark' ? '#1a1a1a' : '#f9f9f9'), borderColor: colors.border }
      ]}
    >
      <View style={[styles.cell, styles.usernameCell]}>
        <Text style={[styles.cellText, { color: colors.mainFont }]} numberOfLines={2}>
          {item.username || 'N/A'}
        </Text>
      </View>
      <View style={[styles.cell, styles.gucIdCell]}>
        <Text style={[styles.cellText, { color: colors.mainFont }]} numberOfLines={1}>
          {item.guc_id || 'N/A'}
        </Text>
      </View>
      <View style={[styles.cell, styles.seasonCell]}>
        <Text style={[styles.cellText, { color: colors.mainFont }]}>
          {item.joined_season || 'N/A'}
        </Text>
      </View>
      <View style={[styles.cell, styles.majorCell]}>
        <Text style={[styles.cellText, { color: colors.mainFont }]} numberOfLines={2}>
          {item.major || 'N/A'}
        </Text>
      </View>
      <View style={[styles.cell, styles.dateCell]}>
        <Text style={[styles.cellText, styles.dateText, { color: colors.secondaryFont }]} numberOfLines={2}>
          {formatDate(item.date_joined_app)}
        </Text>
      </View>
      <View style={[styles.cell, styles.lastOpenCell]}>
        <Text style={[styles.cellText, styles.dateText, { color: colors.secondaryFont }]} numberOfLines={2}>
          {formatDate(item.last_open_time)}
        </Text>
      </View>
      <View style={[styles.cell, styles.timesOpenedCell]}>
        <Text style={[styles.cellText, { color: colors.mainFont }]}>
          {item.times_opened ?? 'N/A'}
        </Text>
      </View>
      <View style={[styles.cell, styles.versionCell]}>
        <Text style={[styles.cellText, { color: colors.secondaryFont }]}>
          {item.joined_version ?? 'N/A'}
        </Text>
      </View>
      <View style={[styles.cell, styles.versionCell]}>
        <Text style={[styles.cellText, { color: colors.secondaryFont }]}>
          {item.current_version ?? 'N/A'}
        </Text>
      </View>
    </View>
  );

  if (loading && users.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderTopBar()}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>Loading users...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderTopBar()}
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.gradeFailing} />
          <Text style={[styles.errorText, { color: colors.gradeFailing }]}>{error}</Text>
          <TouchableOpacity
            onPress={fetchUsers}
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderTopBar()}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.tableWrapper}>
          {renderTableHeader()}
          <ScrollView 
            style={styles.tableScrollView}
            showsVerticalScrollIndicator={true}
          >
            {filteredAndSortedUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={colors.secondaryFont} />
                <Text style={[styles.emptyText, { color: colors.secondaryFont }]}>
                  No users found
                </Text>
              </View>
            ) : (
              filteredAndSortedUsers.map((item, index) => (
                <View key={item.guc_id}>
                  {renderUserRow({ item, index })}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    marginBottom: 12,
  },
  statsText: {
    fontSize: 14,
  },
  filtersContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  filterInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  clearButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  tableWrapper: {
    minWidth: 1500,
  },
  tableScrollView: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    paddingVertical: 12,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    minHeight: 60,
  },
  cell: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usernameCell: {
    width: 180,
  },
  gucIdCell: {
    width: 120,
  },
  seasonCell: {
    width: 100,
  },
  majorCell: {
    width: 150,
  },
  dateCell: {
    width: 160,
  },
  lastOpenCell: {
    width: 160,
  },
  timesOpenedCell: {
    width: 120,
  },
  versionCell: {
    width: 100,
  },
  cellText: {
    fontSize: 13,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 11,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
});

