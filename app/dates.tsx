import { useCustomAlert } from '@/components/CustomAlert';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';

interface DateItem {
  id: string;
  date: string;
  title: string;
  description: string;
  location: string;
  type: 'quiz' | 'assignment' | 'project' | 'exam' | 'other';
}

const typeColors = {
  quiz: '#3B82F6',
  assignment: '#10B981',
  project: '#F59E0B',
  exam: '#EF4444',
  other: '#8B5CF6',
};

const typeIcons = {
  quiz: 'clipboard',
  assignment: 'document-text',
  project: 'folder',
  exam: 'school',
  other: 'calendar',
};

export default function DatesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();
  const [dates, setDates] = useState<DateItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<DateItem | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    date: '',
    title: '',
    description: '',
    location: '',
    type: 'quiz' as DateItem['type'],
  });

  // Animation values for modal
  const translateY = useState(new Animated.Value(0))[0];
  const opacity = useState(new Animated.Value(0))[0];

  // Pan responder for swipe-to-dismiss
  const dragHandlePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderGrant: () => {
      translateY.setOffset((translateY as any)._value);
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      translateY.flattenOffset();
      
      if (gestureState.dy > 100 || gestureState.vy > 0.5) {
        // Dismiss modal
        closeModal();
      } else {
        // Snap back to original position
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      translateY.setValue(0);
      opacity.setValue(0);
    });
  };

  const openModal = () => {
    setModalVisible(true);
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

  // Load dates from storage on component mount
  useEffect(() => {
    loadDates();
  }, []);

  const loadDates = async () => {
    try {
      // For now, we'll use a simple approach with AsyncStorage
      // In a real app, you might want to use a more robust storage solution
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(currentDate);
    setFormData({ ...formData, date: currentDate.toISOString().split('T')[0] });
  };

  const handleAddDate = () => {
    if (!formData.date || !formData.title) {
      showAlert({
        title: 'Error',
        message: 'Please fill in the date and title fields.',
        type: 'error',
      });
      return;
    }

    const newDate: DateItem = {
      id: editingItem?.id || Date.now().toString(),
      date: formData.date,
      title: formData.title,
      description: formData.description,
      location: formData.location,
      type: formData.type,
    };

    let updatedDates;
    if (editingItem) {
      updatedDates = dates.map(item => 
        item.id === editingItem.id ? newDate : item
      );
    } else {
      updatedDates = [...dates, newDate];
    }

    // Sort dates by date
    updatedDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    saveDates(updatedDates);
    resetForm();
    setModalVisible(false);
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
            const updatedDates = dates.filter(item => item.id !== id);
            saveDates(updatedDates);
          },
        },
      ],
    });
  };

  const handleDeleteAll = () => {
    if (dates.length === 0) {
      showAlert({
        title: 'No Dates',
        message: 'There are no dates to delete.',
        type: 'info',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    showAlert({
      title: 'Delete All Dates',
      message: `Are you sure you want to delete all ${dates.length} date(s)? This action cannot be undone.`,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            saveDates([]);
          },
        },
      ],
    });
  };

  const resetForm = () => {
    setFormData({
      date: '',
      title: '',
      description: '',
      location: '',
      type: 'quiz',
    });
    setSelectedDate(new Date());
    setEditingItem(null);
  };

  const handleOpenModal = () => {
    resetForm();
    openModal();
  };

  const handleEditDate = (item: DateItem) => {
    setEditingItem(item);
    const itemDate = new Date(item.date);
    setSelectedDate(itemDate);
    setFormData({
      date: item.date,
      title: item.title,
      description: item.description,
      location: item.location,
      type: item.type,
    });
    openModal();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTypeDisplayName = (type: DateItem['type']) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getDateStatusColor = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    date.setHours(0, 0, 0, 0); // Reset time to start of day
    
    if (date < today) {
      return '#EF4444'; // Red for past dates
    } else if (date.getTime() === today.getTime()) {
      return '#3B82F6'; // Blue for today
    } else {
      return '#10B981'; // Green for future dates
    }
  };

  const renderDateItem = ({ item }: { item: DateItem }) => (
    <View style={[styles.dateCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {/* Date Status Color Strip */}
      <View style={[styles.dateStatusStrip, { backgroundColor: getDateStatusColor(item.date) }]} />
      
      <View style={styles.dateCardHeader}>
        <View style={[styles.typeIndicator, { backgroundColor: typeColors[item.type] }]}>
          <Ionicons name={typeIcons[item.type] as any} size={16} color="white" />
        </View>
        <View style={styles.dateCardContent}>
          <Text style={[styles.dateTitle, { color: colors.mainFont }]}>{item.title}</Text>
          <View style={styles.typeAndLocationRow}>
            <Text style={[styles.dateType, { color: colors.secondaryFont }]}>
              {getTypeDisplayName(item.type)}
            </Text>
            {item.location && (
              <>
                <Text style={[styles.separator, { color: colors.secondaryFont }]}>•</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color={colors.secondaryFont} />
                  <Text style={[styles.locationText, { color: colors.secondaryFont }]}>{item.location}</Text>
                </View>
              </>
            )}
          </View>
        </View>
        <View style={styles.dateCardActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.tint + '20' }]}
            onPress={() => handleEditDate(item)}
          >
            <Ionicons name="pencil" size={16} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.gradeFailing + '20' }]}
            onPress={() => handleDeleteDate(item.id)}
          >
            <Ionicons name="trash" size={16} color={colors.gradeFailing} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.dateText, { color: getDateStatusColor(item.date) }]}>{formatDate(item.date)}</Text>
      {item.description && (
        <Text style={[styles.dateDescription, { color: colors.secondaryFont }]}>
          {item.description}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.mainFont} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.mainFont }]}>Dates</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerActionButton, { backgroundColor: colors.gradeFailing }]}
            onPress={handleDeleteAll}
          >
            <Ionicons name="trash" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionButton, { backgroundColor: colors.tint }]}
            onPress={handleOpenModal}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {dates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.secondaryFont} />
            <Text style={[styles.emptyStateTitle, { color: colors.mainFont }]}>
              No dates added yet
            </Text>
            <Text style={[styles.emptyStateText, { color: colors.secondaryFont }]}>
              Add quizzes, assignments, projects, and other important dates to keep track of your schedule.
            </Text>
          </View>
        ) : (
          <FlatList
            data={dates}
            renderItem={renderDateItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.datesList}
          />
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
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
                backgroundColor: colors.background,
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
                  {editingItem ? 'Edit Date' : 'Add New Date'}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Title *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.cardBackground, 
                  borderColor: colors.border,
                  color: colors.mainFont 
                }]}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Enter title"
                placeholderTextColor={colors.secondaryFont}
              />
            </View>

            {/* Date Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Date *</Text>
              <TouchableOpacity
                style={[styles.datePickerButton, { 
                  backgroundColor: colors.cardBackground, 
                  borderColor: colors.border,
                }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.datePickerText, { color: colors.mainFont }]}>
                  {formData.date ? new Date(formData.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }) : 'Select Date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={colors.secondaryFont} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* Location Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Location</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.cardBackground, 
                  borderColor: colors.border,
                  color: colors.mainFont 
                }]}
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text })}
                placeholder="Enter location (optional)"
                placeholderTextColor={colors.secondaryFont}
              />
            </View>

            {/* Type Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Type</Text>
              <View style={styles.typeSelector}>
                {Object.keys(typeColors).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      { 
                        backgroundColor: formData.type === type ? typeColors[type as DateItem['type']] : colors.cardBackground,
                        borderColor: colors.border
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, type: type as DateItem['type'] })}
                  >
                    <Ionicons 
                      name={typeIcons[type as DateItem['type']] as any} 
                      size={20} 
                      color={formData.type === type ? 'white' : colors.secondaryFont} 
                    />
                    <Text style={[
                      styles.typeOptionText,
                      { color: formData.type === type ? 'white' : colors.mainFont }
                    ]}>
                      {getTypeDisplayName(type as DateItem['type'])}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mainFont }]}>Description</Text>
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: colors.cardBackground, 
                  borderColor: colors.border,
                  color: colors.mainFont 
                }]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter description (optional)"
                placeholderTextColor={colors.secondaryFont}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            </ScrollView>

            {/* Save Button */}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: colors.tint }]}
                onPress={handleAddDate}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Custom Alert */}
      <AlertComponent />
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
    flex: 1,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  datesList: {
    paddingBottom: 20,
  },
  dateCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  dateStatusStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    zIndex: 1,
  },
  dateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateCardContent: {
    flex: 1,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  dateType: {
    fontSize: 12,
    fontWeight: '500',
  },
  typeAndLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  separator: {
    fontSize: 12,
    marginHorizontal: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '90%',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
  },
  modalSaveButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  datePickerButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
