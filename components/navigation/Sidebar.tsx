import { Colors } from '@/constants/Colors';
import { Radius, Shadow, withAlpha } from '@/constants/Theme';
import { useNavigationUI } from '@/contexts/NavigationUIContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthManager } from '@/utils/auth';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface NavEntry {
  key: string;
  label: string;
  icon: IoniconName;
  /** tab routes use replace; pushed routes use push; actions run onPress */
  route?: string;
  mode?: 'replace' | 'push';
  action?: 'quickAccess';
  accent?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = Math.min(320, SCREEN_WIDTH * 0.84);
const EDGE_ZONE_WIDTH = 24;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function Sidebar() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { sidebarOpen, openSidebar, closeSidebar, openQuickAccess } = useNavigationUI();

  const [displayName, setDisplayName] = useState('Student');
  const [userId, setUserId] = useState<string | null>(null);

  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  // Tracks in-flight swipe gestures so the open/close effect below doesn't
  // fight the manual drag animation, and lets releases snap to nearest edge.
  const isDragging = useRef(false);
  const fractionRef = useRef(0);
  const dragBaseFraction = useRef(0);
  const suppressNextAnim = useRef(false);

  // Load profile info whenever the sidebar opens
  useEffect(() => {
    if (!sidebarOpen) return;
    (async () => {
      try {
        const [nick, creds, id] = await Promise.all([
          AuthManager.getNickname(),
          AuthManager.getCredentials(),
          AuthManager.getUserId(),
        ]);
        const uname = creds.username || '';
        const fromUsername = uname
          .split('@')[0]
          .split(/[._]/)
          .filter(Boolean)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ');
        setDisplayName(nick || fromUsername || 'Student');
        setUserId(id);
      } catch {
        // profile is best-effort
      }
    })();
  }, [sidebarOpen]);

  // Drive open/close animation
  useEffect(() => {
    if (suppressNextAnim.current) {
      suppressNextAnim.current = false;
      return;
    }
    if (isDragging.current) return;
    if (sidebarOpen) {
      setMounted(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [sidebarOpen, anim, mounted]);

  // Snap to the nearest edge at the end of a swipe gesture and sync context state.
  const finishDrag = useCallback(
    (vx: number) => {
      isDragging.current = false;
      const shouldOpen = vx > 0.5 ? true : vx < -0.5 ? false : fractionRef.current > 0.5;
      suppressNextAnim.current = true;
      Animated.timing(anim, {
        toValue: shouldOpen ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !shouldOpen) setMounted(false);
      });
      if (shouldOpen) openSidebar();
      else closeSidebar();
    },
    [anim, openSidebar, closeSidebar]
  );

  // Swipe from the left screen edge to open the sidebar.
  const edgeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        gesture.dx > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderGrant: () => {
        isDragging.current = true;
        fractionRef.current = 0;
        setMounted(true);
        anim.setValue(0);
      },
      onPanResponderMove: (_evt, gesture) => {
        const fraction = clamp(gesture.dx / PANEL_WIDTH, 0, 1);
        fractionRef.current = fraction;
        anim.setValue(fraction);
      },
      onPanResponderRelease: (_evt, gesture) => finishDrag(gesture.vx),
      onPanResponderTerminate: (_evt, gesture) => finishDrag(gesture.vx),
    })
  ).current;

  // Swipe left on the open panel to close it.
  const panelResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        gesture.dx < -8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderGrant: () => {
        isDragging.current = true;
        anim.stopAnimation((value) => {
          dragBaseFraction.current = value;
        });
      },
      onPanResponderMove: (_evt, gesture) => {
        const fraction = clamp(dragBaseFraction.current + gesture.dx / PANEL_WIDTH, 0, 1);
        fractionRef.current = fraction;
        anim.setValue(fraction);
      },
      onPanResponderRelease: (_evt, gesture) => finishDrag(gesture.vx),
      onPanResponderTerminate: (_evt, gesture) => finishDrag(gesture.vx),
    })
  ).current;

  const navigate = useCallback(
    (entry: NavEntry) => {
      closeSidebar();
      // let the close animation start before navigating
      setTimeout(() => {
        if (entry.action === 'quickAccess') {
          openQuickAccess();
          return;
        }
        if (!entry.route) return;
        if (entry.mode === 'replace') router.replace(entry.route as any);
        else router.push(entry.route as any);
      }, 60);
    },
    [closeSidebar, openQuickAccess]
  );

  const logout = useCallback(() => {
    closeSidebar();
    setTimeout(async () => {
      await AuthManager.userLogout();
      router.replace('/login');
    }, 120);
  }, [closeSidebar]);

  const primary: NavEntry[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', route: '/(tabs)/dashboard', mode: 'replace' },
    { key: 'grades', label: 'Grades', icon: 'school-outline', route: '/(tabs)/grades', mode: 'replace' },
    { key: 'schedule', label: 'Schedule', icon: 'calendar-outline', route: '/(tabs)/schedule', mode: 'replace' },
    { key: 'transcript', label: 'Transcript', icon: 'document-text-outline', route: '/(tabs)/transcript', mode: 'replace' },
  ];

  const services: NavEntry[] = [
    { key: 'instructors', label: 'Instructors', icon: 'people-outline', route: '/instructors', mode: 'push', accent: colors.secondary },
    { key: 'cms', label: 'CMS · Materials', icon: 'document-attach-outline', route: '/cms/home', mode: 'push', accent: colors.info },
    { key: 'attendance', label: 'Attendance', icon: 'checkmark-circle-outline', route: '/attendance', mode: 'push', accent: colors.success },
    { key: 'exam-seats', label: 'Exam Seats', icon: 'grid-outline', route: '/exam-seats', mode: 'push', accent: colors.primary },
    { key: 'eval-course', label: 'Evaluate Courses', icon: 'star-outline', route: '/evaluation/course', mode: 'push', accent: colors.warning },
    { key: 'eval-staff', label: 'Evaluate Staff', icon: 'ribbon-outline', route: '/evaluation/staff', mode: 'push', accent: colors.warning },
    { key: 'dates', label: 'Important Dates', icon: 'calendar-number-outline', route: '/dates', mode: 'push', accent: colors.info },
    { key: 'quick', label: 'Quick Access', icon: 'folder-open-outline', action: 'quickAccess', accent: colors.cms },
  ];

  const account: NavEntry[] = [
    // { key: 'notifications', label: 'Notifications', icon: 'notifications-outline', route: '/notifications', mode: 'push' },
    { key: 'settings', label: 'Settings', icon: 'settings-outline', route: '/(tabs)/settings', mode: 'replace' },
  ];

  const isActive = (entry: NavEntry) => {
    if (!entry.route) return false;
    const tail = entry.route.replace('/(tabs)', '');
    return pathname === tail || pathname === entry.route || pathname.endsWith(tail);
  };

  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-PANEL_WIDTH - 24, 0] });

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('');

  const renderItem = (entry: NavEntry) => {
    const active = isActive(entry);
    const accent = entry.accent || colors.primary;
    return (
      <TouchableOpacity
        key={entry.key}
        activeOpacity={0.7}
        onPress={() => navigate(entry)}
        style={[
          styles.item,
          active && { backgroundColor: withAlpha(colors.primary, 0.12) },
        ]}
      >
        {active && <View style={[styles.activeBar, { backgroundColor: colors.primary }]} />}
        <View style={[styles.itemIcon, { backgroundColor: withAlpha(active ? colors.primary : accent, 0.14) }]}>
          <Ionicons name={entry.icon} size={19} color={active ? colors.primary : accent} />
        </View>
        <Text
          style={[
            styles.itemLabel,
            { color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '700' : '600' },
          ]}
          numberOfLines={1}
        >
          {entry.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Edge zone: swipe right from the left screen edge to open */}
      <View style={styles.edgeZone} {...edgeResponder.panHandlers} />

      {mounted && (
        <>
          {/* Backdrop */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]} pointerEvents={sidebarOpen ? 'auto' : 'none'}>
            <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={closeSidebar} />
          </Animated.View>

          {/* Panel */}
          <Animated.View
            {...panelResponder.panHandlers}
            style={[
              styles.panel,
              {
                width: PANEL_WIDTH,
                paddingTop: insets.top + 20,
                backgroundColor: colors.surface,
                borderRightColor: colors.border,
                transform: [{ translateX }],
              },
              Shadow.lg(colors),
            ]}
          >
        {/* Profile header */}
        <View style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }, Shadow.glow(colors.primary)]}>
            <Text style={styles.avatarText}>{initials || 'U'}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]} numberOfLines={1}>
              {displayName}
            </Text>
            {userId ? (
              <Text style={[styles.profileId, { color: colors.textSecondary }]} numberOfLines={1}>
                {userId}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={closeSidebar} style={styles.closeBtn} activeOpacity={0.7} accessibilityLabel="Close menu">
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.headerDivider, { backgroundColor: colors.divider }]} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          {primary.map(renderItem)}

          <Text style={[styles.groupLabel, { color: colors.textTertiary }]}>SERVICES</Text>
          {services.map(renderItem)}

          <Text style={[styles.groupLabel, { color: colors.textTertiary }]}>ACCOUNT</Text>
          {account.map(renderItem)}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.divider, paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={logout}
            style={[styles.logout, { backgroundColor: withAlpha(colors.danger, 0.12) }]}
          >
            <Ionicons name="log-out-outline" size={19} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>Log Out</Text>
          </TouchableOpacity>
        </View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  edgeZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: EDGE_ZONE_WIDTH,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: 1,
    borderTopRightRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  profileText: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  profileId: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  headerDivider: {
    height: 1,
    marginHorizontal: 18,
    marginBottom: 8,
  },
  scrollBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 6,
    marginLeft: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    marginVertical: 2,
    overflow: 'hidden',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemLabel: {
    flex: 1,
    fontSize: 14.5,
    letterSpacing: -0.1,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: Radius.md,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
