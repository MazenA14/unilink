import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScheduleDayView } from './ScheduleDayView';
import { ScheduleDay, ScheduleType } from './types';

interface ScheduleTableProps {
  scheduleData: ScheduleDay[];
  scheduleType?: ScheduleType;
  currentTime?: Date;
  preferredSlots?: number;
}

export function ScheduleTable({ scheduleData, scheduleType = 'personal', currentTime: propCurrentTime, preferredSlots }: ScheduleTableProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scrollViewRef = useRef<ScrollView>(null);
  const dayTagsScrollRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const isProgrammaticScroll = useRef(false);
  
  // State to force re-render for current slot indicator
  const [currentTime, setCurrentTime] = useState(new Date());

  // Normalize day ordering to Saturday–Thursday (filter out Friday if present)
  const orderedDays = React.useMemo(() => {
    const order = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const indexByDay: Record<string, number> = order.reduce((acc, day, idx) => {
      acc[day] = idx;
      return acc;
    }, {} as Record<string, number>);

    return (scheduleData ?? [])
      .filter((d) => d.dayName !== 'Friday')
      .slice()
      .sort((a, b) => {
        const ai = indexByDay[a.dayName] ?? 999;
        const bi = indexByDay[b.dayName] ?? 999;
        return ai - bi;
      });
  }, [scheduleData]);

  // Get current day and scroll to it
  const getCurrentDayIndex = () => {
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[today.getDay()];
    
    // Find the index of current day in ordered days
    const currentDayIndex = orderedDays.findIndex(day => day.dayName === currentDayName);
    
    // If current day is not found (e.g., Friday is filtered out), default to first day
    return currentDayIndex >= 0 ? currentDayIndex : 0;
  };

  // Scroll to current day when component mounts or data changes
  useEffect(() => {
    if (orderedDays.length > 0 && scrollViewRef.current) {
      const currentDayIndex = getCurrentDayIndex();
      setSelectedDayIndex(currentDayIndex);
      const scrollX = currentDayIndex * screenWidth;
      
      // Use setTimeout to ensure the ScrollView is fully rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: scrollX, animated: false });
        
        // Also scroll the day tags to make the current day visible
        if (dayTagsScrollRef.current) {
          const tagWidth = 88; // minWidth (80) + gap (8)
          const scrollToX = Math.max(0, (currentDayIndex * tagWidth) - (screenWidth / 2) + (tagWidth / 2));
          dayTagsScrollRef.current.scrollTo({ x: scrollToX, animated: false });
        }
      }, 100);
    }
  }, [orderedDays, screenWidth]);

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

  // Handle day tag selection
  const handleDaySelect = (dayIndex: number) => {
    // Set flag to prevent scroll handler from updating selection during programmatic scroll
    isProgrammaticScroll.current = true;
    
    const scrollX = dayIndex * screenWidth;
    scrollViewRef.current?.scrollTo({ x: scrollX, animated: true });
    
    // Also scroll the day tags to keep the selected day visible
    if (dayTagsScrollRef.current) {
      const tagWidth = 88; // minWidth (80) + gap (8)
      const scrollToX = Math.max(0, (dayIndex * tagWidth) - (screenWidth / 2) + (tagWidth / 2));
      dayTagsScrollRef.current.scrollTo({ x: scrollToX, animated: true });
    }
    
    // Update selection immediately and reset flag after animation
    setSelectedDayIndex(dayIndex);
    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 300);
  };

  // Handle scroll events to update selected day
  const handleScroll = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const dayIndex = Math.round(scrollX / screenWidth);
    
    // Only update selection and day tags if it's not a programmatic scroll
    if (!isProgrammaticScroll.current) {
      setSelectedDayIndex(dayIndex);
      
      // Calculate the exact scroll position for day tags based on the current scroll position
      if (dayTagsScrollRef.current) {
        const tagWidth = 88; // minWidth (80) + gap (8)
        // Use the exact scroll position instead of rounded day index for smooth interpolation
        const exactDayPosition = scrollX / screenWidth;
        const scrollToX = Math.max(0, (exactDayPosition * tagWidth) - (screenWidth / 2) + (tagWidth / 2));
        dayTagsScrollRef.current.scrollTo({ x: scrollToX, animated: false });
      }
    }
  };

  // Handle scroll events during swiping for real-time sync
  const handleScrollBeginDrag = (event: any) => {
    // Optional: Add any logic when user starts dragging
  };

  const handleScrollEndDrag = (event: any) => {
    // Optional: Add any logic when user stops dragging
  };

  const handleMomentumScrollBegin = (event: any) => {
    // Optional: Add any logic when momentum scrolling begins
  };

  const handleMomentumScrollEnd = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const dayIndex = Math.round(scrollX / screenWidth);
    
    // Only update selection if it's not a programmatic scroll
    if (!isProgrammaticScroll.current) {
      setSelectedDayIndex(dayIndex);
    }
    
    // Ensure day tags are properly positioned after momentum scroll ends
    if (dayTagsScrollRef.current) {
      const tagWidth = 88; // minWidth (80) + gap (8)
      const scrollToX = Math.max(0, (dayIndex * tagWidth) - (screenWidth / 2) + (tagWidth / 2));
      dayTagsScrollRef.current.scrollTo({ x: scrollToX, animated: true });
    }
  };

  // Fallback if no data
  if (!orderedDays || orderedDays.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>No schedule data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Day Tags Navigation */}
      <View style={[styles.dayTagsContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          ref={dayTagsScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTagsContent}
        >
          {orderedDays.map((day, index) => (
            <TouchableOpacity
              key={day.dayName}
              style={[
                styles.dayTag,
                {
                  backgroundColor: selectedDayIndex === index ? colors.tint : colors.border + '30',
                  borderColor: selectedDayIndex === index ? colors.tint : colors.border,
                }
              ]}
              onPress={() => handleDaySelect(index)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayTagText,
                  {
                    color: selectedDayIndex === index 
                      ? (colorScheme === 'dark' ? '#000000' : '#FFFFFF')
                      : colors.text
                  }
                ]}
              >
                {day.dayName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Schedule Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.pagerView}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollBegin={handleMomentumScrollBegin}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {orderedDays.map((day, index) => (
          <View key={day.dayName} style={{ width: screenWidth }}>
            <ScheduleDayView 
              day={day} 
              scheduleType={scheduleType}
              currentTime={propCurrentTime || currentTime}
              preferredSlots={preferredSlots}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dayTagsContainer: {
    paddingTop: 0,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  dayTagsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTagText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  pagerView: {
    flex: 1,
  },
});
