import SelectableText from '@/components/ui/SelectableText';
import { Colors } from '@/constants/Colors';
import { useNotifications } from '@/contexts/NotificationContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Notification } from '@/utils/types/notificationTypes';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Modal,
    PanResponder,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

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
    markAllAsRead,
    refreshNotifications, 
    clearError
  } = useNotifications();

  // Modal state
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Animation values
  const translateY = useState(new Animated.Value(0))[0];
  const opacity = useState(new Animated.Value(0))[0];
  const { height: screenHeight } = Dimensions.get('window');
  
  // Header pan responder for swipe down gesture
  const dragHandlePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to downward swipes
      const isDownwardSwipe = gestureState.dy > 0;
      const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      
      return isDownwardSwipe && isVerticalSwipe;
    },
    onPanResponderGrant: () => {
      // Don't set offset - start from current position
      translateY.setValue(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
        const progress = Math.min(gestureState.dy / 200, 1);
        opacity.setValue(1 - progress);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy > 100) {
        closeModal();
      } else {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(opacity, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
  });

  const onRefresh = async () => {
    await refreshNotifications();
  };


  // Modal functions
  const openModal = (notification: Notification) => {
    setSelectedNotification(notification);
    setModalVisible(true);
    // Mark as read when opened
    markAsRead(notification.id);
    
    // Animate modal in
    translateY.setValue(screenHeight);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    // Animate modal out
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedNotification(null);
      // Reset values for next time
      translateY.setValue(0);
      opacity.setValue(0);
    });
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

  const formatDate = (dateString: string) => {
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
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
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
            {item.title}
          </Text>
          {!item.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />
          )}
        </View>
        <View style={styles.notificationMeta}>
          <Text style={[styles.notificationDate, { color: colors.secondaryFont }]}>
            {formatDate(item.date)}
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
        <Text
          style={[styles.notificationBody, { color: colors.secondaryFont }]}
          numberOfLines={3}
        >
          {item.body}
        </Text>
        <Text style={[styles.notificationStaff, { color: colors.secondaryFont }]}>
          From: {item.staff}
        </Text>
      </View>
    </TouchableOpacity>
  );


  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.mainFont} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.mainFont }]}>
            Notifications
          </Text>
          <View style={styles.placeholder} />
        </View>
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.mainFont} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.mainFont }]}>
            Notifications
          </Text>
          <View style={styles.placeholder} />
        </View>
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.mainFont} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.mainFont }]}>
          Notifications
        </Text>
        <View style={styles.placeholder} />
      </View>

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

      <FlatList
        data={notifications}
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
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={64} color={colors.secondaryFont} />
            <Text style={[styles.emptyText, { color: colors.secondaryFont }]}>
              No notifications yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.secondaryFont }]}>
              You&apos;ll see important updates here
            </Text>
          </View>
        }
      />

      {/* Notification Detail Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity }]}> 
          <Animated.View 
            style={[
              styles.modalContainer, 
              { 
                backgroundColor: colors.cardBackground,
                transform: [{ translateY }]
              }
            ]}
          >
            {/* Modal Header */}
            <View 
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
              {...dragHandlePanResponder.panHandlers}
            >
              {/* Drag Handle */}
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
              
              <View style={styles.headerContent}>
                <Text style={[styles.modalTitle, { color: colors.mainFont }]}>
                  Notification Details
                </Text>
                <View style={styles.modalHeaderActions}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={closeModal}
                  >
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedNotification && (
                <>
                  {/* Title */}
                  <Text style={[styles.modalNotificationTitle, { color: colors.mainFont }]}>
                    {selectedNotification.title}
                  </Text>

                  {/* Meta Information */}
                  <View style={styles.modalMetaContainer}>
                    <View style={styles.modalMetaRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.secondaryFont} />
                        <Text style={[styles.modalMetaText, { color: colors.secondaryFont, opacity: 1 }]}>
                          {formatDate(selectedNotification.date)}
                        </Text>
                    </View>
                    
                    <View style={styles.modalMetaRow}>
                      <Ionicons name="person-outline" size={16} color={colors.secondaryFont} />
                        <Text style={[styles.modalMetaText, { color: colors.secondaryFont, opacity: 1 }]}>
                          {selectedNotification.staff}
                        </Text>
                    </View>

                    {selectedNotification.importance && (
                      <View style={styles.modalMetaRow}>
                        <Ionicons name="flag-outline" size={16} color={colors.secondaryFont} />
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
                          >
                            {selectedNotification.importance} Priority
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Body Content */}
                  <View style={[styles.modalBodyContainer, { borderTopColor: colors.border }]}>
                      <SelectableText 
                        style={[styles.modalBodyText, { color: colors.secondaryFont, opacity: 1 }]}
                      >
                        {selectedNotification.body}
                      </SelectableText>
                  </View>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
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
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  notificationCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '95%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
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
    flex: 1,
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
    fontSize: 14,
    lineHeight: 20,
    bottom: 10,
  },
});


