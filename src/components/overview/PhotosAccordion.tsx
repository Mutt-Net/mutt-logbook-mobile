import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { VehiclePhotoService } from '../../services/database';
import { Vehicle, VehiclePhoto } from '../../types';
import { Button } from '../common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2;

interface PhotosAccordionProps {
  vehicle: Vehicle;
  photos: VehiclePhoto[];
  expanded: boolean;
  onToggle: () => void;
  onReload: () => Promise<void>;
}

export default function PhotosAccordion({
  vehicle,
  photos,
  expanded,
  onToggle,
  onReload,
}: PhotosAccordionProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<VehiclePhoto | null>(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await VehiclePhotoService.create({
        vehicle_id: vehicle.id,
        filename: asset.uri,
        caption: null,
        is_primary: photos.length === 0,
      });
      await onReload();
    }
  };

  const handleSetPrimary = async (photo: VehiclePhoto) => {
    await VehiclePhotoService.setPrimary(vehicle.id, photo.id);
    await onReload();
    setModalVisible(false);
  };

  const handleDeletePhoto = (photo: VehiclePhoto) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await VehiclePhotoService.delete(photo.id);
            await onReload();
            setModalVisible(false);
          },
        },
      ]
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.accordionHeaderLeft}>
          <Text style={styles.accordionIcon}>📷</Text>
          <Text style={styles.accordionTitle}>Images</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{photos.length}</Text>
          </View>
        </View>
        <Text style={styles.accordionChevron}>{expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.accordionContent}>
          {photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {photos.slice(0, 4).map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={[styles.photoThumbnail, photo.is_primary && styles.photoPrimary]}
                  onLongPress={() => {
                    setSelectedPhoto(photo);
                    setModalVisible(true);
                  }}
                >
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoPlaceholderText}>📷</Text>
                  </View>
                  {photo.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>★</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                <Text style={styles.addPhotoButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyAccordion}>
              <Text style={styles.emptyAccordionText}>No photos yet</Text>
              <Button title="Add Photo" onPress={pickImage} variant="secondary" />
            </View>
          )}
        </View>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Photo Options</Text>
            {selectedPhoto && !selectedPhoto.is_primary && (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleSetPrimary(selectedPhoto)}
              >
                <Text style={styles.modalButtonText}>Set as Primary</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonDanger]}
              onPress={() => selectedPhoto && handleDeletePhoto(selectedPhoto)}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonTextDanger]}>
                Delete Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  accordionChevron: {
    fontSize: 10,
    color: '#8E8E93',
  },
  accordionContent: {
    marginTop: 12,
  },
  emptyAccordion: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyAccordionText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  photoThumbnail: {
    width: GRID_ITEM_WIDTH - 8,
    height: GRID_ITEM_WIDTH - 8,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPrimary: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 32,
  },
  primaryBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#007AFF',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: GRID_ITEM_WIDTH - 8,
    height: GRID_ITEM_WIDTH - 8,
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3A3A3C',
    borderStyle: 'dashed',
  },
  addPhotoButtonText: {
    fontSize: 32,
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalButtonDanger: {
    borderBottomWidth: 0,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
  },
  modalButtonTextDanger: {
    color: '#FF453A',
  },
});
