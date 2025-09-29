import { Colors, ScheduleTypeColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScheduleOption, ScheduleType } from './types';

// Memoized option item component for better performance
const OptionItem = memo(({ 
  option, 
  isSelected, 
  isFirst, 
  isLast, 
  onPress, 
  colors, 
  typeColor, 
  type
}: {
  option: ScheduleOption;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onPress: () => void;
  colors: any;
  typeColor: string;
  type: ScheduleType;
}) => (
  <TouchableOpacity
    style={[
      styles.optionItem,
      {
        backgroundColor: isSelected ? typeColor + '20' : 'transparent',
        borderBottomColor: colors.border,
      }
    ]}
    onPress={onPress}
  >
    <View style={styles.optionContent}>
      <Text style={[styles.optionName, { color: colors.mainFont }]}>
        {option.name}
      </Text>
      {/* Only show department for types other than staff and course */}
      {type !== 'staff' && type !== 'course' && option.department && (
        <Text style={[styles.optionDepartment, { color: colors.secondaryFont }]}>
          {option.department}
        </Text>
      )}
      {type !== 'staff' && type !== 'course' && option.additionalInfo && (
        <Text style={[styles.optionAdditionalInfo, { color: colors.secondaryFont }]}>
          {option.additionalInfo}
        </Text>
      )}
    </View>
    <Ionicons
      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
      size={22}
      color={isSelected ? typeColor : colors.secondaryFont}
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
  const [buttonLayout, setButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [visibleItemsCount, setVisibleItemsCount] = useState(50); // Start with 50 items
  const typeColor = ScheduleTypeColors[type];
  const screenWidth = Dimensions.get('window').width;
  const buttonRef = useRef<any>(null);

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

  // Highlighting removed for maximum performance

  // Optimized search handler
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    // For very large lists, we could add a small delay here
    // but for most use cases, immediate filtering is better
  }, []);

  const handleButtonPress = useCallback(() => {
    if (buttonRef.current) {
      buttonRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        setButtonLayout({ x, y, width, height });
        setSearchQuery(''); // Clear search when opening modal
        setVisibleItemsCount(50); // Reset to initial batch size
        setModalVisible(true);
      });
    }
  }, []);

  if (type === 'personal') {
    return null; // Personal schedule doesn't need a selector
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        ref={buttonRef}
        style={[
          styles.selectorButton,
          {
            backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3',
            borderColor: colors.border,
          },
        ]}
        onPress={handleButtonPress}
        disabled={loading}
      >
        <View style={styles.selectorContent}>
          {/* <Text style={[styles.selectorIcon, { color: typeColor }]}>
            {type === 'staff' ? '👨‍🏫' : type === 'course' ? '📚' : '👥'}
          </Text> */}
          <View style={styles.selectorTextContainer}>
            {/* <Text style={[styles.selectorLabel, { color: colors.secondaryFont }]}>
              {type === 'staff' ? 'Select Staff Member' : 
               type === 'course' ? 'Select Course' : 'Select Group'}
            </Text> */}
            <Text 
              style={[styles.selectorValue, { color: colors.mainFont }]}
              numberOfLines={1}
            >
              {loading ? 'Loading...' : selectedOption?.name || placeholder}
            </Text>
          </View>
          <Ionicons
            name={modalVisible ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.secondaryFont}
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={[
            styles.dropdownContent,
            { 
              backgroundColor: colors.cardBackground,
              top: buttonLayout.y + buttonLayout.height + 8,
              left: buttonLayout.x,
              width: buttonLayout.width || screenWidth - 32,
              shadowColor: colorScheme === 'dark' ? '#000' : '#000',
            }
          ]}>
            {/* Search Input */}
                    <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
                      <Ionicons
                        name="search"
                        size={20}
                        color={colors.secondaryFont}
                        style={styles.searchIcon}
                      />
                      <TextInput
                        style={[styles.searchInput, {
                          color: colors.text,
                          backgroundColor: colors.background,
                          borderColor: colors.border
                        }]}
                        placeholder={`Search ${type === 'staff' ? 'staff members' : type === 'course' ? 'courses' : 'groups'}...`}
                        placeholderTextColor={colors.secondaryFont}
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                        autoCorrect={false}
                        autoCapitalize="none"
                        returnKeyType="search"
                        clearButtonMode="never"
                        enablesReturnKeyAutomatically={false}
                        autoFocus={true}
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setSearchQuery('')}
                          style={styles.clearButton}
                        >
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color={colors.secondaryFont}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
            
            {/* Results count and search status */}
            {searchQuery.length > 0 && (
              <View style={[styles.resultsCountContainer, { borderBottomColor: colors.border }]}>
                <Text style={[styles.resultsCountText, { color: colors.secondaryFont }]}>
                  {paginatedOptions.length} of {filteredOptions.length} {type === 'staff' ? 'staff members' : type === 'course' ? 'courses' : 'groups'} shown
                  {filteredOptions.length > 0 && (
                    <Text style={{ color: typeColor, fontWeight: '600' }}> • Found</Text>
                  )}
                  {visibleItemsCount < filteredOptions.length && (
                    <Text style={{ color: colors.secondaryFont, fontSize: 11 }}> • Scroll for more</Text>
                  )}
                </Text>
              </View>
            )}
            
            <FlatList
              data={paginatedOptions}
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              keyExtractor={(item) => item.id}
              renderItem={({ item: option, index }) => {
                const isSelected = selectedIds.has(option.id);
                const isFirst = index === 0;
                const isLast = index === paginatedOptions.length - 1;
                
                return (
                  <OptionItem
                    key={option.id}
                    option={option}
                    isSelected={isSelected}
                    isFirst={isFirst}
                    isLast={isLast}
                    onPress={() => handleSelection(option.id)}
                    colors={colors}
                    typeColor={typeColor}
                    type={type}
                  />
                );
              }}
            />
            {/* Footer actions */}
            <View style={[styles.footerActions, { borderTopColor: colors.border }]}> 
              <TouchableOpacity style={[styles.footerButton, { borderColor: colors.border }]} onPress={handleClear}>
                <Text style={[styles.footerButtonText, { color: colors.secondaryFont }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.footerButtonPrimary, { backgroundColor: typeColor }]} onPress={handleApply}>
                <Text style={[styles.footerButtonPrimaryText, { color: '#fff' }]}>Apply</Text>
              </TouchableOpacity>
            </View>
            {filteredOptions.length === 0 && (
              <View style={styles.noResultsContainer}>
                <Text style={[styles.noResultsText, { color: colors.secondaryFont }]}>
                  No {type === 'staff' ? 'staff members' : type === 'course' ? 'courses' : 'groups'} found
                </Text>
                {/* <Text style={[styles.noResultsSubtext, { color: colors.secondaryFont }]}>
                  Try adjusting your search
                </Text> */}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  selectorButton: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdownContent: {
    position: 'absolute',
    maxHeight: 400,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 43,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  resultsCountContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
  },
  optionsList: {
    maxHeight: 320,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Added to space out content and checkmark
    padding: 12,
    borderBottomWidth: 1,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDepartment: {
    fontSize: 14,
    marginBottom: 2,
  },
  optionAdditionalInfo: {
    fontSize: 12,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerButtonPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  footerButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
