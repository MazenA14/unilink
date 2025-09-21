import { Link, Stack } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function NotFoundScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!', headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.iconWrap, { backgroundColor: Platform.select({ ios: 'rgba(255,255,255,0.08)', default: colors.fileBackground }) }]}>
          {/* <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.tabColor} /> */}
        </View>

        <Text style={[styles.title, { color: colors.mainFont }]}>Page not found</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryFont }]}>The page you&apos;re looking for doesn&apos;t exist or has moved.</Text>

        <View style={styles.actions}>
          <Link href="/(tabs)/dashboard" asChild>
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]}> 
              <Text style={[styles.secondaryBtnText, { color: colors.mainFont }]}>Back</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
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
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
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
