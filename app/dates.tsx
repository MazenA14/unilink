import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { SegmentOption, SegmentedControl } from '@/components/ui/SegmentedControl';
import { SheetButtons } from '@/components/ui/SheetButtons';
import { useCustomAlert } from '@/components/CustomAlert';
import { AppBar } from '@/components/navigation/AppBar';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing, Type, withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';

interface DateItem {
  id: string;
  date: string;
  title: string;
  description: string;
  location: string;
  type: 'quiz' | 'assignment' | 'project' | 'exam' | 'other';
}

type DateType = DateItem['type'];
type ThemeColors = (typeof Colors)['light'];
type IconName = ComponentProps<typeof Ionicons>['name'];
type Tab = 'upcoming' | 'past';

const TYPES: DateType[] = ['quiz', 'assignment', 'project', 'exam', 'other'];

const typeIcons: Record<DateType, IconName> = {
  quiz: 'clipboard',
  assignment: 'document-text',
  project: 'folder',
  exam: 'school',
  other: 'calendar',
};

function typeColor(type: DateType, colors: ThemeColors): string {
  switch (type) {
    case 'quiz': return colors.secondary;
    case 'assignment': return colors.success;
    case 'project': return colors.warning;
    case 'exam': return colors.tint;
    default: return colors.cms;
  }
}

const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 24 * 60 * 60 * 1000;

// Dates are stored as "YYYY-MM-DD" and must be read as local days —
// `new Date("YYYY-MM-DD")` is UTC and can land on the previous day.
function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const fallback = new Date(value);
  fallback.setHours(0, 0, 0, 0);
  return fallback;
}

function toLocalDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function daysFromToday(value: string): number {
  return Math.round((parseLocalDate(value).getTime() - startOfToday().getTime()) / DAY_MS);
}

function relativeLabel(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1) return days < 14 ? `In ${days} days` : `In ${Math.round(days / 7)} weeks`;
  const ago = -days;
  return ago < 14 ? `${ago} days ago` : `${Math.round(ago / 7)} weeks ago`;
}

function formatLongDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const EMPTY_FORM = {
  date: '',
  title: '',
  description: '',
  location: '',
  type: 'quiz' as DateType,
};

