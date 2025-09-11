import { Colors, ScheduleTypeColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScheduleOption, ScheduleType } from './types';

interface ScheduleSelectorProps {
  type: ScheduleType;
  options: ScheduleOption[];
  selectedValue: string;
  onSelectionChange: (value: string) => void;
  placeholder: string;
  loading?: boolean;
}

export function ScheduleSelector({ 
  type, 
  options, 
  selectedValue, 
  onSelectionChange, 
  placeholder,
  loading = false 
}: ScheduleSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [modalVisible, setModalVisible] = useState(false);
  const typeColor = ScheduleTypeColors[type];

  const selectedOption = options.find(option => option.id === selectedValue);

  const handleSelection = (optionId: string) => {
    onSelectionChange(optionId);
    setModalVisible(false);
  };

  if (type === 'personal') {
    return null; // Personal schedule doesn't need a selector
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.selectorButton,
          {
            backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3',
            borderColor: typeColor,
          },
        ]}
        onPress={() => setModalVisible(true)}
        disabled={loading}
      >
        <View style={styles.selectorContent}>
          <Text style={[styles.selectorIcon, { color: typeColor }]}>
            {type === 'staff' ? '👨‍🏫' : type === 'course' ? '📚' : '👥'}
          </Text>
          <View style={styles.selectorTextContainer}>
            <Text style={[styles.selectorLabel, { color: colors.secondaryFont }]}>
              {type === 'staff' ? 'Select Staff Member' : 
               type === 'course' ? 'Select Course' : 'Select Group'}
            </Text>
            <Text 
              style={[styles.selectorValue, { color: colors.mainFont }]}
              numberOfLines={1}
            >
              {loading ? 'Loading...' : selectedOption?.name || placeholder}
            </Text>
          </View>
          <Text style={[styles.selectorArrow, { color: colors.secondaryFont }]}>▼</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            { backgroundColor: colors.cardBackground }
          ]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.mainFont }]}>
                {type === 'staff' ? 'Select Staff Member' : 
                 type === 'course' ? 'Select Course' : 'Select Group'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.closeButtonText, { color: colors.secondaryFont }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.optionsList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor: selectedValue === option.id ? typeColor + '20' : 'transparent',
                      borderBottomColor: colors.border,
                    }
                  ]}
                  onPress={() => handleSelection(option.id)}
                >
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionName, { color: colors.mainFont }]}>
                      {option.name}
                    </Text>
                    {option.department && (
                      <Text style={[styles.optionDepartment, { color: colors.secondaryFont }]}>
                        {option.department}
                      </Text>
                    )}
                    {option.additionalInfo && (
                      <Text style={[styles.optionAdditionalInfo, { color: colors.secondaryFont }]}>
                        {option.additionalInfo}
                      </Text>
                    )}
                  </View>
                  {selectedValue === option.id && (
                    <Text style={[styles.selectedIndicator, { color: typeColor }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  selectorButton: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectorArrow: {
    fontSize: 12,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDepartment: {
    fontSize: 14,
    marginBottom: 2,
  },
  optionAdditionalInfo: {
    fontSize: 12,
  },
  selectedIndicator: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
});
