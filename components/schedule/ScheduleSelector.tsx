import BottomSheet from '@/components/ui/BottomSheet';
import { DropdownTrigger, SheetHeader } from '@/components/ui/Dropdown';
import { Colors } from '@/constants/Colors';
import { Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScheduleOption, ScheduleType } from './types';

// Memoized option item component for better performance
const OptionItem = memo(({
  option,
  isSelected,
  onPress,
  colors,
  type
}: {
  option: ScheduleOption;
  isSelected: boolean;
  onPress: () => void;
  colors: typeof Colors.light;
  type: ScheduleType;
}) => (
  <TouchableOpacity
    style={[styles.optionItem, { backgroundColor: isSelected ? colors.primarySoft : 'transparent' }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.optionContent}>
      <Text style={[styles.optionName, { color: isSelected ? colors.primary : colors.textPrimary }]}>
        {option.name}
      </Text>
      {/* Only show department for types other than staff and course */}
      {type !== 'staff' && type !== 'course' && option.department && (
        <Text style={[styles.optionDepartment, { color: colors.textSecondary }]}>
          {option.department}
        </Text>
      )}
      {type !== 'staff' && type !== 'course' && option.additionalInfo && (
        <Text style={[styles.optionAdditionalInfo, { color: colors.textSecondary }]}>
          {option.additionalInfo}
        </Text>
      )}
    </View>
    <Ionicons
      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
      size={22}
      color={isSelected ? colors.primary : colors.textTertiary}
    />
  </TouchableOpacity>
));

OptionItem.displayName = 'OptionItem';

interface ScheduleSelectorProps {
  type: ScheduleType;
  options: ScheduleOption[];
  selectedValue: string;
  onSelectionChange: (values: string[]) => void;
  placeholder: string;
  loading?: boolean;
}

export function ScheduleSelector({
  type,
  options,
  selectedValue,
  onSelectionChange,
  placeholder,
  loading = false
}: ScheduleSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [visibleItemsCount, setVisibleItemsCount] = useState(50); // Start with 50 items

  const selectedOption = options.find(option => option.id === selectedValue);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(selectedValue ? [selectedValue] : [])
  );
  const lastSelectedIdRef = useRef<string | null>(selectedValue || null);

  // Keep local multi-select state in sync when the externally selected value changes
  useEffect(() => {
    if (selectedValue) {
      setSelectedIds((prev) => {
        if (prev.has(selectedValue)) return prev;
        const next = new Set(prev);
        next.add(selectedValue);
        return next;
      });
    }
  }, [selectedValue]);

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setVisibleItemsCount(50); // Reset pagination when search changes
    }, 150); // 150ms delay for better performance

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Simplified one-to-one search for maximum performance
  const filteredOptions = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return options;
    }

    const query = debouncedSearchQuery.toLowerCase().trim();

    return options.filter(option => {
      const name = option.name.toLowerCase();

      // Simple one-to-one string matching - fastest possible search
      return name.includes(query);
    });
  }, [options, debouncedSearchQuery]);

  // Sort selected items to the top while preserving relative order otherwise
  const selectedFirstOptions = useMemo(() => {
    if (selectedIds.size === 0) return filteredOptions;
    const withIndex = filteredOptions.map((opt, idx) => ({ opt, idx }));
    withIndex.sort((a, b) => {
      const aSel = selectedIds.has(a.opt.id) ? 1 : 0;
      const bSel = selectedIds.has(b.opt.id) ? 1 : 0;
      if (aSel !== bSel) return bSel - aSel; // selected first
      return a.idx - b.idx; // stable among same group
    });
    return withIndex.map(({ opt }) => opt);
  }, [filteredOptions, selectedIds]);

  // Paginated options - only show visible items for performance
  const paginatedOptions = useMemo(() => {
    return selectedFirstOptions.slice(0, visibleItemsCount);
  }, [selectedFirstOptions, visibleItemsCount]);

  const handleSelection = (optionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
        lastSelectedIdRef.current = optionId;
      }
      return next;
    });
  };

  const handleApply = () => {
    // Defer fetching until user confirms
    const toSubmit = Array.from(selectedIds);
    if (toSubmit.length > 0) {
      onSelectionChange(toSubmit);
    }
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
  };

  // Load more items when scrolling reaches the end
  const handleLoadMore = useCallback(() => {
    if (visibleItemsCount < filteredOptions.length) {
      setVisibleItemsCount(prev => Math.min(prev + 50, filteredOptions.length));
    }
  }, [visibleItemsCount, filteredOptions.length]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleButtonPress = useCallback(() => {
    setSearchQuery(''); // Clear search when opening
    setVisibleItemsCount(50); // Reset to initial batch size
    setModalVisible(true);
  }, []);

  if (type === 'personal') {
    return null; // Personal schedule doesn't need a selector
  }

  const noun = type === 'staff' ? 'staff members' : type === 'course' ? 'courses' : 'groups';

  return (
    <View style={styles.container}>
      <DropdownTrigger
        colors={colors}
        caption={type === 'staff' ? 'Staff member' : 'Course'}
        icon={type === 'staff' ? 'person-outline' : 'book-outline'}
        label={loading ? 'Loading...' : selectedOption?.name || placeholder}
        placeholder={!selectedOption && !loading}
        onPress={handleButtonPress}
        disabled={loading}
      />

      <BottomSheet
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        heightRatio={0.85}
        onEndReached={handleLoadMore}
        header={
          <SheetHeader
            colors={colors}
            title={type === 'staff' ? 'Choose staff' : 'Choose courses'}
            subtitle={
              selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : searchQuery.length > 0
                  ? `${filteredOptions.length} ${noun} found`
                  : 'Select one or more to combine'
            }
            right={
              <View style={styles.headerActions}>
                {selectedIds.size > 0 && (
                  <TouchableOpacity onPress={handleClear} style={styles.headerTextButton} hitSlop={8}>
                    <Text style={[styles.headerTextButtonLabel, { color: colors.textSecondary }]}>Clear</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: colors.primary, opacity: selectedIds.size ? 1 : 0.5 }]}
                  onPress={handleApply}
                  disabled={selectedIds.size === 0}
                >
                  <Text style={[styles.applyButtonText, { color: colors.onPrimary }]}>Apply</Text>
                </TouchableOpacity>
              </View>
            }
          >
            <View style={[styles.searchContainer, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder={`Search ${noun}...`}
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="never"
                enablesReturnKeyAutomatically={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </SheetHeader>
        }
      >
        <View style={styles.optionsList}>
          {paginatedOptions.map((option) => (
            <OptionItem
              key={option.id}
              option={option}
              isSelected={selectedIds.has(option.id)}
              onPress={() => handleSelection(option.id)}
              colors={colors}
              type={type}
            />
          ))}
          {filteredOptions.length === 0 && (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={28} color={colors.textTertiary} />
              <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>No {noun} found</Text>
            </View>
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerTextButton: {
    paddingVertical: Spacing.xs,
  },
  headerTextButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  applyButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 46,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  noResultsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  noResultsText: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionsList: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: 2,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 52,
    borderRadius: Radius.md,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDepartment: {
    fontSize: 14,
    marginTop: 2,
  },
  optionAdditionalInfo: {
    fontSize: 12,
    marginTop: 2,
  },
});
