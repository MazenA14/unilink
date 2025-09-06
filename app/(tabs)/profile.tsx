import { useCustomAlert } from '@/components/CustomAlert';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthManager } from '@/utils/auth';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();

  const handleLogout = async () => {
    showAlert({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.mainFont }]}>Profile</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryFont }]}>
          Manage your account settings and preferences
        </Text>
        
        <ThemeSelector />
        
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colors.tabColor }]} 
          onPress={handleLogout}
        >
          <Text style={[styles.logoutButtonText, { color: colors.background }]}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
      <AlertComponent />
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
    marginBottom: 32,
  },
  logoutButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
