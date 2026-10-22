import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { SheetButtons } from '@/components/ui/SheetButtons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

// Re-check on resume at most this often; the native launch check covers cold starts.
const RESUME_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Over-the-air updates download silently in the background (on launch and on resume).
 * Once one is ready this sheet offers to restart into it; if dismissed, the update
 * still applies on the next cold start.
 */
export default function OtaUpdateSheet() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);
  const lastCheck = useRef(Date.now());

  // A long-lived app never cold starts, so also look for updates when it comes back to the foreground.
  useEffect(() => {
    if (!Updates.isEnabled) return;
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || Date.now() - lastCheck.current < RESUME_CHECK_INTERVAL_MS) return;
      lastCheck.current = Date.now();
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // Offline or server unreachable; try again on a later resume.
      }
    });
    return () => sub.remove();
  }, []);

  const updateId = downloadedUpdate?.updateId ?? null;
  const visible = Updates.isEnabled && isUpdatePending && updateId !== dismissedId;

  const restart = async () => {
    setRestarting(true);
    try {
      await Updates.reloadAsync();
    } catch {
      setRestarting(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onRequestClose={() => setDismissedId(updateId)}
      autoHeight
      header={<SheetHeader colors={colors} title="Update Ready" subtitle="Downloaded in the background" />}
      footer={
        <SheetButtons
          secondary={{ label: 'Later', onPress: () => setDismissedId(updateId), disabled: restarting }}
          primary={{ label: 'Restart', icon: 'refresh', onPress: restart, loading: restarting }}
        />
      }
    >
      <View style={styles.content}>
        <View style={[styles.iconBadge, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="sparkles-outline" size={26} color={colors.primary} />
        </View>
        <Text style={[styles.description, { color: colors.mainFont }]}>
          A new version of UniLink with fixes and improvements is ready. Restart now to apply it, or it will be
          applied the next time you open the app.
        </Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
});
