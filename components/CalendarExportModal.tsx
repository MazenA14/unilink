import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CalendarExportModalProps {
  visible: boolean;
  onClose: () => void;
  onExportICS: (startDate: Date, endDate: Date) => void;
  onDirectExport: (startDate: Date, endDate: Date) => void;
  isExporting?: boolean;
}

export function CalendarExportModal({
  visible,
  onClose,
  onExportICS,
  onDirectExport,
  isExporting = false,
}: CalendarExportModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000)); // 16 weeks from now
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
      // Ensure end date is after start date
      if (selectedDate >= endDate) {
        setEndDate(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000)); // 1 week later
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate && selectedDate > startDate) {
      setEndDate(selectedDate);
    }
  };

  const handleExportICS = () => {
    onExportICS(startDate, endDate);
  };

  const handleDirectExport = () => {
    onDirectExport(startDate, endDate);
  };

  return (
    <BottomSheet
      visible={visible}
      onRequestClose={isExporting ? () => {} : onClose}
      autoHeight
      heightRatio={0.9}
      header={<SheetHeader colors={colors} title="Export Schedule" subtitle="Choose a date range and where to send it" />}
    >
          <View style={styles.content}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Select Date Range
            </Text>
            
            {/* Start Date */}
            <View style={styles.dateSection}>
              <Text style={[styles.dateLabel, { color: colors.secondaryFont }]}>
                Start Date
              </Text>
              <TouchableOpacity
                style={[styles.dateButton, { 
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                }]}
                onPress={() => setShowStartDatePicker(true)}
                disabled={isExporting}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.text} />
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {formatDate(startDate)}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.secondaryFont} />
              </TouchableOpacity>
            </View>

            {/* End Date */}
            <View style={styles.dateSection}>
              <Text style={[styles.dateLabel, { color: colors.secondaryFont }]}>
                End Date
              </Text>
              <TouchableOpacity
                style={[styles.dateButton, { 
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                }]}
                onPress={() => setShowEndDatePicker(true)}
                disabled={isExporting}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.text} />
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {formatDate(endDate)}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.secondaryFont} />
              </TouchableOpacity>
            </View>

            {/* Export Options */}
            <View style={styles.optionsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Export Options
              </Text>
              
              {/* Direct Export Button */}
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  {
                    backgroundColor: colors.tint,
                    opacity: isExporting ? 0.6 : 1,
                  }
                ]}
                onPress={handleDirectExport}
                disabled={isExporting}
              >
                <Ionicons name="calendar" size={20} color={colors.onPrimary} />
                <View style={styles.buttonTextContainer}>
                  <Text style={[styles.exportButtonText, { color: colors.onPrimary }]}>Add to Calendar</Text>
                  <Text style={[styles.exportButtonSubtext, { color: colors.onPrimary }]}>
                    Add events directly to your calendar app
                  </Text>
                </View>
              </TouchableOpacity>

              {/* ICS Export Button */}
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                    borderWidth: 1,
                    opacity: isExporting ? 0.6 : 1,
                  }
                ]}
                onPress={handleExportICS}
                disabled={isExporting}
              >
                <Ionicons name="download-outline" size={20} color={colors.text} />
                <View style={styles.buttonTextContainer}>
                  <Text style={[styles.exportButtonText, { color: colors.text }]}>
                    Export ICS File
                  </Text>
                  <Text style={[styles.exportButtonSubtext, { color: colors.secondaryFont }]}>
                    Download file to import manually
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          minimumDate={new Date(startDate.getTime() + 24 * 60 * 60 * 1000)}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  dateSection: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
  },
  optionsSection: {
    marginTop: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  buttonTextContainer: {
    flex: 1,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  exportButtonSubtext: {
    fontSize: 12,
    opacity: 0.8,
  },
});
