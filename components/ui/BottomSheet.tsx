import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

// Critically damped, no overshoot — the iOS-style sheet feel.
const SPRING = { damping: 50, stiffness: 420, mass: 1, overshootClamping: true } as const;
const CLOSE_VELOCITY = 1000; // px/s flick that closes regardless of distance
const CLOSE_DISTANCE_RATIO = 0.25; // of sheet height

interface BottomSheetProps {
  /** Controlled visibility. Set false to animate the sheet out. */
  visible: boolean;
  /** User asked to close (drag, backdrop tap, back button). Set `visible` to false in response. */
  onRequestClose: () => void;
  /** Fired once the exit animation finishes and the sheet unmounts. */
  onDismissed?: () => void;
  /** Fraction of the window height the sheet occupies. */
  heightRatio?: number;
  /** Fixed area under the drag handle; dragging it always moves the sheet. */
  header?: ReactNode;
  children: ReactNode;
}

/**
 * Bottom sheet whose gestures and animations run entirely on the UI thread.
 * Dragging down anywhere moves the sheet once its content is scrolled to the
 * top; while the sheet is displaced the content is pinned so the two never
 * move at once. Release velocity carries into the settle/close animation.
 */
export default function BottomSheet({
  visible,
  onRequestClose,
  onDismissed,
  heightRatio = 0.78,
  header,
  children,
}: BottomSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.round(windowHeight * heightRatio);

  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(sheetHeight);
  const scrollY = useSharedValue(0);
  const headerHeight = useSharedValue(0);
  // Finger translation where the sheet started following; -1 = not following.
  const dragOrigin = useSharedValue(-1);
  const pinContent = useSharedValue(false);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const handleDismissed = useCallback(() => {
    setMounted(false);
    onDismissed?.();
  }, [onDismissed]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      scrollY.value = 0;
      translateY.value = sheetHeight;
      translateY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      translateY.value = withTiming(
        sheetHeight,
        { duration: 220, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) scheduleOnRN(handleDismissed);
        }
      );
    }
    // Only react to visibility changes; mounted/sheetHeight are read as current values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const contentGesture = Gesture.Native();
  const sheetGesture = Gesture.Pan()
    .activeOffsetY(8) // a downward drag activates; upward drags stay with the scroll view
    .failOffsetX([-24, 24])
    .simultaneousWithExternalGesture(contentGesture)
    .onBegin((e) => {
      pinContent.value = e.y > headerHeight.value;
    })
    .onStart((e) => {
      const onHeader = e.y <= headerHeight.value;
      dragOrigin.value = onHeader || scrollY.value <= 0 ? e.translationY : -1;
    })
    .onUpdate((e) => {
      if (dragOrigin.value < 0) {
        // Content is still scrolling back up; take over once it reaches the top
        if (scrollY.value > 0) return;
        dragOrigin.value = e.translationY;
      }
      const dy = Math.max(0, e.translationY - dragOrigin.value);
      translateY.value = dy;
      if (dy > 0 && pinContent.value) scrollTo(scrollRef, 0, 0, false);
    })
    .onEnd((e) => {
      if (dragOrigin.value < 0) return;
      const dy = Math.max(0, e.translationY - dragOrigin.value);
      const shouldClose =
        e.velocityY > CLOSE_VELOCITY || (dy > sheetHeight * CLOSE_DISTANCE_RATIO && e.velocityY > -200);
      if (shouldClose) {
        translateY.value = withSpring(sheetHeight, { ...SPRING, velocity: e.velocityY }, (finished) => {
          if (finished) scheduleOnRN(onRequestClose);
        });
      } else {
        translateY.value = withSpring(0, { ...SPRING, velocity: e.velocityY });
      }
    })
    .onFinalize(() => {
      dragOrigin.value = -1;
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, sheetHeight], [1, 0], 'clamp'),
  }));

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onRequestClose}>
      {/* Modals render outside the app root, so gestures need their own root here */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} accessibilityLabel="Close" />
        </Animated.View>

        <GestureDetector gesture={sheetGesture}>
          <Animated.View
            style={[styles.sheet, { height: sheetHeight, backgroundColor: colors.surfaceElevated }, sheetStyle]}
          >
            <View
              onLayout={(e) => {
                headerHeight.value = e.nativeEvent.layout.height;
              }}
            >
              <View style={styles.handleArea}>
                <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
              </View>
              {header}
            </View>

            <GestureDetector gesture={contentGesture}>
              <Animated.ScrollView
                ref={scrollRef}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                bounces={false}
                overScrollMode="never"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              >
                {children}
              </Animated.ScrollView>
            </GestureDetector>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});
