import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { SheetButtons } from '@/components/ui/SheetButtons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { StyleSheet, Text, View } from 'react-native';

interface WhatsNewModalProps {
  visible: boolean;
  onClose: () => void;
  features: string[];
  version: string;
}

export default function WhatsNewModal({ 
  visible, 
  onClose, 
  features, 
  version 
}: WhatsNewModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <BottomSheet
      visible={visible}
      onRequestClose={onClose}
      autoHeight
      heightRatio={0.85}
      header={<SheetHeader colors={colors} title="What's New" subtitle={`Version ${version}`} />}
      footer={<SheetButtons primary={{ label: 'Got it!', onPress: onClose }} />}
    >
            <View style={styles.content}>
              <Text style={[styles.description, { color: colors.mainFont }]}>
                Here&apos;s what&apos;s new in this update:
              </Text>
              
              <View style={styles.featuresList}>
                {features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <View style={[styles.bulletPoint, { backgroundColor: colors.tabColor }]} />
                    <Text style={[styles.featureText, { color: colors.mainFont }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
    flexShrink: 0,
  },
  featureText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
});
