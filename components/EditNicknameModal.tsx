import { Colors } from '@/constants/Colors';
import { Radius } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthManager } from '@/utils/auth';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.modalTitle, { color: colors.mainFont }]}>Edit Nickname</Text>
          <TextInput
            style={[styles.textInput, {
              backgroundColor: colors.background,
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
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.modalButtonText, { color: colors.mainFont }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.tabColor }]} onPress={save}>
              <Text style={[styles.modalButtonText, { color: colors.background }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '84%',
    padding: 24,
    borderRadius: Radius.xl,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
