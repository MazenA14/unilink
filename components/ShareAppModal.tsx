import { Colors } from '@/constants/Colors';
import { Radius, withAlpha } from '@/constants/Theme';
import { UPDATE_DOWNLOAD_LINK } from '@/constants/Version';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Core encoder only — pure JS, so no native QR/SVG module is needed
import { create as createQR } from 'qrcode';

interface ShareAppModalProps {
  visible: boolean;
  onClose: () => void;
}

const QR_SIZE = 220;
// Blank modules around the code so scanners can find its edges
const QUIET_ZONE = 2;

/**
 * Copies to the clipboard. expo-clipboard is a native module, so builds that
 * predate it fall back to the share sheet (which also offers "Copy").
 */
async function copyToClipboard(text: string): Promise<'copied' | 'shared' | 'failed'> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy so older native builds can fall back
    const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return 'copied';
  } catch {
    try {
      await Share.share({ message: text });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
}

/** Renders a QR code with plain Views, merging consecutive dark modules into one bar per run. */
function QRCode({ value, size }: { value: string; size: number }) {
  const rows = useMemo(() => {
    const { modules } = createQR(value, { errorCorrectionLevel: 'M' });
    const result: { start: number; length: number }[][] = [];
    for (let y = 0; y < modules.size; y++) {
      const runs: { start: number; length: number }[] = [];
      let x = 0;
      while (x < modules.size) {
        if (modules.get(y, x)) {
          const start = x;
          while (x < modules.size && modules.get(y, x)) x++;
          runs.push({ start, length: x - start });
        } else {
          x++;
        }
      }
      result.push(runs);
    }
    return result;
  }, [value]);

  const count = rows.length + QUIET_ZONE * 2;
  const cell = size / count;

  return (
    <View style={{ width: size, height: size, backgroundColor: '#FFFFFF' }}>
      {rows.map((runs, y) =>
        runs.map((run) => (
          <View
            key={`${y}-${run.start}`}
            style={{
              position: 'absolute',
              top: (y + QUIET_ZONE) * cell,
              left: (run.start + QUIET_ZONE) * cell,
              // Slight overlap hides hairline gaps from fractional sizes
              width: run.length * cell + 0.5,
              height: cell + 0.5,
              backgroundColor: '#000000',
            }}
          />
        ))
      )}
    </View>
  );
}

export default function ShareAppModal({ visible, onClose }: ShareAppModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) setCopied(false);
  }, [visible]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    const result = await copyToClipboard(UPDATE_DOWNLOAD_LINK);
    if (result === 'copied') setCopied(true);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        {/* Inner Pressable swallows taps so only the backdrop closes the modal */}
        <Pressable style={[styles.content, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Share UniLink</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Scan the code or send the link to download the app.
          </Text>

          <View style={[styles.qrFrame, { borderColor: colors.border }]}>
            <QRCode value={UPDATE_DOWNLOAD_LINK} size={QR_SIZE} />
          </View>

          <View style={[styles.linkRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text
              selectable={false}
              numberOfLines={1}
              ellipsizeMode="middle"
              style={[styles.linkText, { color: colors.textPrimary }]}
            >
              {UPDATE_DOWNLOAD_LINK}
            </Text>
            <TouchableOpacity
              onPress={copy}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Copy link"
              style={[
                styles.copyBtn,
                { backgroundColor: withAlpha(copied ? colors.success : colors.primary, 0.14) },
              ]}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={18}
                color={copied ? colors.success : colors.primary}
              />
            </TouchableOpacity>
          </View>
          {/* Always rendered so the modal doesn't grow when the confirmation appears */}
          <Text style={[styles.copiedText, { color: colors.success, opacity: copied ? 1 : 0 }]}>
            Link copied
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '86%',
    maxWidth: 380,
    padding: 22,
    borderRadius: Radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 18,
  },
  qrFrame: {
    alignSelf: 'center',
    padding: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    marginRight: 8,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copiedText: {
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});
