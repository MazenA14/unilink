import { useCustomAlert } from '@/components/CustomAlert';
import { EmptyState, LoadingIndicator, ScheduleSelector, ScheduleTable } from '@/components/schedule';
import { ScheduleMenuNew } from '@/components/ScheduleMenuNew';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { useScheduleContext } from '@/contexts/ScheduleContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useScheduleTypes } from '@/hooks/useScheduleTypes';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ScheduleScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { scheduleType: paramScheduleType } = useLocalSearchParams<{ scheduleType?: string }>();
  const { selectedScheduleType, setSelectedScheduleType } = useScheduleContext();
  const { showAlert, AlertComponent } = useCustomAlert();
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
  
  // State to force re-render for current slot indicator
  const [currentTime, setCurrentTime] = useState(new Date());

  // Handle schedule type from menu navigation (context) - only run when selectedScheduleType changes
  useEffect(() => {
    if (selectedScheduleType && selectedScheduleType !== scheduleType) {
      handleScheduleTypeChange(selectedScheduleType);
      // Clear the context after using it
      setSelectedScheduleType(null);
    }
  }, [selectedScheduleType]); // Removed other dependencies to prevent loop

  // Handle schedule type from URL parameters (fallback) - only run when param changes
  useEffect(() => {
    if (paramScheduleType && paramScheduleType !== scheduleType && !selectedScheduleType) {
      handleScheduleTypeChange(paramScheduleType as any);
    }
  }, [paramScheduleType]); // Removed other dependencies to prevent loop

  // Update current time every minute for slot indicator
  useEffect(() => {
    const updateTime = () => {
      const newTime = new Date();
      setCurrentTime(newTime);
    };

    // Update immediately
    updateTime();

    // Set up interval to update every minute
    const interval = setInterval(updateTime, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Update current time when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const newTime = new Date();
      setCurrentTime(newTime);
    }, [])
  );
  
  // Calculate dynamic padding based on screen width
  const screenWidth = Dimensions.get('window').width;
  const dynamicPadding = Math.max(12, screenWidth * 0.04); // Minimum 12px, or 4% of screen width

  const handleRefresh = async () => {
    try {
      await refetch();
    } catch {
      showAlert({
        title: 'Error',
        message: 'Failed to refresh schedule data',
        type: 'error',
      });
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
    // Show loading state if we're loading and don't have data yet
    if (loading && !scheduleData) {
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

    // Show empty state only if we're not loading and have no data
    if (!loading && (!scheduleData || scheduleData.days.length === 0)) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <EmptyState />
        </View>
      );
    }

    // Show schedule data if we have it
    if (scheduleData && scheduleData.days.length > 0) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ScheduleTable scheduleData={scheduleData.days} scheduleType={scheduleType} currentTime={currentTime} />
        </View>
      );
    }

    // Fallback loading state
    return <LoadingIndicator />;
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
          </View>
          
        {/* Schedule Section Title */}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {scheduleType === 'personal' ? 'Personal Schedule' : 
               scheduleType === 'staff' ? 'Staff Schedule' :
               scheduleType === 'course' ? 'Course Schedule' : 'Group Schedule'}
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                }
              ]}
              onPress={handleMenuPress}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="chevron-down" 
                size={16} 
                color={colors.secondaryFont} 
              />
            </TouchableOpacity>
          </View>
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
      
      {/* Custom Alert Component */}
      <AlertComponent />
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
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 11,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dropdownButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginLeft: 8,
  },
});
