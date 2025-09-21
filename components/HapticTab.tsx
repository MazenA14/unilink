import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useState } from 'react';

export function HapticTab(props: BottomTabBarButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
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
          // Add a soft haptic feedback when pressing down on the tabs.
          impactAsync(ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
      onPressOut={() => {
        setPressed(false);
      }}
    />
  );
}
