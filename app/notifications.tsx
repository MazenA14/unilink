import { AppBar } from '@/components/navigation/AppBar';
import BottomSheet from '@/components/ui/BottomSheet';
import LinkifiedText from '@/components/ui/LinkifiedText';
import { Colors } from '@/constants/Colors';
import { Radius } from '@/constants/Theme';
import { useNotifications } from '@/contexts/NotificationContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatRelativeDay } from '@/utils/formatRelativeTime';
import { Notification } from '@/utils/types/notificationTypes';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import ReanimatedSwipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

function formatDate(dateString: string) {
  try {
    // Handle M/D/YYYY format (e.g., "6/12/2025")
    const dateMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    let date: Date;
    
    if (dateMatch) {
      const [, month, day, year] = dateMatch;
      // Create date with explicit month/day/year (month is 0-indexed in Date constructor)
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      // Fallback to default Date parsing
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original string if invalid
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function notificationToText(n: Notification) {
  return [n.title, n.body, n.staff ? `— ${n.staff}, ${formatDate(n.date)}` : formatDate(n.date)]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Copies to the clipboard. expo-clipboard is a native module, so builds that
 * predate it fall back to the share sheet (which also offers "Copy").
 */
async function copyToClipboard(text: string): Promise<'copied' | 'shared' | 'failed'> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy so older native builds can fall back
    const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return 'copied';
  } catch {
    try {
      await Share.share({ message: text });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
}

interface SwipeableRowProps {
  isRead: boolean;
  onToggleRead: () => void;
  children: React.ReactNode;
}

/** Swiping a card either way toggles its read state, then springs back. */
function SwipeableNotificationRow({ isRead, onToggleRead, children }: SwipeableRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const ref = useRef<SwipeableMethods>(null);
  const accent = isRead ? colors.tint : colors.gradeGood;

  const renderAction = (align: 'left' | 'right') => (
    <View
      style={[
        styles.swipeAction,
        { backgroundColor: accent + '22', justifyContent: align === 'left' ? 'flex-start' : 'flex-end' },
      ]}
    >
      <View style={styles.swipeActionInner}>
        <Ionicons name={isRead ? 'mail-unread-outline' : 'mail-open-outline'} size={22} color={accent} />
        <Text style={[styles.swipeActionText, { color: accent }]}>{isRead ? 'Unread' : 'Read'}</Text>
      </View>
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={ref}
      containerStyle={styles.swipeContainer}
      friction={1.6}
      leftThreshold={70}
      rightThreshold={70}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => renderAction('left')}
      renderRightActions={() => renderAction('right')}
      onSwipeableWillOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      onSwipeableOpen={() => {
        onToggleRead();
        ref.current?.close();
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { 
    notifications,
    loading, 
    error, 
    unreadCount,
    fetchNotifications, 
    markAsRead,
    markAsUnread,
    markAllAsRead,
    refreshNotifications, 
    clearError
  } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Local search: every whitespace-separated word must appear somewhere in the notification
  const filteredNotifications = useMemo(() => {
    const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return notifications;
    return notifications.filter((n) => {
      const haystack = [n.title, n.body, n.staff, n.date, n.importance, formatDate(n.date), formatRelativeDay(n.date)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  }, [notifications, searchQuery]);

  // Highlight only single-word queries so multi-word searches don't look noisy
  const highlightTerm = searchQuery.trim().includes(' ') ? undefined : searchQuery.trim();

  const showToast = (message: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  };

  const handleCopy = async (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const result = await copyToClipboard(notificationToText(notification));
    if (result === 'copied') showToast('Notification copied');
    else if (result === 'failed') showToast('Could not copy notification');
  };

  const toggleRead = (notification: Notification) => {
    if (notification.isRead) markAsUnread(notification.id);
    else markAsRead(notification.id);
  };

  const onRefresh = async () => {
    await refreshNotifications();
  };


  // Sheet functions: the sheet animates itself in/out from `modalVisible`
  const openModal = (notification: Notification) => {
    setSelectedNotification(notification);
    setModalVisible(true);
    // Mark as read when opened
    markAsRead(notification.id);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  // Removed auto-fetch on entering the notifications page. Pull to refresh is still available.

  const getImportanceColor = (importance: string) => {
    switch (importance.toLowerCase()) {
      case 'high':
        return colors.gradeFailing;
      case 'medium':
        return colors.gradeAverage;
      case 'low':
        return colors.gradeGood;
      default:
        return colors.secondaryFont;
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <SwipeableNotificationRow isRead={item.isRead} onToggleRead={() => toggleRead(item)}>
    <Pressable
      // No opacity change on press: it made the card see-through when a swipe began.
      // The short press delay keeps the ripple from flashing at the start of a swipe.
      unstable_pressDelay={120}
      android_ripple={{ color: colors.tint + '1A' }}
      delayLongPress={350}
      onLongPress={() => handleCopy(item)}
      style={[
        styles.notificationCard,
        {
          backgroundColor: colors.cardBackground,
          borderColor: item.isRead ? colors.border : colors.tint + '30',
          borderLeftWidth: item.isRead ? 1 : 6,
          borderLeftColor: item.isRead ? colors.border : colors.tint,
        },
      ]}
      onPress={() => {
        // Open modal when tapped
        openModal(item);
      }}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationTitleContainer}>
          <Text
            style={[
              styles.notificationTitle,
              {
                color: colors.mainFont,
                fontWeight: item.isRead ? '500' : '700',
              },
            ]}
            numberOfLines={2}
          >
            {highlightTerm ? (
              <LinkifiedText highlight={highlightTerm}>{item.title}</LinkifiedText>
            ) : (
              item.title
            )}
          </Text>
          {!item.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />
          )}
        </View>
        <View style={styles.notificationMeta}>
          <Text style={[styles.notificationDate, { color: colors.secondaryFont }]}>
            {formatRelativeDay(item.date)}
          </Text>
          {item.importance && (
            <View
              style={[
                styles.importanceBadge,
                { backgroundColor: getImportanceColor(item.importance) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.importanceText,
                  { color: getImportanceColor(item.importance) },
                ]}
              >
                {item.importance}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.notificationContent}>
        <LinkifiedText
          style={[styles.notificationBody, { color: colors.secondaryFont }]}
          numberOfLines={3}
          highlight={highlightTerm}
        >
          {item.body}
        </LinkifiedText>
        <Text style={[styles.notificationStaff, { color: colors.secondaryFont }]}>
          From: {item.staff}
        </Text>
      </View>
    </Pressable>
    </SwipeableNotificationRow>
  );


  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppBar title="Notifications" showNotifications={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>
            Loading notifications...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppBar title="Notifications" showNotifications={false} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gradeFailing} />
          <Text style={[styles.errorText, { color: colors.mainFont }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              clearError();
              fetchNotifications();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppBar title="Notifications" showNotifications={false} />

      {unreadCount > 0 && (
        <View style={[styles.unreadBanner, { backgroundColor: colors.tint + '15' }]}>
          <View style={styles.unreadBannerLeft}>
            <Ionicons name="notifications" size={20} color={colors.tint} />
            <Text style={[styles.unreadText, { color: colors.tint }]}>
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.markAllButton, { backgroundColor: colors.gradeGood + '20' }]}
            onPress={markAllAsRead}
          >
            <Ionicons name="checkmark-done" size={16} color={colors.gradeGood} />
            <Text style={[styles.markAllText, { color: colors.gradeGood }]}>
              Mark All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {notifications.length > 0 && (
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notifications"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {notifications.length > 0 && !searchQuery.trim() && (
        <Text style={[styles.resultCount, { color: colors.textTertiary }]}>
          Swipe to mark read/unread · Long-press to copy
        </Text>
      )}

      {searchQuery.trim().length > 0 && (
        <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
          {filteredNotifications.length} result{filteredNotifications.length !== 1 ? 's' : ''}
        </Text>
      )}

      <FlatList
        data={filteredNotifications}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
        ListEmptyComponent={
          searchQuery.trim() ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={56} color={colors.secondaryFont} />
              <Text style={[styles.emptyText, { color: colors.secondaryFont }]}>No matches</Text>
              <Text style={[styles.emptySubtext, { color: colors.secondaryFont }]}>
                Nothing matches &quot;{searchQuery.trim()}&quot;
              </Text>
            </View>
          ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={64} color={colors.secondaryFont} />
            <Text style={[styles.emptyText, { color: colors.secondaryFont }]}>
              No notifications yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.secondaryFont }]}>
              You&apos;ll see important updates here
            </Text>
          </View>
          )
        }
      />

      {/* Notification Detail Sheet */}
      <BottomSheet
        visible={modalVisible}
        onRequestClose={closeModal}
        onDismissed={() => setSelectedNotification(null)}
        header={
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.headerContent}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Notification Details
                </Text>
                <View style={styles.modalHeaderActions}>
                  {selectedNotification && (
                    <TouchableOpacity
                      style={[styles.headerIconButton, { backgroundColor: colors.surfaceAlt }]}
                      onPress={() => handleCopy(selectedNotification)}
                      accessibilityLabel="Copy notification"
                      hitSlop={6}
                    >
                      <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                  {selectedNotification && (
                    <TouchableOpacity
                      style={[styles.headerIconButton, { backgroundColor: colors.surfaceAlt }]}
                      onPress={() => {
                        markAsUnread(selectedNotification.id);
                        closeModal();
                        showToast('Marked as unread');
                      }}
                      accessibilityLabel="Mark as unread"
                      hitSlop={6}
                    >
                      <Ionicons name="mail-unread-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
          </View>
        }
      >
            <View style={styles.modalContent}>
              {selectedNotification && (
                <>
                  {/* Title */}
                  <LinkifiedText
                    style={[styles.modalNotificationTitle, { color: colors.textPrimary }]}
                    selectable={true}
                  >
                    {selectedNotification.title}
                  </LinkifiedText>

                  {/* Meta Information */}
                  <View style={styles.modalMetaContainer}>
                    <View style={styles.modalMetaRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                        <Text
                          style={[styles.modalMetaText, { color: colors.textSecondary }]}
                          selectable={true}
                        >
                          {formatDate(selectedNotification.date)}
                          {/^(Today|Yesterday|Last week|\d+ days ago)$/.test(formatRelativeDay(selectedNotification.date))
                            ? `  ·  ${formatRelativeDay(selectedNotification.date)}`
                            : ''}
                        </Text>
                    </View>
                    
                    <View style={styles.modalMetaRow}>
                      <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                        <Text
                          style={[styles.modalMetaText, { color: colors.textSecondary }]}
                          selectable={true}
                        >
                          {selectedNotification.staff}
                        </Text>
                    </View>

                    {selectedNotification.importance && (
                      <View style={styles.modalMetaRow}>
                        <Ionicons name="flag-outline" size={16} color={colors.textSecondary} />
                        <View
                          style={[
                            styles.modalImportanceBadge,
                            { backgroundColor: getImportanceColor(selectedNotification.importance) + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.modalImportanceText,
                              { color: getImportanceColor(selectedNotification.importance) },
                            ]}
                            selectable={true}
                          >
                            {`${selectedNotification.importance} Priority`}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Body Content */}
                  <View style={[styles.modalBodyContainer, { borderTopColor: colors.border }]}>
                      <LinkifiedText
                        style={[styles.modalBodyText, { color: colors.textPrimary }]}
                        selectable={true}
                      >
                        {selectedNotification.body}
                      </LinkifiedText>
                  </View>
                </>
              )}
            </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  unreadBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unreadText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 11,
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  swipeContainer: {
    marginBottom: 12,
    borderRadius: 16,
  },
  swipeAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 24,
  },
  swipeActionInner: {
    alignItems: 'center',
    gap: 4,
  },
  swipeActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  notificationCard: {
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notificationHeader: {
    marginBottom: 12,
  },
  notificationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  importanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  importanceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  notificationContent: {
    marginTop: 4,
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  notificationStaff: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
  },
  // Detail sheet styles
  modalHeader: {
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 20,
  },
  modalNotificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    top: 10,
    marginBottom: 25,
  },
  modalMetaContainer: {
    marginBottom: 8,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalMetaText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  modalImportanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  modalImportanceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBodyContainer: {
    paddingTop: 20,
    borderTopWidth: 1,
  },
  modalBodyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalBodyText: {
    fontSize: 15,
    lineHeight: 23,
    paddingBottom: 32,
  },
});


