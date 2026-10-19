/**
 * Inline segmented control for short, mutually exclusive choices (2–4).
 * A soft pill slides under the active segment.
 */
import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { ComponentProps, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

const PAD = 4;

export function SegmentedControl<T extends string>({ options, value, onChange, style }: SegmentedControlProps<T>) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [width, setWidth] = useState(0);
  const segWidth = width > 0 ? (width - PAD * 2) / options.length : 0;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withTiming(index * segWidth, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [index, segWidth, x]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={[styles.track, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {segWidth > 0 && (
        <Animated.View
          style={[
            styles.pill,
            { width: segWidth, backgroundColor: colors.surfaceElevated, ...Shadow.xs(colors) },
            pillStyle,
          ]}
        />
      )}
      {options.map((opt) => {
        const active = opt.value === value;
        const tone = active ? colors.primary : colors.textSecondary;
        return (
          <Pressable
            key={opt.value}
            style={styles.segment}
            onPress={() => {
              if (!active) {
                Haptics.selectionAsync().catch(() => {});
                onChange(opt.value);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {opt.icon && <Ionicons name={opt.icon} size={16} color={tone} />}
            <Text style={[styles.label, { color: active ? colors.textPrimary : colors.textSecondary }]} numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: PAD,
  },
  pill: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: Radius.md,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
    paddingVertical: Spacing.sm + 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
});