export default function DatesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();
  const [dates, setDates] = useState<DateItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<DateItem | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState(EMPTY_FORM);

  const openModal = () => setModalVisible(true);
  const closeModal = () => {
    setModalVisible(false);
    setShowDatePicker(false);
  };

  // Load dates from storage on component mount
  useEffect(() => {
    loadDates();
  }, []);

  const loadDates = async () => {
    try {
      const stored = await import('@react-native-async-storage/async-storage').then(
        (AsyncStorage) => AsyncStorage.default.getItem('dates')
      );
      if (stored) {
        setDates(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Error loading dates:', error);
    }
  };

  const saveDates = async (newDates: DateItem[]) => {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem('dates', JSON.stringify(newDates));
      setDates(newDates);
    } catch (error) {
      console.log('Error saving dates:', error);
    }
  };

  const setFormDate = (date: Date) => {
    setSelectedDate(date);
    setFormData(prev => ({ ...prev, date: toLocalDateString(date) }));
  };

  const handleDateChange = (event: any, picked?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event?.type === 'dismissed' || !picked) return;
    setFormDate(picked);
  };

  const quickDate = (offsetDays: number) => {
    const date = startOfToday();
    date.setDate(date.getDate() + offsetDays);
    setFormDate(date);
    setShowDatePicker(false);
  };

  const handleAddDate = () => {
    if (!formData.date || !formData.title.trim()) return;

    const newDate: DateItem = {
      id: editingItem?.id || Date.now().toString(),
      date: formData.date,
      title: formData.title.trim(),
      description: formData.description.trim(),
      location: formData.location.trim(),
      type: formData.type,
    };

    const updatedDates = editingItem
      ? dates.map(item => (item.id === editingItem.id ? newDate : item))
      : [...dates, newDate];

    // Sort dates by date
    updatedDates.sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

    saveDates(updatedDates);
    resetForm();
    closeModal();
  };

  const handleDeleteDate = (id: string) => {
    showAlert({
      title: 'Delete Date',
      message: 'Are you sure you want to delete this date?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            saveDates(dates.filter(item => item.id !== id));
            closeModal();
            resetForm();
          },
        },
      ],
    });
  };

  const handleDeleteAll = () => {
    showAlert({
      title: 'Delete All Dates',
      message: `Are you sure you want to delete all ${dates.length} date(s)? This action cannot be undone.`,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => saveDates([]),
        },
      ],
    });
  };

  const handleClearPast = () => {
    const pastCount = dates.filter(d => daysFromToday(d.date) < 0).length;
    showAlert({
      title: 'Clear Past Dates',
      message: `Remove ${pastCount} past date${pastCount === 1 ? '' : 's'}? Upcoming dates are kept.`,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => saveDates(dates.filter(d => daysFromToday(d.date) >= 0)),
        },
      ],
    });
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setSelectedDate(new Date());
    setEditingItem(null);
  };

  const handleOpenModal = () => {
    resetForm();
    openModal();
  };

  const handleEditDate = (item: DateItem) => {
    setEditingItem(item);
    setSelectedDate(parseLocalDate(item.date));
    setFormData({
      date: item.date,
      title: item.title,
      description: item.description,
      location: item.location,
      type: item.type,
    });
    openModal();
  };

  // Upcoming grouped by how soon; past shown most recent first
  const { sections, upcomingCount, pastCount } = useMemo(() => {
    const withDays = dates.map(item => ({ item, days: daysFromToday(item.date) }));
    const upcoming = withDays.filter(d => d.days >= 0).sort((a, b) => a.days - b.days);
    const past = withDays.filter(d => d.days < 0).sort((a, b) => b.days - a.days);

    const groups: { title: string; data: typeof withDays }[] = [];
    if (activeTab === 'upcoming') {
      const bucket = (days: number) =>
        days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days <= 7 ? 'This week' : 'Later';
      for (const entry of upcoming) {
        const title = bucket(entry.days);
        const last = groups[groups.length - 1];
        if (last?.title === title) last.data.push(entry);
        else groups.push({ title, data: [entry] });
      }
    } else if (past.length > 0) {
      groups.push({ title: 'Past', data: past });
    }
    return { sections: groups, upcomingCount: upcoming.length, pastCount: past.length };
  }, [dates, activeTab]);

  const tabOptions: SegmentOption<Tab>[] = [
    { value: 'upcoming', label: `Upcoming${upcomingCount ? ` · ${upcomingCount}` : ''}`, icon: 'time-outline' },
    { value: 'past', label: `Past${pastCount ? ` · ${pastCount}` : ''}`, icon: 'checkmark-done' },
  ];

  const renderDateCard = ({ item, days }: { item: DateItem; days: number }) => {
    const accent = typeColor(item.type, colors);
    const date = parseLocalDate(item.date);
    const isPast = days < 0;
    const soon = days >= 0 && days <= 1;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.card,
          { backgroundColor: colors.surfaceElevated, borderColor: soon ? withAlpha(accent, 0.45) : colors.border },
          soon ? Shadow.card(colors) : Shadow.xs(colors),
          isPast && styles.cardPast,
        ]}
        onPress={() => handleEditDate(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.dateBlock, { backgroundColor: withAlpha(accent, 0.12) }]}>
          <Text style={[styles.dateMonth, { color: accent }]}>{MONTHS_SHORT[date.getMonth()]}</Text>
          <Text style={[styles.dateDay, { color: accent }]}>{date.getDate()}</Text>
          <Text style={[styles.dateWeekday, { color: accent }]}>{WEEKDAYS_SHORT[date.getDay()]}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {item.title}
            </Text>
            <View
              style={[
                styles.relativeChip,
                { backgroundColor: soon ? accent : colors.surface },
              ]}
            >
              <Text style={[styles.relativeText, { color: soon ? colors.onAccent : colors.textSecondary }]}>
                {relativeLabel(days)}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.typeChip, { backgroundColor: withAlpha(accent, 0.14) }]}>
              <Ionicons name={typeIcons[item.type]} size={11} color={accent} />
              <Text style={[styles.typeChipText, { color: accent }]}>{capitalize(item.type)}</Text>
            </View>
            {!!item.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            )}
          </View>

          {!!item.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    const noneAtAll = dates.length === 0;
    return (
      <View style={styles.centerState}>
        <View style={[styles.stateIcon, { backgroundColor: withAlpha(colors.tint, 0.1) }]}>
          <Ionicons
            name={noneAtAll ? 'calendar-number-outline' : activeTab === 'upcoming' ? 'sunny-outline' : 'archive-outline'}
            size={30}
            color={colors.tint}
          />
        </View>
        <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
          {noneAtAll ? 'No dates yet' : activeTab === 'upcoming' ? 'Nothing coming up' : 'No past dates'}
        </Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          {noneAtAll
            ? 'Keep track of quizzes, assignments, projects and exams in one place.'
            : activeTab === 'upcoming'
              ? 'You’re all clear. Add a date when something new comes up.'
              : 'Dates you’ve passed will show up here.'}
        </Text>
        {(noneAtAll || activeTab === 'upcoming') && (
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.tint }, Shadow.glow(colors.tint)]}
            onPress={handleOpenModal}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={colors.onPrimary} />
            <Text style={[styles.ctaText, { color: colors.onPrimary }]}>Add a date</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const canSave = !!formData.date && !!formData.title.trim();
  const formDays = formData.date ? daysFromToday(formData.date) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppBar
        title="Important Dates"
        rightActions={
          <>
            {dates.length > 0 && (
              <TouchableOpacity
                style={[styles.headerIconButton, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.xs(colors)]}
                onPress={handleDeleteAll}
                accessibilityLabel="Delete all dates"
              >
                <Ionicons name="trash-outline" size={19} color={colors.danger} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: colors.tint, borderColor: colors.tint }, Shadow.glow(colors.tint)]}
              onPress={handleOpenModal}
              accessibilityLabel="Add date"
            >
              <Ionicons name="add" size={24} color={colors.onPrimary} />
            </TouchableOpacity>
          </>
        }
      />

      {dates.length > 0 && (
        <View style={styles.controls}>
          <SegmentedControl options={tabOptions} value={activeTab} onChange={setActiveTab} />
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {sections.length === 0
          ? renderEmpty()
          : sections.map(section => (
              <View key={section.title}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>{section.title}</Text>
                  {activeTab === 'past' && (
                    <TouchableOpacity onPress={handleClearPast} hitSlop={8}>
                      <Text style={[styles.clearPast, { color: colors.danger }]}>Clear past</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {section.data.map(renderDateCard)}
              </View>
            ))}
      </ScrollView>

      {/* Add/Edit Modal */}
      <BottomSheet
        visible={modalVisible}
        onRequestClose={closeModal}
        heightRatio={0.9}
        header={<SheetHeader colors={colors} title={editingItem ? 'Edit Date' : 'New Date'} />}
        footer={
          <SheetButtons
            secondary={{ label: 'Cancel', onPress: closeModal }}
            primary={{ label: editingItem ? 'Save' : 'Add', icon: 'checkmark', onPress: handleAddDate, disabled: !canSave }}
          />
        }
      >
        <View style={styles.modalContent}>
          {/* Title */}
          <TextInput
            style={[styles.titleInput, { backgroundColor: colors.surface, color: colors.textPrimary }]}
            value={formData.title}
            onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            placeholder="What's due? e.g. CSEN 401 Quiz 2"
            placeholderTextColor={colors.textTertiary}
          />

          {/* Type */}
          <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Type</Text>
          <View style={styles.typeGrid}>
            {TYPES.map(type => {
              const active = formData.type === type;
              const accent = typeColor(type, colors);
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeTile,
                    {
                      backgroundColor: active ? withAlpha(accent, 0.14) : colors.surface,
                      borderColor: active ? accent : 'transparent',
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, type }))}
                  activeOpacity={0.7}
                >
                  <Ionicons name={typeIcons[type]} size={20} color={active ? accent : colors.textSecondary} />
                  <Text
                    style={[styles.typeTileText, { color: active ? accent : colors.textSecondary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {capitalize(type)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date */}
          <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Date</Text>
          <TouchableOpacity
            style={[styles.fieldRow, { backgroundColor: colors.surface }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.fieldIcon, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
              <Ionicons name="calendar" size={16} color={colors.tint} />
            </View>
            <Text style={[styles.fieldValue, { color: formData.date ? colors.textPrimary : colors.textTertiary }]}>
              {formData.date ? formatLongDate(formData.date) : 'Pick a date'}
            </Text>
            {formDays !== null && (
              <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>{relativeLabel(formDays)}</Text>
            )}
          </TouchableOpacity>
          <View style={styles.quickRow}>
            {[
              { label: 'Today', offset: 0 },
              { label: 'Tomorrow', offset: 1 },
              { label: 'In a week', offset: 7 },
            ].map(({ label, offset }) => {
              const active = formDays === offset;
              return (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.quickChip,
                    { backgroundColor: active ? colors.tint : colors.surface },
                  ]}
                  onPress={() => quickDate(offset)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickChipText, { color: active ? colors.onPrimary : colors.textSecondary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}

          {/* Location */}
          <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Location</Text>
          <View style={[styles.fieldRow, { backgroundColor: colors.surface }]}>
            <View style={[styles.fieldIcon, { backgroundColor: withAlpha(colors.secondary, 0.12) }]}>
              <Ionicons name="location" size={16} color={colors.secondary} />
            </View>
            <TextInput
              style={[styles.fieldInput, { color: colors.textPrimary }]}
              value={formData.location}
              onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
              placeholder="Optional — hall, room, or online"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Notes */}
          <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Notes</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary }]}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Optional — topics, chapters, submission link…"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {editingItem && (
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: withAlpha(colors.danger, 0.1) }]}
              onPress={() => handleDeleteDate(editingItem.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={[styles.deleteText, { color: colors.danger }]}>Delete this date</Text>
            </TouchableOpacity>
          )}
        </View>
      </BottomSheet>

      {/* Custom Alert */}
      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  // Sections
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    marginHorizontal: Spacing.xs,
  },
  sectionHeader: {
    ...Type.overline,
  },
  clearPast: {
    ...Type.caption,
  },
  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md + 2,
    padding: 14,
    marginTop: Spacing.sm + 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  cardPast: {
    opacity: 0.65,
  },
  dateBlock: {
    width: 54,
    height: 62,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  dateWeekday: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.8,
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  cardTitle: {
    ...Type.body,
    flex: 1,
    fontWeight: '700',
    lineHeight: 20,
  },
  relativeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  relativeText: {
    ...Type.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  typeChipText: {
    ...Type.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  locationText: {
    ...Type.subtext,
    flexShrink: 1,
  },
  description: {
    ...Type.subtext,
    lineHeight: 18,
  },
  // Empty
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.huge,
  },
  stateIcon: {
    width: 68,
    height: 68,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  stateTitle: {
    ...Type.h3,
    marginBottom: Spacing.xs + 2,
    textAlign: 'center',
  },
  stateText: {
    ...Type.subtext,
    textAlign: 'center',
    lineHeight: 19,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  ctaText: {
    ...Type.callout,
  },
  // Form
  modalContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  titleInput: {
    ...Type.h3,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  fieldLabel: {
    ...Type.overline,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeTile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.md,
    paddingHorizontal: 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  typeTileText: {
    ...Type.caption,
    fontSize: 11,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  fieldIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldValue: {
    ...Type.body,
    flex: 1,
  },
  fieldHint: {
    ...Type.caption,
  },
  fieldInput: {
    ...Type.body,
    flex: 1,
    paddingVertical: 14,
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
  },
  quickChipText: {
    ...Type.caption,
  },
  textArea: {
    ...Type.body,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 100,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  deleteText: {
    ...Type.callout,
  },
});
