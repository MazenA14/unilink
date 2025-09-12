import { EmptyState, LoadingIndicator, ScheduleSelector, ScheduleTable } from '@/components/schedule';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Colors } from '@/constants/Colors';
import { useScheduleContext } from '@/contexts/ScheduleContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useScheduleTypes } from '@/hooks/useScheduleTypes';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';

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
    <ScrollView
      style={[styles.scrollContainer, { backgroundColor: colors.background }]}
      refreshControl={<AppRefreshControl refreshing={loading} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: dynamicPadding }]}>
        <Text style={[styles.title, { color: colors.text }]}>Schedule</Text>
      </View>
      
      {/* Schedule Type Selector removed: selection now comes from the tab menu */}

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
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 20,
    paddingTop: 60,
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
});
