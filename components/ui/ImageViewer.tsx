/**
 * Full-screen image viewer: pinch to zoom, drag to pan when zoomed,
 * double-tap to zoom in/out, swipe down to dismiss, tap to toggle the chrome.
 * Built only on gesture-handler + reanimated (already in the native build).
 */
import { Radius, Spacing } from '@/constants/Theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StatusBar, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface ImageViewerAction {
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ImageViewerProps {
  visible: boolean;
  uri: string | null;
  title?: string;
  subtitle?: string;
  actions?: ImageViewerAction[];
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_DISTANCE = 120;
const SPRING = { damping: 22, stiffness: 220, mass: 0.8 };

export function ImageViewer({ visible, uri, title, subtitle, actions = [], onClose }: ImageViewerProps) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);

  // Size of the image as laid out with resizeMode="contain"
  const fitW = useSharedValue(W);
  const fitH = useSharedValue(H);

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const dismissY = useSharedValue(0);
  const appear = useSharedValue(0);
  const chrome = useSharedValue(1);

  const start = useSharedValue({ scale: 1, tx: 0, ty: 0 });
  const focal = useSharedValue({ x: 0, y: 0 });
  // Pan keeps its own origin so it never clobbers the pinch's starting values
  const panOrigin = useSharedValue({ x: 0, y: 0 });

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setFailed(false);
      setChromeVisible(true);
      scale.value = 1;
      tx.value = 0;
      ty.value = 0;
      dismissY.value = 0;
      chrome.value = 1;
      appear.value = 0;
      appear.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    }
  }, [visible, uri, scale, tx, ty, dismissY, chrome, appear]);

  useEffect(() => {
    chrome.value = withTiming(chromeVisible ? 1 : 0, { duration: 180 });
  }, [chromeVisible, chrome]);

  const close = () => {
    appear.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) scheduleOnRN(onClose);
    });
  };

  const toggleChrome = () => setChromeVisible(v => !v);

  // Furthest the image may travel at a given scale before showing empty space
  const bounds = (s: number) => {
    'worklet';
    return {
      x: Math.max(0, (fitW.value * s - W) / 2),
      y: Math.max(0, (fitH.value * s - H) / 2),
    };
  };

  const clamp = (v: number, lo: number, hi: number) => {
    'worklet';
    return Math.min(hi, Math.max(lo, v));
  };

  const settle = () => {
    'worklet';
    if (scale.value <= MIN_SCALE) {
      scale.value = withSpring(1, SPRING);
      tx.value = withSpring(0, SPRING);
      ty.value = withSpring(0, SPRING);
      return;
    }
    const s = Math.min(scale.value, MAX_SCALE);
    if (scale.value > MAX_SCALE) scale.value = withSpring(MAX_SCALE, SPRING);
    const b = bounds(s);
    tx.value = withSpring(clamp(tx.value, -b.x, b.x), SPRING);
    ty.value = withSpring(clamp(ty.value, -b.y, b.y), SPRING);
  };

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      start.value = { scale: scale.value, tx: tx.value, ty: ty.value };
      // Remember the focal point relative to the image centre
      focal.value = { x: e.focalX - W / 2, y: e.focalY - H / 2 };
    })
    .onUpdate((e) => {
      const s0 = start.value.scale;
      const next = clamp(s0 * e.scale, 0.6, MAX_SCALE * 1.4);
      const { x: fx, y: fy } = focal.value;
      // Keep the pinch focal point under the fingers
      const ratio = next / s0;
      tx.value = fx - (fx - start.value.tx) * ratio;
      ty.value = fy - (fy - start.value.ty) * ratio;
      scale.value = next;
    })
    .onEnd(() => {
      settle();
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      panOrigin.value = { x: tx.value, y: ty.value };
    })
    .onUpdate((e) => {
      if (e.numberOfPointers > 1) {
        // Pinch owns the transform; re-anchor so lifting a finger doesn't jump
        panOrigin.value = { x: tx.value - e.translationX, y: ty.value - e.translationY };
        return;
      }
      if (scale.value > 1.01) {
        tx.value = panOrigin.value.x + e.translationX;
        ty.value = panOrigin.value.y + e.translationY;
      } else {
        // Not zoomed: vertical drag dismisses
        dismissY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      // Pinched below 1x: the pinch's settle() springs it back
      if (scale.value < 0.99) return;
      if (scale.value > 1.01) {
        const b = bounds(scale.value);
        tx.value = withDecay({ velocity: e.velocityX, clamp: [-b.x, b.x] });
        ty.value = withDecay({ velocity: e.velocityY, clamp: [-b.y, b.y] });
        return;
      }
      if (Math.abs(dismissY.value) > DISMISS_DISTANCE || Math.abs(e.velocityY) > 1000) {
        const dir = dismissY.value >= 0 ? 1 : -1;
        dismissY.value = withTiming(dir * H, { duration: 200 });
        appear.value = withTiming(0, { duration: 200 }, (finished) => {
          if (finished) scheduleOnRN(onClose);
        });
      } else {
        dismissY.value = withSpring(0, SPRING);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(260)
    .onEnd((e) => {
      if (scale.value > 1.01) {
        scale.value = withSpring(1, SPRING);
        tx.value = withSpring(0, SPRING);
        ty.value = withSpring(0, SPRING);
      } else {
        const px = e.x - W / 2;
        const py = e.y - H / 2;
        const b = bounds(DOUBLE_TAP_SCALE);
        scale.value = withSpring(DOUBLE_TAP_SCALE, SPRING);
        tx.value = withSpring(clamp(-px * (DOUBLE_TAP_SCALE - 1), -b.x, b.x), SPRING);
        ty.value = withSpring(clamp(-py * (DOUBLE_TAP_SCALE - 1), -b.y, b.y), SPRING);
      }
    });

  const singleTap = Gesture.Tap()
    .requireExternalGestureToFail(doubleTap)
    .onEnd(() => {
      scheduleOnRN(toggleChrome);
    });

  const gesture = Gesture.Simultaneous(
    Gesture.Simultaneous(pinch, pan),
    Gesture.Exclusive(doubleTap, singleTap),
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: appear.value * interpolate(Math.abs(dismissY.value), [0, H * 0.5], [1, 0.2], 'clamp'),
  }));

  const imageStyle = useAnimatedStyle(() => {
    const drag = Math.abs(dismissY.value);
    const shrink = interpolate(drag, [0, H], [1, 0.75], 'clamp');
    return {
      opacity: appear.value,
      transform: [
        { translateX: tx.value },
        { translateY: ty.value + dismissY.value },
        { scale: scale.value * shrink * interpolate(appear.value, [0, 1], [0.94, 1]) },
      ],
    };
  });

  const chromeStyle = useAnimatedStyle(() => {
    const dragFade = interpolate(Math.abs(dismissY.value), [0, 80], [1, 0], 'clamp');
    return { opacity: chrome.value * appear.value * dragFade };
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />

        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.stage, imageStyle]}>
            {!!uri && (
              <Animated.Image
                source={{ uri }}
                style={{ width: W, height: H }}
                resizeMode="contain"
                onLoad={(e) => {
                  const src = e.nativeEvent.source;
                  if (src?.width && src?.height) {
                    const ratio = Math.min(W / src.width, H / src.height);
                    fitW.value = src.width * ratio;
                    fitH.value = src.height * ratio;
                  }
                  setLoading(false);
                }}
                onError={() => {
                  setLoading(false);
                  setFailed(true);
                }}
              />
            )}
          </Animated.View>
        </GestureDetector>

        {(loading || failed) && (
          <View style={styles.centerOverlay} pointerEvents="none">
            {failed ? (
              <>
                <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.6)" />
                <Text style={styles.overlayText}>Couldn&apos;t load this image</Text>
              </>
            ) : (
              <ActivityIndicator size="large" color="#FFFFFF" />
            )}
          </View>
        )}

        {/* Top bar */}
        <Animated.View
          style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }, chromeStyle]}
          pointerEvents={chromeVisible ? 'box-none' : 'none'}
        >
          <TouchableOpacity style={styles.roundButton} onPress={close} hitSlop={8} accessibilityLabel="Close">
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            {!!title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
            {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          </View>
          <View style={styles.roundButtonSpacer} />
        </Animated.View>

        {/* Bottom actions */}
        {actions.length > 0 && (
          <Animated.View
            style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }, chromeStyle]}
            pointerEvents={chromeVisible ? 'box-none' : 'none'}
          >
            <View style={styles.actionsPill}>
              {actions.map(action => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.action}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                  accessibilityLabel={action.label}
                >
                  <Ionicons name={action.icon} size={21} color={action.destructive ? '#FF6B5A' : '#FFFFFF'} />
                  <Text style={[styles.actionLabel, action.destructive && { color: '#FF6B5A' }]}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>Pinch or double-tap to zoom · Swipe down to close</Text>
          </Animated.View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: '#000000',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  overlayText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  roundButtonSpacer: {
    width: 40,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  actionsPill: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(30,30,30,0.85)',
  },
  action: {
    minWidth: 72,
    alignItems: 'center',
    gap: 3,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  hint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '500',
  },
});
