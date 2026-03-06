import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRoute, RouteProp } from '@react-navigation/native';
import { DocumentService, VehicleService } from '../services/database';
import { Document, Vehicle } from '../types';
import { isUnsynced } from '../lib/syncUtils';
import { Card, Input, Loading, EmptyState, SyncStatusBadge } from '../components/common';

const DOCUMENT_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'registration', label: 'Registration' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
];

interface DocumentFormData {
  title: string;
  description: string;
  document_type: string;
}

const initialFormData: DocumentFormData = {
  title: '',
  description: '',
  document_type: 'other',
};

export default function DocumentsScreen() {
  const route = useRoute<RouteProp<{ Screen: { vehicleId?: number } }, 'Screen'>>();
  const vehicleId = route.params?.vehicleId ?? 0;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState<DocumentFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);

  const loadData = useCallback(async () => {
    const [vehicleData, docsData] = await Promise.all([
      VehicleService.getById(vehicleId),
      DocumentService.getByVehicle(vehicleId),
    ]);
    setVehicle(vehicleData);
    setDocuments(docsData);
  }, [vehicleId]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      await loadData();
      if (!cancelled) setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const closeModal = () => {
    setModalVisible(false);
    setPickedFile(null);
  };

  const handleAddPress = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setPickedFile(null);
    setModalVisible(true);
  };

  const handleEditPress = (item: Document) => {
    setFormData({
      title: item.title || '',
      description: item.description || '',
      document_type: item.document_type || 'other',
    });
    setEditingId(item.id);
    setPickedFile(null);
    setModalVisible(true);
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPickedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' });
    }
  };

  const handleDeletePress = (item: Document) => {
    Alert.alert(
      'Delete Document',
      `Delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await DocumentService.delete(item.id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        vehicle_id: vehicleId,
        maintenance_id: null,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        document_type: formData.document_type || null,
        filename: pickedFile?.uri ?? null,
        created_at: new Date().toISOString(),
        synced: 0,
        remote_id: null,
        updated_at: new Date().toISOString(),
      };
      if (editingId !== null) {
        await DocumentService.update(editingId, data);
      } else {
        await DocumentService.create(data);
      }
      closeModal();
      await loadData();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Please try again';
      Alert.alert('Save Failed', `Could not save document. ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const getTypeColor = (docType: string | null): string => {
    switch (docType) {
      case 'manual': return '#007AFF';
      case 'warranty': return '#30D158';
      case 'insurance': return '#FF9500';
      case 'registration': return '#5E5CE6';
      default: return '#636366';
    }
  };

  const renderItem = ({ item }: { item: Document }) => (
    <Card>
      <View style={styles.itemHeader}>
        <View style={styles.itemHeaderLeft}>
          <Text style={styles.title}>{item.title}</Text>
          {item.document_type && (
            <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.document_type) }]}>
              <Text style={styles.typeText}>{item.document_type.toUpperCase()}</Text>
            </View>
          )}
        </View>
        {(isUnsynced(item as any)) && <SyncStatusBadge isSynced={false} size="small" />}
      </View>
      {item.description && (
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      )}
      {item.filename && (
        <TouchableOpacity onPress={() => Linking.openURL(item.filename as string)}>
          <Text style={styles.filename} numberOfLines={1}>{item.filename.split('/').pop()}</Text>
        </TouchableOpacity>
      )}
      <View style={styles.itemActions}>
        <TouchableOpacity style={styles.editButton} onPress={() => handleEditPress(item)}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletePress(item)}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) return <Loading />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{vehicle?.name || 'Documents'}</Text>
          <Text style={styles.headerSubtitle}>{documents.length} document{documents.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {documents.length === 0 ? (
        <EmptyState
          message="No Documents"
          submessage="Add vehicle documents like manuals, warranties, and registration"
        />
      ) : (
        <FlatList
          data={documents}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
          }
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingId !== null ? 'Edit Document' : 'Add Document'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label="Title *"
              value={formData.title}
              onChangeText={text => setFormData({ ...formData, title: text })}
              placeholder="Service Manual, Insurance Card, etc."
            />
            <Input
              label="Description"
              value={formData.description}
              onChangeText={text => setFormData({ ...formData, description: text })}
              placeholder="Brief description"
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Document Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {DOCUMENT_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={[styles.chip, formData.document_type === type.value && styles.chipSelected]}
                      onPress={() => setFormData({ ...formData, document_type: type.value })}
                    >
                      <Text style={[styles.chipText, formData.document_type === type.value && styles.chipTextSelected]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.attachButton} onPress={pickDocument}>
              <Text style={styles.attachButtonText}>
                {pickedFile ? `File: ${pickedFile.name}` : 'Attach File'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalSpacer} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  listContent: { padding: 16 },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemHeaderLeft: { flex: 1 },
  title: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', marginBottom: 6 },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  description: { fontSize: 13, color: '#8E8E93', marginBottom: 8 },
  itemActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  editButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#000000' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalCancel: { fontSize: 16, color: '#007AFF' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  modalSave: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  modalSaveDisabled: { opacity: 0.5 },
  modalContent: { flex: 1, padding: 16 },
  fieldContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#FFFFFF', marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
  },
  chipSelected: { backgroundColor: '#007AFF' },
  chipText: { fontSize: 14, color: '#FFFFFF' },
  chipTextSelected: { fontWeight: '600' },
  textArea: { height: 80, textAlignVertical: 'top' },
  filename: { fontSize: 13, color: '#007AFF', marginBottom: 8 },
  attachButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    alignItems: 'center',
  },
  attachButtonText: { fontSize: 15, color: '#007AFF' },
  modalSpacer: { height: 40 },
});
