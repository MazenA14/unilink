import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/utils/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
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

interface FilterState {
  username: string;
  guc_id: string;
  notes: string;
  version: string;
}

export default function FeedbackTableScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<FilterState>({
    username: '',
    guc_id: '',
    notes: '',
    version: '',
  });
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({});
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{content: string, title: string} | null>(null);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('Feedback')
        .select('*');

      if (fetchError) {
        throw new Error(`Failed to fetch feedback: ${fetchError.message}`);
      }

      setFeedbackList(data || []);
      // Calculate column widths after data is loaded
      setTimeout(() => {
        calculateColumnWidths();
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedFeedback = useMemo(() => {
    let result = [...feedbackList];

    // Apply filters
    if (filters.username) {
      result = result.filter(item =>
        item.username?.toLowerCase().includes(filters.username.toLowerCase())
      );
    }
    if (filters.guc_id) {
      result = result.filter(item =>
        item.guc_id?.toLowerCase().includes(filters.guc_id.toLowerCase())
      );
    }
    if (filters.version) {
      result = result.filter(item =>
        item.version?.toLowerCase().includes(filters.version.toLowerCase())
      );
    }
    if (filters.notes) {
      result = result.filter(item =>
        item.notes?.toLowerCase().includes(filters.notes.toLowerCase())
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
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [feedbackList, filters, sortField, sortDirection]);

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
      notes: '',
      version: '',
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

  const calculateColumnWidths = () => {
    const widths: {[key: string]: number} = {};
    
    // Define column headers and their text
    const headers = {
      id: 'ID',
      username: 'Username',
      joined_season: 'Season',
      guc_id: 'GUC ID',
      date: 'Date',
      version: 'Version',
      notes: 'Notes'
    };

    // Calculate width for each column
    Object.keys(headers).forEach(key => {
      let maxWidth = 0;
      
      // Measure content width for each feedback item (prioritize cell content over header)
      feedbackList.forEach(feedback => {
        let content = '';
        switch (key) {
          case 'id':
            content = feedback.id || '';
            break;
          case 'username':
            content = feedback.username || 'N/A';
            break;
          case 'joined_season':
            content = feedback.joined_season?.toString() || 'N/A';
            break;
          case 'guc_id':
            content = feedback.guc_id || '';
            break;
          case 'date':
            content = formatDate(feedback.date);
            break;
          case 'version':
            content = feedback.version || 'N/A';
            break;
          case 'notes':
            content = feedback.notes || 'N/A';
            break;
        }
        
        // More accurate width calculation - use 10px per character for better accuracy
        const contentWidth = content.length * 10 + 32; // Increased padding for better fit
        maxWidth = Math.max(maxWidth, contentWidth);
      });
      
      // Only use header width if no data or header is wider than all content
      const headerText = headers[key as keyof typeof headers];
      const headerWidth = headerText.length * 10 + 32;
      maxWidth = Math.max(maxWidth, headerWidth);
      
      // Set minimum width and apply calculated width with extra buffer
      widths[key] = Math.max(maxWidth + 20, 100); // Extra 20px buffer + higher minimum
    });
    
    setColumnWidths(widths);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleCellPress = (content: string, title: string) => {
    setSelectedCell({ content, title });
  };

  const renderTopBar = () => (
    <View style={[styles.topBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.mainFont} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.mainFont }]}>Feedback Table</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.iconButton, { backgroundColor: showFilters ? colors.tint : 'transparent' }]}
          >
            <Ionicons name="filter" size={20} color={showFilters ? 'white' : colors.mainFont} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={fetchFeedback}
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
          Showing {filteredAndSortedFeedback.length} of {feedbackList.length} feedback entries
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
            <Text style={[styles.filterLabel, { color: colors.secondaryFont }]}>Version:</Text>
            <TextInput
              style={[styles.filterInput, { color: colors.mainFont, backgroundColor: colors.background, borderColor: colors.border }]}
              value={filters.version}
              onChangeText={(text) => setFilters(prev => ({ ...prev, version: text }))}
              placeholder="Search version..."
              placeholderTextColor={colors.secondaryFont}
            />
          </View>

          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.secondaryFont }]}>Notes:</Text>
            <TextInput
              style={[styles.filterInput, { color: colors.mainFont, backgroundColor: colors.background, borderColor: colors.border }]}
              value={filters.notes}
              onChangeText={(text) => setFilters(prev => ({ ...prev, notes: text }))}
              placeholder="Search notes..."
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
        style={[styles.headerCell, { width: columnWidths.id || 100 }]}
        onPress={() => handleSort('id')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>ID</Text>
        {renderSortIcon('id')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, { width: columnWidths.username || 120 }]}
        onPress={() => handleSort('username')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>Username</Text>
        {renderSortIcon('username')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, { width: columnWidths.guc_id || 100 }]}
        onPress={() => handleSort('guc_id')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>GUC ID</Text>
        {renderSortIcon('guc_id')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, { width: columnWidths.joined_season || 80 }]}
        onPress={() => handleSort('joined_season')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>Season</Text>
        {renderSortIcon('joined_season')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, { width: columnWidths.version || 120 }]}
        onPress={() => handleSort('version')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>Version</Text>
        {renderSortIcon('version')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, { width: columnWidths.notes || 200 }]}
        onPress={() => handleSort('notes')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>Notes</Text>
        {renderSortIcon('notes')}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.headerCell, { width: columnWidths.date || 120 }]}
        onPress={() => handleSort('date')}
      >
        <Text style={[styles.headerText, { color: colors.mainFont }]}>Date</Text>
        {renderSortIcon('date')}
      </TouchableOpacity>
    </View>
  );

  const renderFeedbackRow = ({ item, index }: { item: Feedback; index: number }) => {
    const isExpanded = expandedId === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.tableRow,
          { backgroundColor: index % 2 === 0 ? colors.background : (colorScheme === 'dark' ? '#2a2a2a' : '#f9f9f9'), borderColor: colors.border }
        ]}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <TouchableOpacity 
          style={[styles.cell, { width: columnWidths.id || 100 }]}
          onPress={() => handleCellPress(item.id, 'ID')}
        >
          <Text style={[styles.cellText, styles.idText, { color: colors.secondaryFont }]} numberOfLines={1}>
            {item.id.substring(0, 8)}...
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.cell, { width: columnWidths.username || 120 }]}
          onPress={() => handleCellPress(item.username || 'Anonymous', 'Username')}
        >
          <Text style={[styles.cellText, { color: colors.mainFont }]} numberOfLines={2}>
            {item.username || 'Anonymous'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.cell, { width: columnWidths.guc_id || 100 }]}
          onPress={() => handleCellPress(item.guc_id || 'N/A', 'GUC ID')}
        >
          <Text style={[styles.cellText, { color: colors.mainFont }]} numberOfLines={1}>
            {item.guc_id || 'N/A'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.cell, { width: columnWidths.joined_season || 80 }]}
          onPress={() => handleCellPress(item.joined_season?.toString() || 'N/A', 'Season')}
        >
          <Text style={[styles.cellText, { color: colors.mainFont }]}>
            {item.joined_season || 'N/A'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.cell, { width: columnWidths.version || 120 }]}
          onPress={() => handleCellPress(item.version || 'N/A', 'Version')}
        >
          <Text style={[styles.cellText, { color: colors.mainFont }]}>
            {item.version || 'N/A'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.cell, { width: columnWidths.notes || 200 }]}
          onPress={() => handleCellPress(item.notes || 'No notes', 'Notes')}
        >
          <Text style={[styles.cellText, { color: colors.mainFont }]} numberOfLines={isExpanded ? undefined : 3}>
            {item.notes || 'No notes'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.cell, { width: columnWidths.date || 120 }]}
          onPress={() => handleCellPress(formatDate(item.date), 'Date')}
        >
          <Text style={[styles.cellText, styles.dateText, { color: colors.secondaryFont }]} numberOfLines={2}>
            {formatDate(item.date)}
          </Text>
        </TouchableOpacity>
        <View style={styles.expandIndicator}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.secondaryFont}
          />
        </View>
      </TouchableOpacity>
    );
  };

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
          <TouchableOpacity
            onPress={fetchFeedback}
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
            {filteredAndSortedFeedback.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={48} color={colors.secondaryFont} />
                <Text style={[styles.emptyText, { color: colors.secondaryFont }]}>
                  No feedback found
                </Text>
              </View>
            ) : (
              filteredAndSortedFeedback.map((item, index) => (
                <View key={item.id}>
                  {renderFeedbackRow({ item, index })}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Cell Content Modal */}
      <Modal
        visible={selectedCell !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedCell(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.mainFont }]}>
                {selectedCell?.title}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedCell(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.mainFont} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.modalText, { color: colors.mainFont }]}>
                {selectedCell?.content}
              </Text>
            </ScrollView>
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
    flex: 1,
    minWidth: '100%',
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
    minHeight: 70,
  },
  cell: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idCell: {
    flex: 1,
    minWidth: 80,
  },
  usernameCell: {
    flex: 1.5,
    minWidth: 100,
  },
  gucIdCell: {
    flex: 1,
    minWidth: 80,
  },
  seasonCell: {
    flex: 1,
    minWidth: 80,
  },
  versionCell: {
    flex: 3,
    minWidth: 200,
  },
  notesCell: {
    flex: 2,
    minWidth: 120,
  },
  dateCell: {
    flex: 1,
    minWidth: 80,
  },
  cellText: {
    fontSize: 12,
    textAlign: 'center',
  },
  idText: {
    fontSize: 10,
  },
  dateText: {
    fontSize: 10,
  },
  expandIndicator: {
    position: 'absolute',
    right: 4,
    top: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 10,
    padding: 2,
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
    width: 220,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
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
    padding: 16,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
  },
});

