import BottomSheet from '@/components/ui/BottomSheet';
import { DropdownItem, DropdownMenu, SheetHeader, sheetRatioFor } from '@/components/ui/Dropdown';
import { SheetButtons } from '@/components/ui/SheetButtons';
import { AppBar } from '@/components/navigation/AppBar';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow } from '@/constants/Theme';
import { APP_VERSION } from '@/constants/Version';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/utils/supabase';
import { exportRowsToCSV } from '@/utils/csvExporter';
import { formatRelativeTime } from '@/utils/formatRelativeTime';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'username', label: 'Username' },
  { field: 'date_joined_app', label: 'Date Joined' },
  { field: 'last_open_time', label: 'Last Active' },
  { field: 'times_opened', label: 'Times Opened' },
  { field: 'joined_season', label: 'Season' },
  { field: 'major', label: 'Major' },
  { field: 'current_version', label: 'Current Version' },
];

export default function UsersTableScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date_joined_app');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [majorFilter, setMajorFilter] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null);

  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const lastUser = useRef<User | null>(null);
  if (detailUser) lastUser.current = detailUser;
  const shownDetailUser = detailUser ?? lastUser.current;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
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
      setRefreshing(false);
    }
  };

  const majors = useMemo(
    () => Array.from(new Set(users.map(u => u.major).filter(Boolean))).sort() as string[],
    [users]
  );
  const seasons = useMemo(
    () => Array.from(new Set(users.map(u => u.joined_season?.toString()).filter(Boolean))).sort() as string[],
    [users]
  );

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(user =>
        user.username?.toLowerCase().includes(q) ||
        user.guc_id?.toLowerCase().includes(q) ||
        user.major?.toLowerCase().includes(q)
      );
    }
    if (majorFilter) {
      result = result.filter(user => user.major === majorFilter);
    }
    if (seasonFilter) {
      result = result.filter(user => user.joined_season?.toString() === seasonFilter);
    }

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
  }, [users, search, majorFilter, seasonFilter, sortField, sortDirection]);

  const activeFilterCount = (majorFilter ? 1 : 0) + (seasonFilter ? 1 : 0);

  const handleSelectSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setMajorFilter(null);
    setSeasonFilter(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleDeleteUser = (user: User) => {
    Alert.alert(
      'Delete User',
      `Remove ${user.username || user.guc_id} from the database? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(user.guc_id);
              const { error: deleteError } = await supabase
                .from('Users')
                .delete()
                .eq('guc_id', user.guc_id);
              if (deleteError) throw new Error(deleteError.message);
              setUsers(prev => prev.filter(u => u.guc_id !== user.guc_id));
              setDetailUser(null);
            } catch (err) {
              Alert.alert('Delete failed', err instanceof Error ? err.message : 'Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      await exportRowsToCSV(
        'unilink_users',
        [
          { key: 'username', label: 'Username' },
          { key: 'guc_id', label: 'GUC ID' },
          { key: 'joined_season', label: 'Season' },
          { key: 'major', label: 'Major' },
          { key: 'date_joined_app', label: 'Date Joined' },
          { key: 'last_open_time', label: 'Last Open' },
          { key: 'times_opened', label: 'Times Opened' },
          { key: 'joined_version', label: 'Joined Version' },
          { key: 'current_version', label: 'Current Version' },
        ],
        filteredAndSortedUsers
      );
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const isOnLatestVersion = (user: User) =>
    user.current_version !== null && user.current_version === parseFloat(APP_VERSION);

  const renderUserCard = ({ item }: { item: User }) => {
    const initial = (item.username || item.guc_id || '?').charAt(0).toUpperCase();
    const upToDate = isOnLatestVersion(item);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setDetailUser(item)}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}
      >
        <View style={styles.cardTopRow}>
          <View style={[styles.avatar, { backgroundColor: colors.tint + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.tint }]}>{initial}</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTitle, { color: colors.mainFont }]} numberOfLines={1}>
              {item.username || 'Unknown'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.secondaryFont }]} numberOfLines={1}>
              {item.guc_id || 'No GUC ID'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteUser(item)}
            style={styles.deleteButton}
            disabled={deletingId === item.guc_id}
          >
            {deletingId === item.guc_id ? (
              <ActivityIndicator size="small" color={colors.gradeFailing} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={colors.gradeFailing} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.chipRow}>
          {item.major && (
            <View style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.chipText, { color: colors.mainFont }]} numberOfLines={1}>{item.major}</Text>
            </View>
          )}
          {item.joined_season !== null && (
            <View style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.chipText, { color: colors.mainFont }]}>Season {item.joined_season}</Text>
            </View>
          )}
          <View style={[
            styles.chip,
            { backgroundColor: upToDate ? colors.success + '20' : colors.warning + '20', borderColor: 'transparent' },
          ]}>
            <Text style={[styles.chipText, { color: upToDate ? colors.success : colors.warning }]}>
              v{item.current_version ?? '—'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooterRow}>
          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={13} color={colors.secondaryFont} />
            <Text style={[styles.footerText, { color: colors.secondaryFont }]}>
              {formatRelativeTime(item.last_open_time)}
            </Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="repeat-outline" size={13} color={colors.secondaryFont} />
            <Text style={[styles.footerText, { color: colors.secondaryFont }]}>
              {item.times_opened ?? 0} opens
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.secondaryFont} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderTopBar = () => (
    <View style={[styles.topBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <AppBar
        title="Users"
        variant="back"
        showNotifications={false}
        rightActions={
          <>
            <TouchableOpacity onPress={handleExportCSV} style={styles.iconButton} disabled={exporting}>
              {exporting ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Ionicons name="share-outline" size={20} color={colors.mainFont} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => fetchUsers()} style={styles.iconButton} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Ionicons name="refresh" size={20} color={colors.mainFont} />
              )}
            </TouchableOpacity>
          </>
        }
      />

      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.secondaryFont} />
          <TextInput
            style={[styles.searchInput, { color: colors.mainFont }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search username, GUC ID, major..."
            placeholderTextColor={colors.secondaryFont}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.secondaryFont} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.toolbarRow}>
        <TouchableOpacity
          style={[styles.toolbarButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setSortModalVisible(true)}
        >
          <Ionicons name="swap-vertical" size={15} color={colors.mainFont} />
          <Text style={[styles.toolbarButtonText, { color: colors.mainFont }]}>
            {SORT_OPTIONS.find(o => o.field === sortField)?.label}
          </Text>
          <Ionicons name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'} size={13} color={colors.secondaryFont} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toolbarButton,
            { backgroundColor: activeFilterCount > 0 ? colors.tint : colors.surface, borderColor: colors.border },
          ]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options-outline" size={15} color={activeFilterCount > 0 ? colors.onPrimary : colors.mainFont} />
          <Text style={[styles.toolbarButtonText, { color: activeFilterCount > 0 ? colors.onPrimary : colors.mainFont }]}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.statsText, { color: colors.secondaryFont }]}>
        {filteredAndSortedUsers.length} of {users.length} users
      </Text>
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
          <TouchableOpacity onPress={() => fetchUsers()} style={[styles.retryButton, { backgroundColor: colors.tint }]}>
            <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderTopBar()}

      <FlatList
        data={filteredAndSortedUsers}
        keyExtractor={item => item.guc_id}
        renderItem={renderUserCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchUsers(true)} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.secondaryFont} />
            <Text style={[styles.emptyText, { color: colors.secondaryFont }]}>No users found</Text>
          </View>
        }
      />

      {/* Sort sheet */}
      <DropdownMenu
        colors={colors}
        visible={sortModalVisible}
        onClose={() => setSortModalVisible(false)}
        title="Sort by"
        subtitle="Tap the active field again to flip the order"
        heightRatio={sheetRatioFor(SORT_OPTIONS.length, 66, 110)}
      >
        {SORT_OPTIONS.map(option => (
          <DropdownItem
            key={option.field}
            colors={colors}
            label={option.label}
            selected={sortField === option.field}
            subtitle={sortField === option.field ? (sortDirection === 'asc' ? 'Ascending' : 'Descending') : undefined}
            onPress={() => handleSelectSort(option.field)}
          />
        ))}
      </DropdownMenu>

      {/* Filter sheet */}
      <BottomSheet
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
        autoHeight
        header={
          <SheetHeader
            colors={colors}
            title="Filters"
            right={
              <TouchableOpacity onPress={clearFilters} hitSlop={8}>
                <Text style={[styles.clearLink, { color: colors.tint }]}>Clear</Text>
              </TouchableOpacity>
            }
          />
        }
        footer={<SheetButtons primary={{ label: 'Done', onPress: () => setFilterModalVisible(false) }} />}
      >
        <View style={styles.sheetBody}>

            <Text style={[styles.filterGroupLabel, { color: colors.secondaryFont }]}>Major</Text>
            <View style={styles.chipsWrap}>
              {majors.map(major => (
                <TouchableOpacity
                  key={major}
                  onPress={() => setMajorFilter(prev => (prev === major ? null : major))}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border, backgroundColor: majorFilter === major ? colors.tint : 'transparent' },
                  ]}
                >
                  <Text style={{ color: majorFilter === major ? colors.onPrimary : colors.mainFont, fontSize: 12, fontWeight: '600' }}>
                    {major}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterGroupLabel, { color: colors.secondaryFont }]}>Season</Text>
            <View style={styles.chipsWrap}>
              {seasons.map(season => (
                <TouchableOpacity
                  key={season}
                  onPress={() => setSeasonFilter(prev => (prev === season ? null : season))}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border, backgroundColor: seasonFilter === season ? colors.tint : 'transparent' },
                  ]}
                >
                  <Text style={{ color: seasonFilter === season ? colors.onPrimary : colors.mainFont, fontSize: 12, fontWeight: '600' }}>
                    {season}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

        </View>
      </BottomSheet>

      {/* Detail sheet */}
      <BottomSheet
        visible={detailUser !== null}
        onRequestClose={() => setDetailUser(null)}
        autoHeight
        heightRatio={0.85}
        header={<SheetHeader colors={colors} title={shownDetailUser?.username || 'User'} />}
        footer={
          shownDetailUser ? (
            <SheetButtons
              primary={{ label: 'Delete User', icon: 'trash-outline', tone: 'danger', onPress: () => handleDeleteUser(shownDetailUser) }}
            />
          ) : undefined
        }
      >
        <View style={styles.sheetBody}>
              {shownDetailUser && [
                ['GUC ID', shownDetailUser.guc_id || 'N/A'],
                ['Major', shownDetailUser.major || 'N/A'],
                ['Season', shownDetailUser.joined_season?.toString() || 'N/A'],
                ['Date Joined', formatDate(shownDetailUser.date_joined_app)],
                ['Last Open', formatDate(shownDetailUser.last_open_time)],
                ['Times Opened', shownDetailUser.times_opened?.toString() || '0'],
                ['Joined Version', shownDetailUser.joined_version?.toString() || 'N/A'],
                ['Current Version', shownDetailUser.current_version?.toString() || 'N/A'],
              ].map(([label, value]) => (
                <View key={label} style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.secondaryFont }]}>{label}</Text>
                  <Text style={[styles.detailValue, { color: colors.mainFont }]}>{value}</Text>
                </View>
              ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  container: {
    flex: 1,
  },
  topBar: {
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  toolbarRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolbarButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  statsText: {
    fontSize: 12,
    paddingHorizontal: 16,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  deleteButton: {
    padding: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11.5,
    fontWeight: '500',
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
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  clearLink: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterGroupLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
});
