import { AppBar } from '@/components/navigation/AppBar';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/utils/supabase';
import { exportRowsToCSV } from '@/utils/csvExporter';
import { formatRelativeTime } from '@/utils/formatRelativeTime';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Feedback {
  id: string;
  username: string | null;
  notes: string | null;
  joined_season: number | null;
  guc_id: string;
  date: string | null;
  version: string | null;
}

type SortField = keyof Feedback;
type SortDirection = 'asc' | 'desc';

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'date', label: 'Date' },
  { field: 'username', label: 'Username' },
  { field: 'version', label: 'Version' },
  { field: 'joined_season', label: 'Season' },
];

export default function FeedbackTableScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [versionFilter, setVersionFilter] = useState<string | null>(null);

  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailFeedback, setDetailFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('Feedback')
        .select('*');

      if (fetchError) {
        throw new Error(`Failed to fetch feedback: ${fetchError.message}`);
      }

      setFeedbackList(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feedback');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const versions = useMemo(
    () => Array.from(new Set(feedbackList.map(f => f.version).filter(Boolean))).sort() as string[],
    [feedbackList]
  );

  const filteredAndSortedFeedback = useMemo(() => {
    let result = [...feedbackList];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(item =>
        item.username?.toLowerCase().includes(q) ||
        item.guc_id?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q)
      );
    }
    if (versionFilter) {
      result = result.filter(item => item.version === versionFilter);
    }

    result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [feedbackList, search, versionFilter, sortField, sortDirection]);

  const activeFilterCount = versionFilter ? 1 : 0;

  const handleSelectSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteFeedback = (item: Feedback) => {
    Alert.alert(
      'Delete Feedback',
      `Remove this feedback entry from ${item.username || 'Anonymous'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(item.id);
              const { error: deleteError } = await supabase
                .from('Feedback')
                .delete()
                .eq('id', item.id);
              if (deleteError) throw new Error(deleteError.message);
              setFeedbackList(prev => prev.filter(f => f.id !== item.id));
              setDetailFeedback(null);
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
        'unilink_feedback',
        [
          { key: 'username', label: 'Username' },
          { key: 'guc_id', label: 'GUC ID' },
          { key: 'joined_season', label: 'Season' },
          { key: 'version', label: 'Version' },
          { key: 'date', label: 'Date' },
          { key: 'notes', label: 'Notes' },
        ],
        filteredAndSortedFeedback
      );
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const renderFeedbackCard = ({ item }: { item: Feedback }) => {
    const isExpanded = expandedIds.has(item.id);
    const notes = item.notes || 'No notes provided';
    const isLong = notes.length > 140;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.card(colors)]}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTitle, { color: colors.mainFont }]} numberOfLines={1}>
              {item.username || 'Anonymous'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.secondaryFont }]}>
              {formatRelativeTime(item.date)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteFeedback(item)}
            style={styles.deleteButton}
            disabled={deletingId === item.id}
          >
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color={colors.gradeFailing} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={colors.gradeFailing} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.chipRow}>
          {item.version && (
            <View style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.chipText, { color: colors.mainFont }]}>v{item.version}</Text>
            </View>
          )}
          {item.joined_season !== null && (
            <View style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.chipText, { color: colors.mainFont }]}>Season {item.joined_season}</Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.notesText, { color: colors.mainFont }]}
          numberOfLines={isExpanded ? undefined : 3}
        >
          {notes}
        </Text>

        <View style={styles.cardFooterRow}>
          {isLong && (
            <TouchableOpacity onPress={() => toggleExpanded(item.id)} style={styles.footerLinkButton}>
              <Text style={[styles.footerLinkText, { color: colors.tint }]}>
                {isExpanded ? 'Show less' : 'Read more'}
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => setDetailFeedback(item)} style={styles.footerLinkButton}>
            <Text style={[styles.footerLinkText, { color: colors.secondaryFont }]}>Details</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.secondaryFont} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTopBar = () => (
    <View style={[styles.topBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <AppBar
        title="Feedback"
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
            <TouchableOpacity onPress={() => fetchFeedback()} style={styles.iconButton} disabled={loading}>
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
            placeholder="Search username, GUC ID, notes..."
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
          <Ionicons name="options-outline" size={15} color={activeFilterCount > 0 ? 'white' : colors.mainFont} />
          <Text style={[styles.toolbarButtonText, { color: activeFilterCount > 0 ? 'white' : colors.mainFont }]}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.statsText, { color: colors.secondaryFont }]}>
        {filteredAndSortedFeedback.length} of {feedbackList.length} entries
      </Text>
    </View>
  );

  if (loading && feedbackList.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderTopBar()}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>Loading feedback...</Text>
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
          <TouchableOpacity onPress={() => fetchFeedback()} style={[styles.retryButton, { backgroundColor: colors.tint }]}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderTopBar()}

      <FlatList
        data={filteredAndSortedFeedback}
        keyExtractor={item => item.id}
        renderItem={renderFeedbackCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchFeedback(true)} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={48} color={colors.secondaryFont} />
            <Text style={[styles.emptyText, { color: colors.secondaryFont }]}>No feedback found</Text>
          </View>
        }
      />

      {/* Sort Modal */}
      <Modal visible={sortModalVisible} transparent animationType="fade" onRequestClose={() => setSortModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
          <View style={[styles.sheetContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.mainFont }]}>Sort By</Text>
            {SORT_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.field}
                style={styles.sheetRow}
                onPress={() => handleSelectSort(option.field)}
              >
                <Text style={[styles.sheetRowText, { color: colors.mainFont }]}>{option.label}</Text>
                {sortField === option.field && (
                  <Ionicons name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'} size={16} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} transparent animationType="fade" onRequestClose={() => setFilterModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterModalVisible(false)}>
          <View style={[styles.sheetContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetTitle, { color: colors.mainFont }]}>Filters</Text>
              <TouchableOpacity onPress={() => setVersionFilter(null)}>
                <Text style={[styles.clearLink, { color: colors.tint }]}>Clear</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterGroupLabel, { color: colors.secondaryFont }]}>Version</Text>
            <View style={styles.chipsWrap}>
              {versions.map(version => (
                <TouchableOpacity
                  key={version}
                  onPress={() => setVersionFilter(prev => (prev === version ? null : version))}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border, backgroundColor: versionFilter === version ? colors.tint : 'transparent' },
                  ]}
                >
                  <Text style={{ color: versionFilter === version ? colors.onPrimary : colors.mainFont, fontSize: 12, fontWeight: '600' }}>
                    v{version}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.tint }]}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={[styles.doneButtonText, { color: colors.onPrimary }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={detailFeedback !== null} transparent animationType="fade" onRequestClose={() => setDetailFeedback(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.detailContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.mainFont }]}>
                {detailFeedback?.username || 'Anonymous'}
              </Text>
              <TouchableOpacity onPress={() => setDetailFeedback(null)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.mainFont} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {detailFeedback && [
                ['GUC ID', detailFeedback.guc_id || 'N/A'],
                ['Season', detailFeedback.joined_season?.toString() || 'N/A'],
                ['Version', detailFeedback.version ? `v${detailFeedback.version}` : 'N/A'],
                ['Date', formatDate(detailFeedback.date)],
              ].map(([label, value]) => (
                <View key={label} style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.secondaryFont }]}>{label}</Text>
                  <Text style={[styles.detailValue, { color: colors.mainFont }]}>{value}</Text>
                </View>
              ))}
              <Text style={[styles.notesFullLabel, { color: colors.secondaryFont }]}>Notes</Text>
              <Text style={[styles.notesFullText, { color: colors.mainFont }]}>
                {detailFeedback?.notes || 'No notes provided'}
              </Text>
            </ScrollView>
            {detailFeedback && (
              <TouchableOpacity
                style={[styles.deleteFullButton, { backgroundColor: colors.gradeFailing }]}
                onPress={() => handleDeleteFeedback(detailFeedback)}
              >
                <Ionicons name="trash-outline" size={16} color="white" />
                <Text style={styles.deleteFullButtonText}>Delete Feedback</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  footerLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  footerLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
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
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 32,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  clearLink: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  sheetRowText: {
    fontSize: 15,
    fontWeight: '500',
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
  doneButton: {
    marginTop: 20,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  detailContent: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    marginHorizontal: 20,
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 16,
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
  notesFullLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  notesFullText: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  deleteFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    paddingVertical: 12,
    borderRadius: Radius.lg,
  },
  deleteFullButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});
