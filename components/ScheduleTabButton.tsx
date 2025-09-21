import { useScheduleContext } from '@/contexts/ScheduleContext';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScheduleMenu } from './ScheduleMenu';

export function ScheduleTabButton(props: BottomTabBarButtonProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  const { setSelectedScheduleType } = useScheduleContext();

  const handlePress = () => {
    if (process.env.EXPO_OS === 'ios') {
      impactAsync(ImpactFeedbackStyle.Light);
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
        android_ripple={{ color: 'transparent', borderless: false }}
        style={[
          props.style,
          { opacity: pressed ? 0.6 : 1 }
        ]}
        onPressIn={(ev) => {
          setPressed(true);
          if (process.env.EXPO_OS === 'ios') {
            impactAsync(ImpactFeedbackStyle.Light);
          }
          props.onPressIn?.(ev);
        }}
        onPressOut={() => {
          setPressed(false);
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

