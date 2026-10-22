import BottomSheet from '@/components/ui/BottomSheet';
import { SheetHeader } from '@/components/ui/Dropdown';
import { SheetButtons } from '@/components/ui/SheetButtons';
import { ImageViewer } from '@/components/ui/ImageViewer';
import { Colors } from '@/constants/Colors';
import { Radius, Shadow, Spacing, Type, withAlpha } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDocumentAsync } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';
import { isAvailableAsync as isSharingAvailableAsync, shareAsync } from 'expo-sharing';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
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
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameFileId, setRenameFileId] = useState<string>('');
  const [renameCurrentName, setRenameCurrentName] = useState<string>('');
  const [renameNewName, setRenameNewName] = useState<string>('');
  const [dropdownVisible, setDropdownVisible] = useState<string | null>(null);
  
  // Two-column grid sized to the sheet
  const { width: windowWidth } = useWindowDimensions();
  const tileWidth = Math.floor((windowWidth - GRID_PADDING * 2 - GRID_GAP) / 2);

  // Storage keys
  const MEDIA_FILES_KEY = 'quick_media_files';
  const MEDIA_DIRECTORY = useMemo(() => new FileSystem.Directory(FileSystem.Paths.document, 'quick_media'), []);

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

        // Let the spinner paint before the copy and the new thumbnail's decode
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

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
  };

  // Close image preview
  const closeImagePreview = () => {
    setPreviewImage(null);
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


  const closeModal = onClose;

  // Initialize on mount
  useEffect(() => {
    if (visible) {
      initializeMediaDirectory();
      loadMediaFiles();
    }
  }, [visible, initializeMediaDirectory, loadMediaFiles]);

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

  // Keep the viewer in sync with renames, and close it if the image is deleted
  const viewedFile = previewImage ? mediaFiles.find(f => f.id === previewImage.id) ?? null : null;
  const menuFile = dropdownVisible ? mediaFiles.find(f => f.id === dropdownVisible) ?? null : null;
  const totalSize = mediaFiles.reduce((sum, f) => sum + (f.size || 0), 0);

  const renderMediaFile = (item: MediaFile) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.tile, { width: tileWidth }]}
      onPress={() => handleImagePreview(item)}
      onLongPress={() => handleDropdownToggle(item.id)}
      delayLongPress={300}
      activeOpacity={0.85}
    >
      <View style={[styles.thumbWrap, { height: tileWidth, backgroundColor: colors.surfaceSunken }]}>
        {/* Decode a downscaled bitmap: full-res photos stall the UI thread on Android */}
        <Image source={{ uri: item.uri }} style={styles.thumb} resizeMode="cover" resizeMethod="resize" />
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleDropdownToggle(item.id)}
          hitSlop={8}
          accessibilityLabel={`Options for ${item.name}`}
        >
          <Ionicons name="ellipsis-horizontal" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <Text style={[styles.tileName, { color: colors.textPrimary }]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[styles.tileMeta, { color: colors.textTertiary }]} numberOfLines={1}>
        {formatDate(item.uploadDate)} · {formatFileSize(item.size)}
      </Text>
    </TouchableOpacity>
  );

  const renderAddTile = () => (
    <TouchableOpacity
      key="__add"
      style={[styles.tile, { width: tileWidth }]}
      onPress={handleUpload}
      disabled={uploading}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.thumbWrap,
          styles.addTile,
          { height: tileWidth, borderColor: withAlpha(colors.tint, 0.45), backgroundColor: withAlpha(colors.tint, 0.06) },
        ]}
      >
        {uploading ? (
          <ActivityIndicator color={colors.tint} />
        ) : (
          <View style={[styles.addIcon, { backgroundColor: colors.tint }]}>
            <Ionicons name="add" size={26} color={colors.onPrimary} />
          </View>
        )}
        <Text style={[styles.addText, { color: colors.tint }]}>{uploading ? 'Adding…' : 'Add image'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <BottomSheet
      visible={visible}
      onRequestClose={closeModal}
      heightRatio={0.9}
      header={
        <SheetHeader
          colors={colors}
          title="Quick Access"
          subtitle={
            mediaFiles.length > 0
              ? `${mediaFiles.length} image${mediaFiles.length !== 1 ? 's' : ''} · ${formatFileSize(totalSize)} on this device`
              : 'Images saved on this device'
          }
        />
      }
    >
      <View style={styles.body}>
        {loading ? (
          <View style={styles.grid}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[styles.tile, { width: tileWidth }]}>
                <View style={[styles.thumbWrap, { height: tileWidth, backgroundColor: colors.surface }]} />
                <View style={[styles.skeletonLine, { backgroundColor: colors.surface, width: '70%' }]} />
                <View style={[styles.skeletonLine, { backgroundColor: colors.surface, width: '45%', height: 10 }]} />
              </View>
            ))}
          </View>
        ) : mediaFiles.length > 0 ? (
          <>
            <View style={styles.grid}>
              {renderAddTile()}
              {mediaFiles.map(renderMediaFile)}
            </View>
            <Text style={[styles.footerHint, { color: colors.textTertiary }]}>
              Tap to view · Long-press for options
            </Text>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(colors.tint, 0.1) }]}>
              <Ionicons name="images" size={30} color={colors.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Keep key images one tap away</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Save things like the academic calendar, your study plan or a course map. They stay on this device.
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.tint }, Shadow.glow(colors.tint), uploading && { opacity: 0.7 }]}
              onPress={handleUpload}
              disabled={uploading}
              activeOpacity={0.85}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Ionicons name="add" size={20} color={colors.onPrimary} />
              )}
              <Text style={[styles.emptyButtonText, { color: colors.onPrimary }]}>
                {uploading ? 'Adding…' : 'Add your first image'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ImageViewer
        visible={viewedFile !== null}
        uri={viewedFile?.uri ?? null}
        title={viewedFile?.name}
        subtitle={viewedFile ? `${formatFileSize(viewedFile.size)} · ${formatDate(viewedFile.uploadDate)}` : undefined}
        onClose={closeImagePreview}
        actions={
          viewedFile
            ? [
                { icon: 'share-outline', label: 'Share', onPress: () => handleShare(viewedFile) },
                { icon: 'create-outline', label: 'Rename', onPress: () => handleRename(viewedFile.id, viewedFile.name) },
                { icon: 'trash-outline', label: 'Delete', onPress: () => handleDelete(viewedFile.id), destructive: true },
              ]
            : []
        }
      />

      {/* Per-image actions */}
      <BottomSheet
        visible={menuFile !== null}
        onRequestClose={handleDropdownClose}
        autoHeight
        header={<SheetHeader colors={colors} title={menuFile?.name ?? ''} subtitle={menuFile ? `${formatFileSize(menuFile.size)} · ${formatDate(menuFile.uploadDate)}` : undefined} />}
      >
        {menuFile && (
          <View style={styles.menuBody}>
            {[
              { icon: 'expand-outline' as const, label: 'View', tint: colors.textPrimary, run: () => handleImagePreview(menuFile) },
              { icon: 'share-outline' as const, label: 'Share', tint: colors.textPrimary, run: () => handleShare(menuFile) },
              { icon: 'create-outline' as const, label: 'Rename', tint: colors.textPrimary, run: () => handleRename(menuFile.id, menuFile.name) },
              { icon: 'trash-outline' as const, label: 'Delete', tint: colors.danger, run: () => handleDelete(menuFile.id) },
            ].map((row, i, all) => (
              <TouchableOpacity
                key={row.label}
                style={[
                  styles.menuRow,
                  { backgroundColor: colors.surface },
                  i === 0 && styles.menuRowFirst,
                  i === all.length - 1 && styles.menuRowLast,
                ]}
                onPress={() => {
                  handleDropdownClose();
                  setTimeout(row.run, 250);
                }}
                activeOpacity={0.6}
              >
                <Ionicons name={row.icon} size={20} color={row.tint} />
                <Text style={[styles.menuRowText, { color: row.tint }]}>{row.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </BottomSheet>

      {/* Rename sheet */}
      <BottomSheet
        visible={renameModalVisible}
        onRequestClose={handleRenameCancel}
        autoHeight
        header={<SheetHeader colors={colors} title="Rename Image" subtitle={renameCurrentName} />}
        footer={
          <SheetButtons
            secondary={{ label: 'Cancel', onPress: handleRenameCancel }}
            primary={{ label: 'Rename', onPress: handleRenameConfirm, disabled: !renameNewName.trim() || renameNewName.trim() === renameCurrentName }}
          />
        }
      >
        <View style={styles.renameBody}>
          <TextInput
            style={[styles.renameInput, { backgroundColor: colors.surface, color: colors.textPrimary }]}
            value={renameNewName}
            onChangeText={setRenameNewName}
            placeholder="Enter new name"
            placeholderTextColor={colors.textTertiary}
            autoFocus={true}
            selectTextOnFocus={true}
          />
        </View>
      </BottomSheet>

      {/* Custom Alert Component */}
      <AlertComponent />
    </BottomSheet>
  );
}

const GRID_PADDING = Spacing.xl;
const GRID_GAP = Spacing.md;

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    minHeight: 240,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  tile: {
    marginBottom: Spacing.xs,
  },
  thumbWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  moreButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tileName: {
    ...Type.callout,
    marginTop: Spacing.sm,
  },
  tileMeta: {
    ...Type.caption,
    fontWeight: '500',
    marginTop: 1,
  },
  addTile: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  addIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    ...Type.callout,
  },
  skeletonLine: {
    height: 12,
    borderRadius: Radius.xs,
    marginTop: Spacing.sm,
  },
  footerHint: {
    ...Type.caption,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Type.h3,
    textAlign: 'center',
    marginBottom: Spacing.xs + 2,
  },
  emptyText: {
    ...Type.subtext,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  emptyButtonText: {
    ...Type.callout,
  },
  menuBody: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.lg,
    gap: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 15,
  },
  menuRowFirst: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  menuRowLast: {
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  menuRowText: {
    ...Type.body,
    fontWeight: '600',
  },
  renameBody: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  renameInput: {
    ...Type.body,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
});
