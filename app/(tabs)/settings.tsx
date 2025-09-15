import { useCustomAlert } from '@/components/CustomAlert';
import { Colors } from '@/constants/Colors';
import { useShiftedSchedule } from '@/contexts/ShiftedScheduleContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthManager } from '@/utils/auth';
import { GUCAPIProxy, PaymentItem } from '@/utils/gucApiProxy';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();
  const { themePreference, setThemePreference } = useTheme();
  const { isShiftedScheduleEnabled, setShiftedScheduleEnabled } = useShiftedSchedule();
  const [displayName, setDisplayName] = useState<string>('');
  const [editVisible, setEditVisible] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [payingIndex, setPayingIndex] = useState<number | null>(null);

  const isDark = useMemo(() => themePreference === 'dark' || (themePreference === 'system' && (colorScheme === 'dark')), [themePreference, colorScheme]);

  useEffect(() => {
    (async () => {
      const [creds, nick, storedId] = await Promise.all([
        AuthManager.getCredentials(),
        AuthManager.getNickname(),
        AuthManager.getUserId(),
      ]);
      const username = creds.username || '';
      const formattedFromUsername = username
        .split('@')[0]
        .split('.')
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
      setDisplayName(nick || formattedFromUsername || '');
      setUserId(storedId);

      if (!storedId) {
        const fetched = await GUCAPIProxy.getUserId();
        if (fetched) {
          setUserId(fetched);
          await AuthManager.storeUserId(fetched);
        }
      }

      try {
        setLoadingPayments(true);
        const data = await GUCAPIProxy.getOutstandingPayments();
        setPayments(data);
      } catch {
        setPayments([]);
      } finally {
        setLoadingPayments(false);
      }
    })();
  }, []);

  const openEditNickname = () => {
    setEditValue(displayName);
    setEditVisible(true);
  };

  const saveNickname = async () => {
    const trimmed = editValue.trim();
    if (trimmed.length === 0) {
      setEditVisible(false);
      return;
    }
    await AuthManager.storeNickname(trimmed);
    setDisplayName(trimmed);
    setEditVisible(false);
  };

  const handleLogout = async () => {
    showAlert({
      title: 'Logout',
      message: 'Are you sure you want to logout?\nThis will clear all your saved data',
      type: 'warning',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AuthManager.clearSessionCookie();
            router.replace('/login');
          },
        },
      ],
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.mainFont }]}>Settings</Text>

        {/* Profile Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryFont, marginTop: 0 }]}>PROFILE</Text>
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}> 
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>
                {displayName || ' '}{userId ? `  ·  ${userId}` : ''}
              </Text>
              <TouchableOpacity onPress={openEditNickname}>
                <Text style={[styles.secondaryText, { color: colors.tabColor }]}>Edit Nickname</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Financials Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>FINANCIALS</Text>
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}> 
          {loadingPayments ? (
            <View style={styles.rowBetween}>
              <ActivityIndicator size="small" color={colors.tabColor} />
            </View>
          ) : payments.length === 0 ? (
            <View style={styles.rowBetween}>
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>No outstanding payments</Text>
            </View>
          ) : (
            <View>
              {payments.map((p: any, idx: number) => (
                <View key={idx} style={[styles.paymentRow, { borderColor: colors.border, borderTopWidth: idx === 0 ? 0 : 1 }]}> 
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.primaryText, { color: colors.mainFont }]}>
                      {p.description}
                    </Text>
                    <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>
                      Due {p.dueDate}
                    </Text>
                  </View>
                  <Text style={[styles.paymentAmount, { color: colors.financials }]}>
                    {p.currency} {p.amount.toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    disabled={!p.eventTarget || payingIndex === idx}
                    onPress={async () => {
                      if (!p.eventTarget) return;
                      try {
                        setPayingIndex(idx);
                        const redirectUrl = await GUCAPIProxy.payOutstanding(p.eventTarget);
                        if (redirectUrl) {
                          const supported = await Linking.canOpenURL(redirectUrl);
                          if (supported) {
                            await Linking.openURL(redirectUrl);
                          } else {
                            showAlert({
                              title: 'Payment',
                              message: 'Unable to initiate payment. Please try again from the portal.',
                              type: 'error',
                              buttons: [{ text: 'Close', style: 'cancel' }],
                            });
                          }
                        } else {
                          // If no URL returned, refresh list anyway
                          const refreshed = await GUCAPIProxy.getOutstandingPayments();
                          setPayments(refreshed);
                        }
                      } catch {
                        showAlert({
                          title: 'Payment',
                          message: 'Unable to initiate payment. Please try again from the portal.',
                          type: 'error',
                          buttons: [{ text: 'Close', style: 'cancel' }],
                        });
                      } finally {
                        setPayingIndex(null);
                      }
                    }}
                    style={[styles.payBtn, { backgroundColor: (!p.eventTarget ? colors.border : colors.tabColor) }]}
                  >
                    {payingIndex === idx ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <Text style={[styles.payBtnText, { color: colors.background }]}>Pay</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}> 
          <View style={styles.rowBetween}>
            <Text style={[styles.primaryText, { color: colors.mainFont }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={(val) => setThemePreference(val ? 'dark' : 'light')}
              trackColor={{ false: colors.border, true: colors.tabColor }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.primaryText, { color: colors.mainFont }]}>Delayed 3rd Slot</Text>
              <Text style={[styles.secondaryText, { color: colors.secondaryFont }]}>* For Pharmacy, Applied Arts and Law Students (11:45 -&gt; 12:00)</Text>
            </View>
            <Switch
              value={isShiftedScheduleEnabled}
              onValueChange={setShiftedScheduleEnabled}
              trackColor={{ false: colors.border, true: colors.tabColor }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Support & Actions */}
        <Text style={[styles.sectionTitle, { color: colors.secondaryFont }]}>SUPPORT</Text>
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3', borderColor: colors.border }]}> 
          <TouchableOpacity
            style={styles.rowBetween}
            onPress={async () => {
              const email = 'example@gmail.com';
              showAlert({
                title: 'Contact',
                message: email,
                type: 'info',
                buttons: [
                  {
                    text: 'Close',
                    style: 'cancel',
                  },
                ],
              });
            }}
          >
            <Text style={[styles.primaryText, { color: colors.mainFont }]}>Contact</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.rowBetween} onPress={handleLogout}>
            <Text style={[styles.logoutLabel, { color: colors.tabColor }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
      <AlertComponent />
      <Modal transparent visible={editVisible} animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}> 
            <Text style={[styles.modalTitle, { color: colors.mainFont }]}>Edit Nickname</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.mainFont }]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder="Enter display name"
              placeholderTextColor={colors.secondaryFont}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => setEditVisible(false)}>
                <Text style={[styles.modalBtnText, { color: colors.mainFont }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnPrimary, { backgroundColor: colors.tabColor }]} onPress={saveNickname}>
                <Text style={[styles.modalBtnPrimaryText, { color: colors.background }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryText: {
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryText: {
    fontSize: 14,
    marginTop: 4,
  },
  balanceText: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
  },
  payNowBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payNowText: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  logoutLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalBtnPrimary: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 12,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 12,
  },
  payBtn: {
    marginLeft: 12,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
