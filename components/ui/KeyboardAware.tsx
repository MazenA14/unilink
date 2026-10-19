/**
 * Keyboard avoidance that works inside Modals on both platforms.
 *
 * Android modals drawn edge-to-edge don't resize when the keyboard opens, and
 * KeyboardAvoidingView is unreliable there. Instead we listen to keyboard
 * events and lift content by however much the keyboard actually overlaps the
 * container — if the window already resized itself, the overlap is ~0 and
 * nothing is shifted twice.
 */
import { ReactNode, useEffect } from 'react';
import { Keyboard, KeyboardEvent, Platform, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE_EVENT = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

export interface KeyboardInset {
  /** How far (px) the keyboard overlaps the measured container. */
  inset: SharedValue<number>;
  /** Pass to the container's onLayout so the overlap can be computed. */
  onLayout: (e: { nativeEvent: { layout: { height: number } } }) => void;
}

export function useKeyboardInset(): KeyboardInset {
  const inset = useSharedValue(0);
  const keyboardTop = useSharedValue(0); // screen Y of the keyboard's top edge; 0 = hidden
  const fullHeight = useSharedValue(0); // container height with the keyboard hidden
  const height = useSharedValue(0); // current container height

  useEffect(() => {
    const apply = (target: number, duration: number) => {
      inset.value = withTiming(Math.max(0, target), { duration, easing: Easing.out(Easing.cubic) });
    };
    const show = Keyboard.addListener(SHOW_EVENT, (e: KeyboardEvent) => {
      keyboardTop.value = e.endCoordinates.screenY;
      // Overlap = keyboard height minus whatever the window already gave back by resizing.
      const resizedBy = Math.max(0, fullHeight.value - height.value);
      apply(e.endCoordinates.height - resizedBy, e.duration || 220);
    });
    const hide = Keyboard.addListener(HIDE_EVENT, (e: KeyboardEvent) => {
      keyboardTop.value = 0;
      apply(0, e?.duration || 200);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [inset, keyboardTop, fullHeight, height]);

  const onLayout: KeyboardInset['onLayout'] = (e) => {
    const h = e.nativeEvent.layout.height;
    height.value = h;
    if (keyboardTop.value === 0 || h > fullHeight.value) fullHeight.value = h;
  };

  return { inset, onLayout };
}

interface KeyboardAwareViewProps {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * Drop-in replacement for a modal's full-screen overlay View: adds bottom
 * padding equal to the keyboard overlap, so centred dialogs move up and
 * bottom-aligned panels sit on top of the keyboard.
 */
export function KeyboardAwareView({ style, children }: KeyboardAwareViewProps) {
  const { inset, onLayout } = useKeyboardInset();
  // Keep the container's own bottom padding and add the keyboard overlap on top of it.
  const flat = StyleSheet.flatten(style) ?? {};
  const basePadding = Number(flat.paddingBottom ?? flat.paddingVertical ?? flat.padding ?? 0) || 0;
  const padStyle = useAnimatedStyle(() => ({ paddingBottom: basePadding + inset.value }));
  return (
    <Animated.View style={[style, padStyle]} onLayout={onLayout}>
      {children}
    </Animated.View>
  );
}
