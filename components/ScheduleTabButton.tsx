import { useScheduleContext } from '@/contexts/ScheduleContext';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScheduleMenu } from './ScheduleMenu';

export function ScheduleTabButton(props: BottomTabBarButtonProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const { setSelectedScheduleType } = useScheduleContext();

  const handlePress = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (menuVisible) {
      setMenuVisible(false);
    } else {
      setMenuVisible(true);
    }
  };

  const handleMenuOptionPress = (option: string) => {
    setMenuVisible(false);
    
    // Set the schedule type in context and navigate to schedule screen
    setSelectedScheduleType(option as any);
    
    // Navigate to schedule screen with the selected type as a param
    router.push({ pathname: '/(tabs)/schedule', params: { scheduleType: option } });
  };

  const handleMenuClose = () => {
    setMenuVisible(false);
  };

  return (
    <>
      <PlatformPressable
        {...props}
        style={props.style}
        onPressIn={(ev) => {
          if (process.env.EXPO_OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          props.onPressIn?.(ev);
        }}
        onPress={(ev) => {
          handlePress();
        }}
      >
        {props.children}
      </PlatformPressable>
      <ScheduleMenu
        visible={menuVisible}
        onClose={handleMenuClose}
        onOptionPress={handleMenuOptionPress}
      />
    </>
  );
}

