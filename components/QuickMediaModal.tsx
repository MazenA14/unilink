import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDocumentAsync } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';
import { isAvailableAsync as isSharingAvailableAsync, shareAsync } from 'expo-sharing';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCustomAlert } from './CustomAlert';

interface MediaFile {
  id: string;
  name: string;
  uri: string;
  type: string;
  size: number;
  uploadDate: string;
}

interface QuickMediaModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function QuickMediaModal({ visible, onClose }: QuickMediaModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showAlert, AlertComponent } = useCustomAlert();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<MediaFile | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameFileId, setRenameFileId] = useState<string>('');
  const [renameCurrentName, setRenameCurrentName] = useState<string>('');
  const [renameNewName, setRenameNewName] = useState<string>('');
  const [dropdownVisible, setDropdownVisible] = useState<string | null>(null);
  
  // Animation values
  const translateY = useState(new Animated.Value(0))[0];
  const opacity = useState(new Animated.Value(0))[0];
  
  // Image preview animation values
  const scale = useState(new Animated.Value(1))[0];
  const translateX = useState(new Animated.Value(0))[0];
  const translateYPreview = useState(new Animated.Value(0))[0];
  const previewOpacity = useState(new Animated.Value(0))[0];
  const infoOpacity = useState(new Animated.Value(0))[0];
  const { height: screenHeight } = Dimensions.get('window');
  
  // Storage keys
  const MEDIA_FILES_KEY = 'quick_media_files';
  const MEDIA_DIRECTORY = useMemo(() => new FileSystem.Directory(FileSystem.Paths.document, 'quick_media'), []);

  // Image preview pan responder for zoom and pan gestures
  const imagePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      scale.setOffset((scale as any)._value);
      translateX.setOffset((translateX as any)._value);
      translateYPreview.setOffset((translateYPreview as any)._value);
    },
    onPanResponderMove: (evt, gestureState) => {
      // Handle pinch to zoom
      if (gestureState.numberActiveTouches === 2) {
        const distance = Math.sqrt(
          Math.pow(gestureState.dx, 2) + Math.pow(gestureState.dy, 2)
        );
        const scaleValue = Math.max(0.5, Math.min(4, 1 + (distance - 100) / 150));
        scale.setValue(scaleValue);
      } else if (gestureState.numberActiveTouches === 1) {
        // Handle pan - only allow panning when zoomed in
        const currentScale = (scale as any)._value;
        if (currentScale > 1) {
          translateX.setValue(gestureState.dx);
          translateYPreview.setValue(gestureState.dy);
        }
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      scale.flattenOffset();
      translateX.flattenOffset();
      translateYPreview.flattenOffset();
      
      const currentScale = (scale as any)._value;
      
      // Reset if scale is too small or if user swipes down to close
      if (currentScale < 0.8 || (gestureState.dy > 100 && currentScale <= 1.1)) {
        if (gestureState.dy > 100) {
          // Swipe down to close
          closeImagePreview();
        } else {
          // Reset to normal size
          Animated.parallel([
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(translateYPreview, { toValue: 0, useNativeDriver: true }),
          ]).start();
        }
      } else if (currentScale > 4) {
        // Cap maximum zoom
        Animated.spring(scale, { toValue: 4, useNativeDriver: true }).start();
      }
    },
  });

  // Header pan responder for swipe down gesture
  const dragHandlePanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      const isDownwardSwipe = gestureState.dy > 0;
      const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      return isDownwardSwipe && isVerticalSwipe;
    },
    onPanResponderGrant: () => {
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

  // Initialize media directory
  const initializeMediaDirectory = useCallback(async () => {
    try {
      const dirInfo = await MEDIA_DIRECTORY.info();
      if (!dirInfo.exists) {
        MEDIA_DIRECTORY.create({ intermediates: true });
      }
    } catch {
      // Error handling - directory initialization failed
    }
  }, [MEDIA_DIRECTORY]);

  // Load media files from storage
  const loadMediaFiles = useCallback(async () => {
    try {
      setLoading(true);
      const storedFiles = await AsyncStorage.getItem(MEDIA_FILES_KEY);
      if (storedFiles) {
        const files: MediaFile[] = JSON.parse(storedFiles);
        // Verify files still exist
        const existingFiles = [];
        for (const file of files) {
          const fileObj = new FileSystem.File(file.uri);
          const fileInfo = await fileObj.info();
          if (fileInfo.exists) {
            existingFiles.push(file);
          }
        }
        setMediaFiles(existingFiles);
        
        // Update storage if some files were removed
        if (existingFiles.length !== files.length) {
          await AsyncStorage.setItem(MEDIA_FILES_KEY, JSON.stringify(existingFiles));
        }
      }
    } catch {
      // Error handling - failed to load media files
    } finally {
      setLoading(false);
    }
  }, [MEDIA_FILES_KEY]);

  // Save media files to storage
  const saveMediaFiles = async (files: MediaFile[]) => {
    try {
      await AsyncStorage.setItem(MEDIA_FILES_KEY, JSON.stringify(files));
    } catch {
      // Error handling - failed to save media files
    }
  };

  // Handle image upload
  const handleUpload = async () => {
    try {
      setUploading(true);
      
      const result = await getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Validate that it's an image file
        if (!asset.mimeType || !asset.mimeType.startsWith('image/')) {
          showAlert({
            title: 'Invalid File',
            message: 'Please select an image file.',
            type: 'error'
          });
          return;
        }
        
        // Create unique file name
        const timestamp = new Date().getTime();
        const fileName = `${timestamp}_${asset.name}`;
        const localFile = new FileSystem.File(MEDIA_DIRECTORY, fileName);
        
        // Copy file to app directory using the legacy API for document picker compatibility
        await copyAsync({
          from: asset.uri,
          to: localFile.uri,
        });
        
        // Create media file object
        const mediaFile: MediaFile = {
          id: timestamp.toString(),
          name: asset.name,
          uri: localFile.uri,
          type: asset.mimeType,
          size: asset.size || 0,
          uploadDate: new Date().toISOString(),
        };
        
        // Update state and storage
        const updatedFiles = [mediaFile, ...mediaFiles];
        setMediaFiles(updatedFiles);
        await saveMediaFiles(updatedFiles);
        
        // Show success message
        // Alert.alert('Success', 'Image uploaded successfully!');
      }
    } catch {
      // Error handling - upload failed
      showAlert({
        title: 'Error',
        message: 'Failed to upload image. Please try again.',
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle file deletion
  const handleDelete = async (fileId: string) => {
    try {
      const fileToDelete = mediaFiles.find(f => f.id === fileId);
      if (!fileToDelete) {
        return;
      }
      
      showAlert({
        title: 'Delete File',
        message: `Are you sure you want to delete "${fileToDelete.name}"?`,
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete physical file
                const fileObj = new FileSystem.File(fileToDelete.uri);
                const fileInfo = await fileObj.info();
                if (fileInfo.exists) {
                  fileObj.delete();
                }
                
                // Update state and storage
                const updatedFiles = mediaFiles.filter(f => f.id !== fileId);
                setMediaFiles(updatedFiles);
                await saveMediaFiles(updatedFiles);
              } catch {
                // Error handling - delete failed
                showAlert({
                  title: 'Error',
                  message: 'Failed to delete file.',
                  type: 'error'
                });
              }
            }
          }
        ]
      });
    } catch {
      // Error handling - delete handler failed
    }
  };

  // Handle file rename
  const handleRename = async (fileId: string, currentName: string) => {
    try {
      setRenameFileId(fileId);
      setRenameCurrentName(currentName);
      setRenameNewName(currentName);
      setRenameModalVisible(true);
    } catch {
      // Error handling - rename handler failed
    }
  };

  // Handle rename confirmation
  const handleRenameConfirm = async () => {
    try {
      if (!renameNewName || renameNewName.trim() === '') {
        showAlert({
          title: 'Invalid Name',
          message: 'File name cannot be empty.',
          type: 'error',
          buttons: [{ text: 'OK' }]
        });
        return;
      }

      // Update the file name in the mediaFiles array
      const updatedFiles = mediaFiles.map(file => 
        file.id === renameFileId 
          ? { ...file, name: renameNewName.trim() }
          : file
      );
      
      setMediaFiles(updatedFiles);
      await saveMediaFiles(updatedFiles);
      
      // Close modal and show success
      setRenameModalVisible(false);
      showAlert({
        title: 'Success',
        message: 'File renamed successfully!',
        type: 'success',
        buttons: [{ text: 'OK' }]
      });
    } catch {
      // Error handling - rename failed
      showAlert({
        title: 'Error',
        message: 'Failed to rename file.',
        type: 'error',
        buttons: [{ text: 'OK' }]
      });
    }
  };

  // Handle rename cancel
  const handleRenameCancel = () => {
    setRenameModalVisible(false);
    setRenameFileId('');
    setRenameCurrentName('');
    setRenameNewName('');
  };

  // Handle dropdown toggle
  const handleDropdownToggle = (fileId: string) => {
    setDropdownVisible(dropdownVisible === fileId ? null : fileId);
  };

  // Handle dropdown close
  const handleDropdownClose = () => {
    setDropdownVisible(null);
  };

  // Handle file share
  const handleShare = async (file: MediaFile) => {
    try {
      // Check if sharing is available
      const isAvailable = await isSharingAvailableAsync();
      if (!isAvailable) {
        showAlert({
          title: 'Sharing Not Available',
          message: 'Sharing is not available on this device.',
          type: 'error',
          buttons: [{ text: 'OK' }]
        });
        return;
      }

      // Use expo-sharing for better file sharing
      await shareAsync(file.uri, {
        mimeType: file.type || 'image/jpeg',
        dialogTitle: `Share ${file.name}`,
      });

      showAlert({
        title: 'Success',
        message: 'Image shared successfully!',
        type: 'success',
        buttons: [{ text: 'OK' }]
      });
    } catch {
      // Error handling - share failed
      showAlert({
        title: 'Error',
        message: 'Failed to share image. Please try again.',
        type: 'error',
        buttons: [{ text: 'OK' }]
      });
    }
  };

  // Handle image preview
  const handleImagePreview = (file: MediaFile) => {
    setPreviewImage(file);
    setImageLoading(true);
    setImageError(false);
    
    // Animate in
    Animated.parallel([
      Animated.timing(previewOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(infoOpacity, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Close image preview
  const closeImagePreview = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(previewOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(infoOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset animation values
      scale.setValue(1);
      translateX.setValue(0);
      translateYPreview.setValue(0);
      previewOpacity.setValue(0);
      infoOpacity.setValue(0);
      setPreviewImage(null);
      setImageLoading(false);
      setImageError(false);
    });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format upload date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };


  // Modal animation functions
  const openModal = useCallback(() => {
    translateY.setValue(screenHeight);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity, screenHeight]);

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      // Reset values for next time
      translateY.setValue(0);
      opacity.setValue(0);
    });
  };

  // Initialize on mount
  useEffect(() => {
    if (visible) {
      initializeMediaDirectory();
      loadMediaFiles();
      openModal();
    }
  }, [visible, initializeMediaDirectory, loadMediaFiles, openModal]);

  // Clear files on logout (this would be called from auth context)
  const clearAllFiles = useCallback(async () => {
    try {
      // Delete all physical files
      for (const file of mediaFiles) {
        const fileObj = new FileSystem.File(file.uri);
        const fileInfo = await fileObj.info();
        if (fileInfo.exists) {
          fileObj.delete();
        }
      }
      
      // Clear storage
      await AsyncStorage.removeItem(MEDIA_FILES_KEY);
      setMediaFiles([]);
    } catch {
      // Error handling - clear files failed
    }
  }, [mediaFiles]);

  // Expose clearAllFiles for use in auth context
  useEffect(() => {
    // This would be called from the auth context when user logs out
    // For now, we'll just store the function
    (global as any).clearQuickMediaFiles = clearAllFiles;
  }, [clearAllFiles]);

  const renderMediaFile = ({ item }: { item: MediaFile }) => (
    <TouchableOpacity
      style={[styles.mediaFileCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => handleImagePreview(item)}
    >
      <View style={styles.fileContent}>
        <View style={styles.fileInfo}>
          <View style={[styles.imagePreviewContainer, { backgroundColor: colors.tint + '15' }]}>
            <Image 
              source={{ uri: item.uri }} 
              style={styles.imagePreview}
              resizeMode="cover"
            />
          </View>
          <View style={styles.fileDetails}>
            <Text style={[styles.fileName, { color: colors.mainFont }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.fileDate, { color: colors.secondaryFont }]}>
              {formatDate(item.uploadDate)}
            </Text>
            <Text style={[styles.fileSize, { color: colors.secondaryFont }]}>
              {formatFileSize(item.size)}
            </Text>
          </View>
        </View>
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: colors.border + '30' }]}
            onPress={() => handleDropdownToggle(item.id)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.mainFont} />
          </TouchableOpacity>
          
          {dropdownVisible === item.id && (
            <View style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  handleDropdownClose();
                  setTimeout(() => {
                    handleRename(item.id, item.name);
                  }, 100);
                }}
              >
                <Ionicons name="create-outline" size={18} color="#4CAF50" />
                <Text style={[styles.dropdownItemText, { color: colors.mainFont }]}>Rename</Text>
              </TouchableOpacity>
              
              <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />
              
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  handleDropdownClose();
                  setTimeout(() => {
                    handleShare(item);
                  }, 100);
                }}
              >
                <Ionicons name="share-outline" size={18} color={colors.tint} />
                <Text style={[styles.dropdownItemText, { color: colors.mainFont }]}>Share</Text>
              </TouchableOpacity>
              
              <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />
              
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  handleDropdownClose();
                  setTimeout(() => {
                    handleDelete(item.id);
                  }, 100);
                }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.gradeFailing} />
                <Text style={[styles.dropdownItemText, { color: colors.mainFont }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

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
              backgroundColor: colors.background,
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
                Quick Access
              </Text>
            </View>
          </View>

          {/* Upload Button */}
          <View style={styles.uploadSection}>
            <TouchableOpacity
              style={[
                styles.uploadButton, 
                { 
                  backgroundColor: colors.tint,
                  opacity: uploading ? 0.7 : 1
                }
              ]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="cloud-upload-outline" size={24} color="white" />
              )}
              <Text style={styles.uploadButtonText}>
                {uploading ? 'Uploading...' : 'Upload Image'}
              </Text>
            </TouchableOpacity>
              <Text style={[styles.uploadHint, { color: colors.secondaryFont }]}>
                Upload images for quick access and preview (e.g., Academic Calendar, Course Materials)
              </Text>
          </View>

          {/* Media Files List */}
          <View style={styles.filesSection}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>
                  Loading files...
                </Text>
              </View>
            ) : mediaFiles.length > 0 ? (
              <FlatList
                data={mediaFiles}
                renderItem={renderMediaFile}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.filesList}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="image-outline" size={64} color={colors.secondaryFont} />
                <Text style={[styles.emptyText, { color: colors.secondaryFont }]}>
                  No images uploaded yet
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.secondaryFont }]}>
                  Tap the upload button to add your first image
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>

      {/* Image Preview Modal */}
      <Modal
        visible={previewImage !== null}
        transparent={true}
        animationType="none"
        onRequestClose={closeImagePreview}
        statusBarTranslucent={true}
      >
        <Animated.View 
          style={[
            styles.previewOverlay,
            { opacity: previewOpacity }
          ]}
        >
          {/* Three-section layout container */}
          <View style={styles.previewContainer}>
            {/* Top Header Section */}
            <Animated.View 
              style={[
                styles.previewTopSection,
                { 
                  backgroundColor: colors.background + '95',
                  opacity: infoOpacity
                }
              ]}
            >
              <TouchableOpacity
                style={[styles.previewCloseButton, { backgroundColor: colors.tint + '20' }]}
                onPress={closeImagePreview}
              >
                <Ionicons name="close" size={20} color={colors.tint} />
              </TouchableOpacity>
              
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={[styles.previewActionButton, { backgroundColor: colors.tint + '20' }]}
                  onPress={() => {
                    // Reset zoom
                    Animated.parallel([
                      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
                      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
                      Animated.spring(translateYPreview, { toValue: 0, useNativeDriver: true }),
                    ]).start();
                  }}
                >
                  <Ionicons name="refresh" size={18} color={colors.tint} />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Middle Image Section */}
            <View style={styles.previewMiddleSection}>
              {previewImage && (
                <TouchableOpacity 
                  style={styles.imageWrapper} 
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                  {...imagePanResponder.panHandlers}
                >
                  {imageLoading && (
                    <View style={styles.imageLoadingContainer}>
                      <ActivityIndicator size="large" color={colors.tint} />
                      <Text style={[styles.loadingText, { color: colors.secondaryFont }]}>
                        Loading image...
                      </Text>
                    </View>
                  )}
                  
                  {imageError && (
                    <View style={styles.imageErrorContainer}>
                      <Ionicons name="image-outline" size={64} color={colors.secondaryFont} />
                      <Text style={[styles.errorText, { color: colors.secondaryFont }]}>
                        Failed to load image
                      </Text>
                    </View>
                  )}
                  
                  <Animated.Image
                    source={{ uri: previewImage.uri }}
                    style={[
                      styles.previewImage,
                      {
                        opacity: imageLoading || imageError ? 0 : 1,
                        transform: [
                          { scale: scale },
                          { translateX: translateX },
                          { translateY: translateYPreview },
                        ],
                      },
                    ]}
                    resizeMode="contain"
                    onLoad={() => {
                      setImageLoading(false);
                      setImageError(false);
                    }}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Bottom Info Section */}
            {previewImage && (
              <Animated.View 
                style={[
                  styles.previewBottomSection,
                  { 
                    backgroundColor: colors.background + '95',
                    opacity: infoOpacity
                  }
                ]}
              >
                <View style={styles.previewInfoContent}>
                  <View style={styles.previewInfoLeft}>
                    <Text style={[styles.previewFileName, { color: colors.mainFont }]}>
                      {previewImage.name}
                    </Text>
                    <Text style={[styles.previewFileDetails, { color: colors.secondaryFont }]}>
                      {formatFileSize(previewImage.size)} • {formatDate(previewImage.uploadDate)}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={renameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleRenameCancel}
      >
        <View style={styles.renameModalOverlay}>
          <View style={[styles.renameModalContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.renameModalTitle, { color: colors.mainFont }]}>
              Rename File
            </Text>
            
            <Text style={[styles.renameModalSubtitle, { color: colors.secondaryFont }]}>
              Current name: {renameCurrentName}
            </Text>
            
            <TextInput
              style={[styles.renameInput, { 
                backgroundColor: colorScheme === 'dark' ? '#232323' : '#f3f3f3',
                borderColor: colors.border,
                color: colors.mainFont
              }]}
              value={renameNewName}
              onChangeText={setRenameNewName}
              placeholder="Enter new name"
              placeholderTextColor={colors.secondaryFont}
              autoFocus={true}
              selectTextOnFocus={true}
            />
            
            <View style={styles.renameModalButtons}>
              <TouchableOpacity
                style={[styles.renameModalButton, styles.renameCancelButton, { borderColor: colors.border }]}
                onPress={handleRenameCancel}
              >
                <Text style={[styles.renameModalButtonText, { color: colors.secondaryFont }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.renameModalButton, styles.renameConfirmButton, { backgroundColor: colors.tint }]}
                onPress={handleRenameConfirm}
              >
                <Text style={[styles.renameModalButtonText, { color: 'white' }]}>
                  Rename
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Custom Alert Component */}
      <AlertComponent />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '90%',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  uploadSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  uploadHint: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  filesSection: {
    flex: 1,
  },
  filesList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  mediaFileCard: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  imagePreviewContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    marginRight: 16,
  },
  fileDate: {
    fontSize: 12,
    marginBottom: 2,
    opacity: 0.8,
  },
  fileSize: {
    fontSize: 11,
    opacity: 0.6,
  },
  menuContainer: {
    position: 'relative',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    minWidth: 120,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  dropdownDivider: {
    height: 1,
    marginHorizontal: 8,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  // Enhanced Image Preview Styles
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  previewContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  previewTopSection: {
    height: 100,
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  previewCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  previewActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  previewMiddleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    maxHeight: '100%',
  },
  imageLoadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  imageErrorContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
  },
  previewBottomSection: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 10,
  },
  previewInfoContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewInfoLeft: {
    flex: 1,
  },
  previewFileName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  previewFileDetails: {
    fontSize: 14,
    opacity: 0.8,
  },
  // Rename Modal Styles
  renameModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  renameModalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  renameModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  renameModalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  renameModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  renameModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameCancelButton: {
    borderWidth: 1,
  },
  renameConfirmButton: {
    // backgroundColor will be set dynamically
  },
  renameModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});