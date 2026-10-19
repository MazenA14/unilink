import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { SheetButtons } from '@/components/ui/SheetButtons';
import { Colors } from '@/constants/Colors';
import { Radius } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthManager } from '@/utils/auth';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface EditNicknameModalProps {
  visible: boolean;
  initialValue: string;
  onClose: () => void;
  /** Called with the trimmed nickname after it has been stored. */
  onSaved: (nickname: string) => void;
}

export default function EditNicknameModal({ visible, initialValue, onClose, onSaved }: EditNicknameModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setError(null);
    }
  }, [visible, initialValue]);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Nickname cannot be empty.');
      return;
    }
    await AuthManager.storeNickname(trimmed);
    onSaved(trimmed);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onRequestClose={onClose}
      autoHeight
      header={<SheetHeader colors={colors} title="Edit Nickname" subtitle="Shown on your dashboard" />}
      footer={
        <SheetButtons
          secondary={{ label: 'Cancel', onPress: onClose }}
          primary={{ label: 'Save', onPress: save }}
        />
      }
    >
      <View style={styles.body}>
        <TextInput
          style={[styles.textInput, {
            backgroundColor: colors.surfaceSunken,
            color: colors.mainFont,
            borderColor: error ? colors.danger : colors.border,
          }]}
          value={value}
          onChangeText={(text) => {
            setValue(text);
            if (error) setError(null);
          }}
          placeholder="Enter nickname"
          placeholderTextColor={colors.secondaryFont}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={save}
        />
        {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
});
