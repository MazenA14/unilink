import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing, Type, withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface InstructorProfile {
  name: string;
  email?: string;
  office?: string;
  courses?: string;
}

interface InstructorProfileModalProps {
  visible: boolean;
  onClose: () => void;
  instructorName: string;
  onFetchProfile: (instructorName: string) => Promise<InstructorProfile | null>;
}

type ThemeColors = (typeof Colors)['light'];

// Academic titles skipped when building initials ("Dr. Ahmed Ali" -> "AA")
const TITLES = new Set(['dr', 'prof', 'professor', 'eng', 'assoc', 'asst', 'mr', 'mrs', 'ms', 'miss', 'ta']);

export function getInitials(name: string): string {
  const words = name
    .split(/\s+/)
    .map(w => w.replace(/[.,()'"-]/g, ''))
    .filter(w => w && !TITLES.has(w.toLowerCase()));
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/**
 * Copies to the clipboard. expo-clipboard is a native module, so builds that
 * predate it fall back to the share sheet (which also offers "Copy").
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy so older native builds can fall back
    const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    try {
      await Share.share({ message: text });
    } catch {}
    return false;
  }
}

export function InstructorProfileModal({
  visible,
  onClose,
  instructorName,
  onFetchProfile,
}: InstructorProfileModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'office' | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!instructorName) return;

    setLoading(true);
    setError(null);

    try {
      const profileData = await onFetchProfile(instructorName);
      if (profileData) {
        setProfile(profileData);
      } else {
        setError('Unable to load instructor profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [instructorName, onFetchProfile]);

  useEffect(() => {
    if (visible && instructorName) {
      fetchProfile();
    } else {
      setProfile(null);
      setError(null);
      setCopiedField(null);
    }
  }, [visible, instructorName, fetchProfile]);

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  const handleEmailPress = useCallback(() => {
    if (profile?.email) {
      Linking.openURL(`mailto:${profile.email}`);
    }
  }, [profile?.email]);

  const handleCopy = useCallback(async (field: 'email' | 'office', value?: string) => {
    if (!value) return;
    if (await copyToClipboard(value)) {
      setCopiedField(field);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopiedField(null), 1600);
    }
  }, []);

  const displayName = profile?.name || instructorName;

  const renderHero = () => (
    <View style={styles.hero}>
      <View style={[styles.avatarRing, { borderColor: withAlpha(colors.tint, 0.25) }]}>
        <View style={[styles.avatar, { backgroundColor: colors.tint }, Shadow.glow(colors.tint)]}>
          <Text style={[styles.avatarText, { color: colors.onPrimary }]}>{getInitials(displayName)}</Text>
        </View>
      </View>
      <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>
        {displayName}
      </Text>
      <View style={[styles.roleChip, { backgroundColor: withAlpha(colors.secondary, 0.14) }]}>
        <Ionicons name="school" size={12} color={colors.secondary} />
        <Text style={[styles.roleChipText, { color: colors.secondary }]}>Instructor</Text>
      </View>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return <ProfileSkeleton colors={colors} />;
    }

    if (error) {
      return (
        <View style={[styles.stateCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.stateIcon, { backgroundColor: withAlpha(colors.error, 0.12) }]}>
            <Ionicons name="cloud-offline-outline" size={26} color={colors.error} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>Couldn&apos;t load profile</Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={fetchProfile}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color={colors.onPrimary} />
            <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!profile || (!profile.email && !profile.office)) {
      return (
        <View style={[styles.stateCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.stateIcon, { backgroundColor: withAlpha(colors.textTertiary, 0.16) }]}>
            <Ionicons name="document-text-outline" size={26} color={colors.textSecondary} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>No details listed</Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>
            This instructor hasn&apos;t published contact or office info yet.
          </Text>
        </View>
      );
    }

    return (
      <>
        {profile.email && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryAction, { backgroundColor: colors.tint }, Shadow.glow(colors.tint)]}
              onPress={handleEmailPress}
              activeOpacity={0.85}
            >
              <Ionicons name="mail" size={18} color={colors.onPrimary} />
              <Text style={[styles.primaryActionText, { color: colors.onPrimary }]}>Send email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleCopy('email', profile.email)}
              activeOpacity={0.7}
              accessibilityLabel="Copy email"
            >
              <Ionicons
                name={copiedField === 'email' ? 'checkmark' : 'copy-outline'}
                size={18}
                color={copiedField === 'email' ? colors.success : colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Details</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          {profile.email && (
            <InfoRow
              colors={colors}
              icon="mail-outline"
              accent={colors.tint}
              label="Email"
              value={profile.email}
              copied={copiedField === 'email'}
              onPress={handleEmailPress}
              onLongPress={() => handleCopy('email', profile.email)}
            />
          )}
          {profile.email && profile.office && (
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          )}
          {profile.office && (
            <InfoRow
              colors={colors}
              icon="location-outline"
              accent={colors.secondary}
              label="Office"
              value={profile.office}
              copied={copiedField === 'office'}
              onPress={() => handleCopy('office', profile.office)}
            />
          )}
        </View>
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          {profile.email ? 'Long-press the email to copy it' : 'Tap the office to copy it'}
        </Text>
      </>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onRequestClose={onClose}
      autoHeight
      heightRatio={0.85}
      header={<SheetHeader colors={colors} title="Instructor Profile" />}
    >
      <View style={styles.modalContent}>
        {renderHero()}
        {renderContent()}
      </View>
    </BottomSheet>
  );
}

function InfoRow({
  colors,
  icon,
  accent,
  label,
  value,
  copied,
  onPress,
  onLongPress,
}: {
  colors: ThemeColors;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  label: string;
  value: string;
  copied: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.infoRow} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.6}>
      <View style={[styles.infoIcon, { backgroundColor: withAlpha(accent, 0.14) }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={styles.infoBody}>
        <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }]} selectable>
          {value}
        </Text>
      </View>
      {copied ? (
        <View style={[styles.copiedBadge, { backgroundColor: withAlpha(colors.success, 0.14) }]}>
          <Ionicons name="checkmark" size={12} color={colors.success} />
          <Text style={[styles.copiedText, { color: colors.success }]}>Copied</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
}

function ProfileSkeleton({ colors }: { colors: ThemeColors }) {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const bar = (width: number | `${number}%`, height: number) => (
    <View style={{ width, height, borderRadius: Radius.xs, backgroundColor: colors.surfaceSunken }} />
  );

  return (
    <Animated.View style={{ opacity: pulse }}>
      <View style={[styles.skeletonAction, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="small" color={colors.tint} />
      </View>
      <View style={[styles.infoCard, styles.skeletonCard, { backgroundColor: colors.surface }]}>
        {[0, 1].map(i => (
          <View key={i} style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.surfaceSunken }]} />
            <View style={[styles.infoBody, { gap: Spacing.xs + 2 }]}>
              {bar(56, 10)}
              {bar('75%', 14)}
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.lg,
  },
  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  avatarRing: {
    padding: 5,
    borderRadius: Radius.pill,
    borderWidth: 2,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  name: {
    ...Type.h2,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  roleChipText: {
    ...Type.caption,
  },
  // Actions
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
    marginBottom: Spacing.xxl,
  },
  primaryAction: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
  },
  primaryActionText: {
    ...Type.bodyStrong,
  },
  secondaryAction: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Details card
  sectionLabel: {
    ...Type.overline,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  infoCard: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md + 2,
    gap: Spacing.md,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBody: {
    flex: 1,
  },
  infoLabel: {
    ...Type.caption,
    marginBottom: 2,
  },
  infoValue: {
    ...Type.body,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 38 + Spacing.md,
  },
  copiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  copiedText: {
    ...Type.caption,
    fontSize: 11,
  },
  hint: {
    ...Type.caption,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  // Loading / error / empty
  skeletonAction: {
    height: 50,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl + Spacing.lg + Spacing.sm,
  },
  skeletonCard: {
    paddingVertical: Spacing.xs,
  },
  stateCard: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  stateTitle: {
    ...Type.h3,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  stateText: {
    ...Type.subtext,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 3,
    borderRadius: Radius.pill,
  },
  retryButtonText: {
    ...Type.callout,
  },
});
