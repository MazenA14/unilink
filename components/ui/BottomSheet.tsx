import { useKeyboardInset } from '@/components/ui/KeyboardAware';
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
  /** Fraction of the window height the sheet occupies (the maximum when `autoHeight`). */
  heightRatio?: number;
  /** Size the sheet to its content, up to `heightRatio`. */
  autoHeight?: boolean;
  /** When false the sheet can't be dragged, tapped or back-buttoned away (e.g. forced update). */
  dismissible?: boolean;
  /** Pinned area under the scrolling content (primary actions); stays above the keyboard. */
  footer?: ReactNode;
  /** Fixed area under the drag handle; dragging it always moves the sheet. */
  header?: ReactNode;
  /** Fired once per content height when the content is scrolled near its end. */
  onEndReached?: () => void;
  /**
   * When false only the handle/header drags the sheet and the content is a plain native
   * scroll view, untouched by the gesture system. Use for selectable text, which the
   * content gesture otherwise interferes with on Android.
   */
  dragFromContent?: boolean;
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
  autoHeight = false,
  dismissible = true,
  footer,
  header,
  onEndReached,
  dragFromContent = true,
  children,
}: BottomSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = Math.round(windowHeight * heightRatio);
  const [headerH, setHeaderH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [footerH, setFooterH] = useState(0);
  const sheetHeight = autoHeight && contentH > 0 ? Math.min(maxHeight, headerH + contentH + footerH) : maxHeight;
  // Off-screen position; the full window height works for any sheet size.
  const hiddenY = windowHeight;
  const requestClose = useCallback(() => {
    if (dismissible) onRequestClose();
  }, [dismissible, onRequestClose]);

  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(hiddenY);
  const scrollY = useSharedValue(0);
  const headerHeight = useSharedValue(0);
  // Finger translation where the sheet started following; -1 = not following.
  const dragOrigin = useSharedValue(-1);
  const pinContent = useSharedValue(false);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { inset: keyboardInset, onLayout: onRootLayout } = useKeyboardInset();
  const rootHeight = useSharedValue(windowHeight);
  const topInset = insets.top;
  // Content height at which onEndReached last fired, so it fires once per page.
  const endFiredAt = useSharedValue(-1);
  const hasEndHandler = !!onEndReached;
  const fireEndReached = useCallback(() => onEndReached?.(), [onEndReached]);

  const handleDismissed = useCallback(() => {
    setMounted(false);
    onDismissed?.();
  }, [onDismissed]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      scrollY.value = 0;
      translateY.value = hiddenY;
      translateY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      translateY.value = withTiming(
        hiddenY,
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
      if (!hasEndHandler) return;
      const nearEnd = e.contentOffset.y + e.layoutMeasurement.height >= e.contentSize.height - 240;
      if (nearEnd && endFiredAt.value !== e.contentSize.height) {
        endFiredAt.value = e.contentSize.height;
        scheduleOnRN(fireEndReached);
      }
    },
  });

  const contentGesture = Gesture.Native();
  const sheetGesture = Gesture.Pan()
    .enabled(dismissible)
    .activeOffsetY(8) // a downward drag activates; upward drags stay with the scroll view
    .failOffsetX([-24, 24])
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
        translateY.value = withSpring(hiddenY, { ...SPRING, velocity: e.velocityY }, (finished) => {
          if (finished) scheduleOnRN(onRequestClose);
        });
      } else {
        translateY.value = withSpring(0, { ...SPRING, velocity: e.velocityY });
      }
    })
    .onFinalize(() => {
      dragOrigin.value = -1;
    });
  if (dragFromContent) sheetGesture.simultaneousWithExternalGesture(contentGesture);

  const sheetStyle = useAnimatedStyle(() => {
    // Sit on top of the keyboard, shrinking if needed so the sheet never runs under the status bar.
    const kb = keyboardInset.value;
    const available = rootHeight.value - kb - topInset - 8;
    return {
      height: Math.min(sheetHeight, available),
      marginBottom: kb,
      transform: [{ translateY: translateY.value }],
    };
  });
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, sheetHeight], [1, 0], 'clamp'),
  }));

  const headerBlock = (
    <View
      collapsable={false}
      onLayout={(e) => {
        headerHeight.value = e.nativeEvent.layout.height;
        setHeaderH(e.nativeEvent.layout.height);
      }}
    >
      <View style={styles.handleArea}>
        <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
      </View>
      {header}
    </View>
  );

  const scrollView = (
    <Animated.ScrollView
      ref={scrollRef}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      bounces={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: footer ? 16 : insets.bottom + 24 }}
      onContentSizeChange={(_, h) => setContentH(h)}
    >
      {children}
    </Animated.ScrollView>
  );

  const sheet = (
    <Animated.View
      style={[styles.sheet, { backgroundColor: colors.surfaceElevated, shadowColor: colors.shadow }, sheetStyle]}
    >
      {dragFromContent ? headerBlock : <GestureDetector gesture={sheetGesture}>{headerBlock}</GestureDetector>}

      {dragFromContent ? <GestureDetector gesture={contentGesture}>{scrollView}</GestureDetector> : scrollView}

      {footer ? (
        <View
          style={[styles.footer, { borderTopColor: colors.divider, paddingBottom: insets.bottom + 12 }]}
          onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
        >
          {footer}
        </View>
      ) : null}
    </Animated.View>
  );

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={requestClose}>
      {/* Modals render outside the app root, so gestures need their own root here */}
      <GestureHandlerRootView
        style={styles.root}
        onLayout={(e) => {
          rootHeight.value = e.nativeEvent.layout.height;
          onRootLayout(e);
        }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} accessibilityLabel="Close" />
        </Animated.View>

        {dragFromContent ? <GestureDetector gesture={sheetGesture}>{sheet}</GestureDetector> : sheet}
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    elevation: 12,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
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
