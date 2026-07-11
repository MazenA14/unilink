import { Colors } from '@/constants/Colors';
import { Shadow, withAlpha } from '@/constants/Theme';
import { useNavigationUI } from '@/contexts/NavigationUIContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AppBarProps {
  title: string;
  subtitle?: string;
  /** 'menu' shows the hamburger (opens sidebar); 'back' shows a back arrow. */
  variant?: 'menu' | 'back';
  onBack?: () => void;
  /** Show the notifications bell on the right. Defaults to true. */
  showNotifications?: boolean;
  /** Extra action(s) rendered to the left of the bell. */
  rightActions?: React.ReactNode;
  /** Large title style (used on the dashboard/home). */
  large?: boolean;
}

export function AppBar({
  title,
  subtitle,
  variant = 'menu',
  onBack,
  showNotifications = true,
  rightActions,
  large = false,
}: AppBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { openSidebar } = useNavigationUI();
  const { unreadCount } = useNotifications();

  const handleLeft = () => {
    if (variant === 'back') {
      if (onBack) onBack();
      else router.back();
    } else {
      openSidebar();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={handleLeft}
          style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.xs(colors)]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={variant === 'back' ? 'Go back' : 'Open menu'}
        >
          <Ionicons name={variant === 'back' ? 'chevron-back' : 'menu'} size={22} color={colors.mainFont} />
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <Text style={[large ? styles.titleLarge : styles.title, { color: colors.mainFont }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {rightActions}
          {showNotifications && (
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.xs(colors)]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={21} color={colors.mainFont} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  titleLarge: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
