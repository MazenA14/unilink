import { Link, Stack } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function NotFoundScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!', headerShown: false }} />
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.iconWrap, { backgroundColor: Platform.select({ ios: 'rgba(255,255,255,0.08)', default: colors.fileBackground }) }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.tabColor} />
        </View>

        <ThemedText type="title" style={[styles.title, { color: colors.mainFont }]}>Page not found</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.secondaryFont }]}>The page you’re looking for doesn’t exist or has moved.</ThemedText>

        <View style={styles.actions}>
          <Link href="/(tabs)/dashboard" asChild>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]}> 
              <ThemedText style={[styles.secondaryBtnText, { color: colors.mainFont }]}>Back</ThemedText>
            </TouchableOpacity>
          </Link>
        </View>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconWrap: {
    height: 88,
    width: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
    alignItems: 'center',
  },
  primaryBtn: {
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    alignSelf: 'center',
    paddingHorizontal: 20,
    width: 'auto',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
