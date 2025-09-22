import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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

  // Animation values
  const translateY = useState(new Animated.Value(0))[0];
  const opacity = useState(new Animated.Value(0))[0];
  const { height: screenHeight } = Dimensions.get('window');

  // Pan responder for drag handle
  const dragHandlePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to downward swipes
      const isDownwardSwipe = gestureState.dy > 0;
      const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      
      return isDownwardSwipe && isVerticalSwipe;
    },
    onPanResponderGrant: () => {
      // Don't set offset - start from current position
      translateY.setValue(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
        const progress = Math.min(gestureState.dy / 200, 1);
        opacity.setValue(1 - progress);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy > 100) {
        closeModal();
      } else {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(opacity, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
  });

  const openModal = useCallback(() => {
    translateY.setValue(screenHeight);
    opacity.setValue(0);
    
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [screenHeight, translateY, opacity]);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: screenHeight,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [screenHeight, translateY, opacity, onClose]);

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
      openModal();
      fetchProfile();
    } else {
      setProfile(null);
      setError(null);
    }
  }, [visible, instructorName, fetchProfile, openModal]);

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
            <Text style={styles.retryButtonText}>Try Again</Text>
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
            <Ionicons name="person" size={40} color="white" />
          </View>
          <Text style={styles.instructorName}>{profile.name}</Text>
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
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={closeModal}
    >
      <Animated.View style={[styles.modalOverlay, { opacity }]}>
        <Animated.View 
          style={[
            styles.modalContainer, 
            { 
              backgroundColor: colors.cardBackground,
              transform: [{ translateY }]
            }
          ]}
        >
          {/* Modal Header */}
          <View 
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            {...dragHandlePanResponder.panHandlers}
          >
            {/* Drag Handle */}
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            
            <View style={styles.headerContent}>
              <Text style={[styles.modalTitle, { color: colors.mainFont }]}>
                Instructor Profile
              </Text>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeModal}
                >
                  {/* Close button removed to match notification modal */}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {renderProfileContent()}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '95%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
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
    color: 'white',
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
    color: 'white',
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
