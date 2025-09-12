import { EmptyState, LoadingIndicator, ScheduleSelector, ScheduleTable } from '@/components/schedule';
import { ScheduleMenuNew } from '@/components/ScheduleMenuNew';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { useScheduleContext } from '@/contexts/ScheduleContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useScheduleTypes } from '@/hooks/useScheduleTypes';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ScheduleScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { scheduleType: paramScheduleType } = useLocalSearchParams<{ scheduleType?: string }>();
  const { selectedScheduleType, setSelectedScheduleType } = useScheduleContext();
  const {
    scheduleType,
    selectedOption,
    scheduleData,
    loading,
    error,
    options,
    handleScheduleTypeChange,
    handleOptionSelection,
    refetch,
  } = useScheduleTypes();

  // Menu state
  const [menuVisible, setMenuVisible] = useState(false);

  // Handle schedule type from menu navigation (context) - only run when selectedScheduleType changes
  useEffect(() => {
    if (selectedScheduleType && selectedScheduleType !== scheduleType) {
      console.log('Changing schedule type to:', selectedScheduleType);
      handleScheduleTypeChange(selectedScheduleType);
      // Clear the context after using it
      setSelectedScheduleType(null);
    }
  }, [selectedScheduleType]); // Removed other dependencies to prevent loop

  // Handle schedule type from URL parameters (fallback) - only run when param changes
  useEffect(() => {
    if (paramScheduleType && paramScheduleType !== scheduleType && !selectedScheduleType) {
      console.log('Changing schedule type from URL param to:', paramScheduleType);
      handleScheduleTypeChange(paramScheduleType as any);
    }
  }, [paramScheduleType]); // Removed other dependencies to prevent loop
  
  // Calculate dynamic padding based on screen width
  const screenWidth = Dimensions.get('window').width;
  const dynamicPadding = Math.max(12, screenWidth * 0.04); // Minimum 12px, or 4% of screen width

  const handleRefresh = async () => {
    try {
      await refetch();
    } catch {
      Alert.alert('Error', 'Failed to refresh schedule data');
    }
  };

  // Menu handlers
  const handleMenuPress = () => {
    setMenuVisible(true);
  };

  const handleMenuClose = () => {
    setMenuVisible(false);
  };

  const handleMenuOptionPress = (option: string) => {
    handleScheduleTypeChange(option as any);
    setMenuVisible(false);
  };

  const renderContent = () => {
    if (loading && (!scheduleData || scheduleData.days.length === 0)) {
      return <LoadingIndicator />;
    }

    if (error) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={{ paddingHorizontal: dynamicPadding }}>
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
            <Text style={[styles.subtitle, { color: colors.secondaryFont }]}>
              Pull down to refresh
            </Text>
          </View>
        </View>
      );
    }

    if (!scheduleData || scheduleData.days.length === 0) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <EmptyState />
        </View>
      );
    }

    if(!loading && scheduleData && scheduleData.days.length > 0) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ScheduleTable scheduleData={scheduleData.days} scheduleType={scheduleType} />
        </View>
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<AppRefreshControl refreshing={loading} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>Schedule</Text>
            <TouchableOpacity
              style={[styles.menuButton, { backgroundColor: colors.tint }]}
              onPress={handleMenuPress}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="menu" 
                size={20} 
                color={colorScheme === 'dark' ? '#000000' : '#FFFFFF'} 
              />
            </TouchableOpacity>
          </View>
          
        {/* Schedule Section Title */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {scheduleType === 'personal' ? 'Personal Schedule' : 
             scheduleType === 'staff' ? 'Staff Schedule' :
             scheduleType === 'course' ? 'Course Schedule' : 'Group Schedule'}
          </Text>
        </View>
        </View>
        
        {/* Schedule Type Selector removed: selection now comes from the hamburger menu */}

        {/* Schedule Selector (for non-personal schedules) */}
        {scheduleType !== 'personal' && (
          <ScheduleSelector
            type={scheduleType}
            options={options}
            selectedValue={selectedOption}
            onSelectionChange={handleOptionSelection}
            placeholder={`Select ${scheduleType === 'staff' ? 'Staff Member' : scheduleType === 'course' ? 'Course' : 'Group'}`}
            loading={loading}
          />
        )}

        {/* Schedule Content */}
        {renderContent()}
      </ScrollView>

      {/* Schedule Menu - Outside ScrollView */}
      <ScheduleMenuNew
        visible={menuVisible}
        onClose={handleMenuClose}
        onOptionPress={handleMenuOptionPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    paddingTop: 60,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  section: {
    // marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 11,
    marginBottom: 12,
  },
});
