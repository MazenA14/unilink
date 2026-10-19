import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface InstructorProfile {
  name: string;
  email?: string;
  office?: string;
  courses?: string;
}

interface InstructorProfileModalProps {
  visible: boolean;
  onClose: () => void;
  instructorName: string;
  onFetchProfile: (instructorName: string) => Promise<InstructorProfile | null>;
}

export function InstructorProfileModal({
  visible,
  onClose,
  instructorName,
  onFetchProfile,
}: InstructorProfileModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!instructorName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const profileData = await onFetchProfile(instructorName);
      if (profileData) {
        setProfile(profileData);
      } else {
        setError('Unable to load instructor profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [instructorName, onFetchProfile]);

  useEffect(() => {
    if (visible && instructorName) {
      fetchProfile();
    } else {
      setProfile(null);
      setError(null);
    }
  }, [visible, instructorName, fetchProfile]);

  const handleEmailPress = useCallback(() => {
    if (profile?.email) {
      Linking.openURL(`mailto:${profile.email}`);
    }
  }, [profile?.email]);

  const renderProfileContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>
            Loading profile...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gradeFailing} />
          <Text style={[styles.errorTitle, { color: colors.mainFont }]}>
            Error Loading Profile
          </Text>
          <Text style={[styles.errorText, { color: colors.secondaryFont }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={fetchProfile}
          >
            <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!profile) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={48} color={colors.secondaryFont} />
          <Text style={[styles.emptyText, { color: colors.secondaryFont }]}>
            No profile data available
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.profileContent}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.tint }]}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color={colors.onPrimary} />
          </View>
          <Text style={[styles.instructorName, { color: colors.onPrimary }]}>{profile.name}</Text>
        </View>

        {/* Details */}
        <View style={styles.detailsContainer}>
          {profile.email && (
            <TouchableOpacity
              style={[styles.detailPill, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={handleEmailPress}
            >
              <View style={[styles.detailIcon, { backgroundColor: colors.tint + '15' }]}>
                <Ionicons name="mail" size={20} color={colors.tint} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.secondaryFont }]}>
                  Email
                </Text>
                <Text style={[styles.detailValue, { color: colors.mainFont }]}>
                  {profile.email}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.secondaryFont} />
            </TouchableOpacity>
          )}

          {profile.office && (
            <View style={[styles.detailPill, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={[styles.detailIcon, { backgroundColor: colors.gradeGood + '15' }]}>
                <Ionicons name="location" size={20} color={colors.gradeGood} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.secondaryFont }]}>
                  Office
                </Text>
                <Text style={[styles.detailValue, { color: colors.mainFont }]}>
                  {profile.office}
                </Text>
              </View>
            </View>
          )}

          {/* {profile.courses && (
            <View style={[styles.detailPill, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={[styles.detailIcon, { backgroundColor: colors.gradeWarning + '15' }]}>
                <Ionicons name="book" size={20} color={colors.gradeWarning} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.secondaryFont }]}>
                  Courses
                </Text>
                <Text style={[styles.detailValue, { color: colors.mainFont }]}>
                  {profile.courses}
                </Text>
              </View>
            </View>
          )} */}
        </View>
      </View>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onRequestClose={onClose}
      autoHeight
      heightRatio={0.85}
      header={<SheetHeader colors={colors} title="Instructor Profile" />}
    >
      <View style={styles.modalContent}>
        {renderProfileContent()}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // Modal styles
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    opacity: 0.7,
  },
  profileContent: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 0,
    marginHorizontal: -20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructorName: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});
