import { EmptyState, LoadingIndicator, ScheduleTable } from '@/components/schedule';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSchedule } from '@/hooks/useSchedule';
import React from 'react';
import { Alert, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ScheduleScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { scheduleData, loading, error, refetch } = useSchedule();
  
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
    if (loading) {
      return <LoadingIndicator />;
    }

    if (error) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { paddingHorizontal: dynamicPadding }]}>
            <Text style={[styles.title, { color: colors.text }]}>Schedule</Text>
          </View>
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
          {/* Header */}
          <View style={[styles.header, { paddingHorizontal: dynamicPadding }]}>
            <Text style={[styles.title, { color: colors.text }]}>Schedule</Text>
          </View>
          <EmptyState />
        </View>
      );
    }

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: dynamicPadding }]}>
          <Text style={[styles.title, { color: colors.text }]}>Schedule</Text>
        </View>
        <ScheduleTable scheduleData={scheduleData.days} />
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.scrollContainer, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={handleRefresh}
          tintColor={colors.tint}
        />
      }
    >
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
