# Receipts & Documents Screens Integration

## Overview

**Task:** P2-03 - Create ReceiptsScreen and DocumentsScreen
**Status:** Ready for integration
**User Value:** Medium - allows users to store and manage receipt photos and vehicle documents

---

## Feature Description

Allow users to:
1. View all receipts and documents for a vehicle
2. Add new receipts with photos (multipart upload)
3. Add new documents (PDFs, images, etc.)
4. Edit and delete existing receipts/documents
5. Link receipts to maintenance records
6. Sync files to server on WiFi

---

## API Endpoints

The backend provides endpoints for receipt and document management:

### Receipts

#### POST /api/receipts

Create a receipt.

**Request:** `multipart/form-data`
```
vehicle_id: 1
maintenance_id: 5 (optional)
date: 2026-02-24
vendor: AutoZone
amount: 45.99
category: parts
notes: Oil change supplies
receipt: <image file>
```

**Response:**
```json
{
  "id": 123,
  "vehicle_id": 1,
  "maintenance_id": 5,
  "date": "2026-02-24",
  "vendor": "AutoZone",
  "amount": 45.99,
  "category": "parts",
  "notes": "Oil change supplies",
  "filename": "receipt_123.jpg",
  "created_at": "2026-02-24T10:30:00Z"
}
```

#### GET /api/receipts

Get all receipts.

**Response:**
```json
{
  "receipts": [...]
}
```

#### GET /api/vehicles/{id}/receipts

Get receipts for a specific vehicle.

#### PUT /api/receipts/{id}

Update a receipt.

#### DELETE /api/receipts/{id}

Delete a receipt.

**Response:** `204 No Content`

---

### Documents

#### POST /api/documents

Upload a document.

**Request:** `multipart/form-data`
```
vehicle_id: 1
maintenance_id: 5 (optional)
title: Service Manual
description: Factory service manual
document_type: manual
file: <file>
```

**Response:**
```json
{
  "id": 456,
  "vehicle_id": 1,
  "maintenance_id": 5,
  "title": "Service Manual",
  "description": "Factory service manual",
  "document_type": "manual",
  "filename": "service_manual.pdf",
  "uploaded_at": "2026-02-24T10:30:00Z",
  "created_at": "2026-02-24T10:30:00Z"
}
```

#### GET /api/documents

Get all documents.

#### GET /api/vehicles/{id}/documents

Get documents for a specific vehicle.

#### PUT /api/documents/{id}

Update a document.

#### DELETE /api/documents/{id}

Delete a document.

**Response:** `204 No Content`

---

## Database Schema

### receipts table
```sql
CREATE TABLE receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  maintenance_id INTEGER,
  date TEXT,
  vendor TEXT,
  amount REAL,
  category TEXT,
  notes TEXT,
  filename TEXT,
  synced BOOLEAN DEFAULT 0,
  remote_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (maintenance_id) REFERENCES maintenance(id) ON DELETE SET NULL
);

CREATE INDEX idx_receipts_vehicle_id ON receipts(vehicle_id);
CREATE INDEX idx_receipts_synced ON receipts(synced);
```

### documents table
```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  maintenance_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT,
  filename TEXT,
  synced BOOLEAN DEFAULT 0,
  remote_id INTEGER,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (maintenance_id) REFERENCES maintenance(id) ON DELETE SET NULL
);

CREATE INDEX idx_documents_vehicle_id ON documents(vehicle_id);
CREATE INDEX idx_documents_synced ON documents(synced);
```

---

## Service Layer

### ReceiptService (exists in database.ts)

```typescript
const ReceiptService = {
  async create(receipt: Omit<Receipt, 'id' | 'created_at'>): Promise<number>
  async getAll(): Promise<Receipt[]>
  async getById(id: number): Promise<Receipt | null>
  async getByVehicle(vehicleId: number): Promise<Receipt[]>
  async update(id: number, receipt: Partial<Omit<Receipt, 'id' | 'created_at'>>): Promise<void>
  async delete(id: number): Promise<void>
  async getUnsynced(): Promise<Receipt[]>
  async markSynced(id: number, remoteId: number): Promise<void>
}
```

### DocumentService (exists in database.ts)

```typescript
const DocumentService = {
  async create(doc: Omit<Document, 'id' | 'uploaded_at'>): Promise<number>
  async getAll(): Promise<Document[]>
  async getById(id: number): Promise<Document | null>
  async getByVehicle(vehicleId: number): Promise<Document[]>
  async update(id: number, doc: Partial<Omit<Document, 'id' | 'uploaded_at'>>): Promise<void>
  async delete(id: number): Promise<void>
  async getUnsynced(): Promise<Document[]>
  async markSynced(id: number, remoteId: number): Promise<void>
}
```

---

## Implementation Pattern

### Step 1: Add API Methods

**File:** `src/services/api.ts`

```typescript
// Receipt endpoints
async createReceipt(formData: FormData): Promise<Receipt> {
  const response = await this.instance.post('/api/receipts', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

async getReceipts(): Promise<{ receipts: Receipt[] }> {
  const response = await this.instance.get('/api/receipts');
  return response.data;
}

async getVehicleReceipts(vehicleId: number): Promise<{ receipts: Receipt[] }> {
  const response = await this.instance.get(`/api/vehicles/${vehicleId}/receipts`);
  return response.data;
}

async updateReceipt(id: number, data: Partial<Receipt>): Promise<Receipt> {
  const response = await this.instance.put(`/api/receipts/${id}`, data);
  return response.data;
}

async deleteReceipt(id: number): Promise<void> {
  await this.instance.delete(`/api/receipts/${id}`);
}

// Document endpoints
async createDocument(formData: FormData): Promise<Document> {
  const response = await this.instance.post('/api/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

async getDocuments(): Promise<{ documents: Document[] }> {
  const response = await this.instance.get('/api/documents');
  return response.data;
}

async getVehicleDocuments(vehicleId: number): Promise<{ documents: Document[] }> {
  const response = await this.instance.get(`/api/vehicles/${vehicleId}/documents`);
  return response.data;
}

async updateDocument(id: number, data: Partial<Document>): Promise<Document> {
  const response = await this.instance.put(`/api/documents/${id}`, data);
  return response.data;
}

async deleteDocument(id: number): Promise<void> {
  await this.instance.delete(`/api/documents/${id}`);
}
```

---

### Step 2: Create ReceiptsScreen

**File:** `src/screens/ReceiptsScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Card, Loading, EmptyState, Button, Input, SyncStatusBadge } from '../components/common';
import { Receipt, WithSyncStatus } from '../types';
import { ReceiptService } from '../services/database';
import { api } from '../services/api';
import { isUnsynced } from '../lib/syncUtils';
import * as ImagePicker from 'expo-image-picker';
import { logger } from '../lib/logger';

type RootStackParamList = {
  Receipts: { vehicleId: number };
};

export function ReceiptsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Receipts'>>();
  const { vehicleId } = route.params;

  const [receipts, setReceipts] = useState<(Receipt & WithSyncStatus)[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    amount: '',
    category: 'parts',
    notes: '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadReceipts();
  }, [vehicleId]);

  async function loadReceipts() {
    setLoading(true);
    try {
      const data = await ReceiptService.getByVehicle(vehicleId);
      setReceipts(data);
    } catch (error) {
      logger.error('Failed to load receipts:', error);
      Alert.alert('Error', 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  }

  async function handlePickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera roll permission needed');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      logger.error('Failed to pick image:', error);
    }
  }

  async function handleSave() {
    if (!formData.vendor || !formData.amount) {
      Alert.alert('Error', 'Vendor and amount are required');
      return;
    }

    try {
      const receiptData = {
        vehicle_id: vehicleId,
        date: formData.date,
        vendor: formData.vendor,
        amount: parseFloat(formData.amount),
        category: formData.category,
        notes: formData.notes,
        synced: 0,
      };

      if (editingId) {
        await ReceiptService.update(editingId, receiptData);
        logger.info(`Receipt updated: ${editingId}`);
      } else {
        await ReceiptService.create(receiptData);
        logger.info('Receipt created');
      }

      Alert.alert('Success', editingId ? 'Receipt updated' : 'Receipt saved');
      setModalVisible(false);
      resetForm();
      loadReceipts();
    } catch (error) {
      logger.error('Failed to save receipt:', error);
      Alert.alert('Error', 'Failed to save receipt');
    }
  }

  function handleEditPress(receipt: Receipt & WithSyncStatus) {
    setEditingId(receipt.id);
    setFormData({
      date: receipt.date || new Date().toISOString().split('T')[0],
      vendor: receipt.vendor || '',
      amount: receipt.amount?.toString() || '',
      category: receipt.category || 'parts',
      notes: receipt.notes || '',
    });
    setModalVisible(true);
  }

  function handleDeletePress(id: number) {
    Alert.alert(
      'Delete Receipt',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ReceiptService.delete(id);
              logger.info(`Receipt deleted: ${id}`);
              loadReceipts();
            } catch (error) {
              logger.error('Failed to delete receipt:', error);
              Alert.alert('Error', 'Failed to delete receipt');
            }
          },
        },
      ]
    );
  }

  function resetForm() {
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      amount: '',
      category: 'parts',
      notes: '',
    });
    setSelectedImage(null);
  }

  function renderItem({ item }: { item: Receipt & WithSyncStatus }) {
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <SyncStatusBadge isSynced={!isUnsynced(item)} size="small" />
            <Text style={styles.vendor}>{item.vendor || 'Unknown Vendor'}</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => handleEditPress(item)}>
              <Text style={styles.actionButton}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeletePress(item.id)}>
              <Text style={[styles.actionButton, styles.deleteButton]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.amount}>${item.amount?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.category}>{item.category || 'Uncategorized'}</Text>
          <Text style={styles.date}>{item.date || 'No date'}</Text>
          {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Receipts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Loading />
      ) : receipts.length === 0 ? (
        <EmptyState
          title="No Receipts"
          subtitle="Add your first receipt to track expenses"
        />
      ) : (
        <FlatList
          data={receipts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Receipt' : 'Add Receipt'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Input
                label="Date"
                value={formData.date}
                onChangeText={(text) => setFormData({ ...formData, date: text })}
              />

              <Input
                label="Vendor"
                value={formData.vendor}
                onChangeText={(text) => setFormData({ ...formData, vendor: text })}
                placeholder="e.g., AutoZone, Advance Auto Parts"
              />

              <Input
                label="Amount"
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />

              <Input
                label="Category"
                value={formData.category}
                onChangeText={(text) => setFormData({ ...formData, category: text })}
                placeholder="parts, service, fuel, etc."
              />

              <Input
                label="Notes"
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Optional notes"
                multiline
              />

              {selectedImage && (
                <View style={styles.imagePreview}>
                  <Text style={styles.imagePreviewText}>Image selected</Text>
                </View>
              )}

              <Button
                title="Select Receipt Photo"
                onPress={handlePickImage}
                variant="secondary"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vendor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    color: '#FF3B30',
  },
  cardBody: {
    gap: 4,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#30D158',
  },
  category: {
    fontSize: 14,
    color: '#8E8E93',
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
  },
  notes: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    padding: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#3A3A3C',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  imagePreview: {
    backgroundColor: '#2C2C2E',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  imagePreviewText: {
    color: '#30D158',
    textAlign: 'center',
  },
});
```

---

### Step 3: Create DocumentsScreen

**File:** `src/screens/DocumentsScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Card, Loading, EmptyState, Button, Input, SyncStatusBadge } from '../components/common';
import { Document, WithSyncStatus } from '../types';
import { DocumentService } from '../services/database';
import { isUnsynced } from '../lib/syncUtils';
import { logger } from '../lib/logger';
import * as DocumentPicker from 'expo-document-picker';

type RootStackParamList = {
  Documents: { vehicleId: number };
};

const DOCUMENT_TYPES = [
  'manual',
  'warranty',
  'registration',
  'insurance',
  'inspection',
  'service_record',
  'other',
];

export function DocumentsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Documents'>>();
  const { vehicleId } = route.params;

  const [documents, setDocuments] = useState<(Document & WithSyncStatus)[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: 'other',
  });
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [vehicleId]);

  async function loadDocuments() {
    setLoading(true);
    try {
      const data = await DocumentService.getByVehicle(vehicleId);
      setDocuments(data);
    } catch (error) {
      logger.error('Failed to load documents:', error);
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedFile(result.assets[0].uri);
        // Auto-fill title from filename if empty
        if (!formData.title) {
          setFormData({
            ...formData,
            title: result.assets[0].name.replace(/\.[^/.]+$/, ''),
          });
        }
      }
    } catch (error) {
      logger.error('Failed to pick document:', error);
    }
  }

  async function handleSave() {
    if (!formData.title) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    try {
      const docData = {
        vehicle_id: vehicleId,
        title: formData.title,
        description: formData.description,
        document_type: formData.document_type,
        synced: 0,
      };

      if (editingId) {
        await DocumentService.update(editingId, docData);
        logger.info(`Document updated: ${editingId}`);
      } else {
        await DocumentService.create(docData);
        logger.info('Document created');
      }

      Alert.alert('Success', editingId ? 'Document updated' : 'Document saved');
      setModalVisible(false);
      resetForm();
      loadDocuments();
    } catch (error) {
      logger.error('Failed to save document:', error);
      Alert.alert('Error', 'Failed to save document');
    }
  }

  function handleEditPress(doc: Document & WithSyncStatus) {
    setEditingId(doc.id);
    setFormData({
      title: doc.title,
      description: doc.description || '',
      document_type: doc.document_type || 'other',
    });
    setModalVisible(true);
  }

  function handleDeletePress(id: number) {
    Alert.alert(
      'Delete Document',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DocumentService.delete(id);
              logger.info(`Document deleted: ${id}`);
              loadDocuments();
            } catch (error) {
              logger.error('Failed to delete document:', error);
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  }

  function resetForm() {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      document_type: 'other',
    });
    setSelectedFile(null);
  }

  function renderItem({ item }: { item: Document & WithSyncStatus }) {
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <SyncStatusBadge isSynced={!isUnsynced(item)} size="small" />
            <Text style={styles.title}>{item.title}</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => handleEditPress(item)}>
              <Text style={styles.actionButton}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeletePress(item.id)}>
              <Text style={[styles.actionButton, styles.deleteButton]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.type}>{item.document_type || 'Other'}</Text>
          {item.description && (
            <Text style={styles.description}>{item.description}</Text>
          )}
          <Text style={styles.uploaded}>
            Uploaded: {new Date(item.uploaded_at).toLocaleDateString()}
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Loading />
      ) : documents.length === 0 ? (
        <EmptyState
          title="No Documents"
          subtitle="Add manuals, warranties, and other vehicle documents"
        />
      ) : (
        <FlatList
          data={documents}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Document' : 'Add Document'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Input
                label="Title"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="e.g., Service Manual, Warranty"
              />

              <Input
                label="Description"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                placeholder="Optional description"
                multiline
              />

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Document Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {DOCUMENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeChip,
                        formData.document_type === type && styles.typeChipSelected,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, document_type: type })
                      }
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          formData.document_type === type &&
                            styles.typeChipTextSelected,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {selectedFile && (
                <View style={styles.filePreview}>
                  <Text style={styles.filePreviewText}>File selected</Text>
                </View>
              )}

              <Button
                title="Select File"
                onPress={handlePickFile}
                variant="secondary"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    color: '#FF3B30',
  },
  cardBody: {
    gap: 4,
  },
  type: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  uploaded: {
    fontSize: 11,
    color: '#666666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    padding: 16,
  },
  pickerContainer: {
    marginVertical: 12,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    marginRight: 8,
  },
  typeChipSelected: {
    backgroundColor: '#007AFF',
  },
  typeChipText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  typeChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#3A3A3C',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filePreview: {
    backgroundColor: '#2C2C2E',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  filePreviewText: {
    color: '#30D158',
    textAlign: 'center',
  },
});
```

---

### Step 4: Add Navigation

**File:** `src/navigation/AppNavigator.tsx`

Add the new screens to the navigation stack:

```typescript
import { ReceiptsScreen } from '../screens/ReceiptsScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';

// In the OverviewStack or appropriate stack:
<Stack.Screen
  name="Receipts"
  component={ReceiptsScreen}
  options={{ title: 'Receipts' }}
/>
<Stack.Screen
  name="Documents"
  component={DocumentsScreen}
  options={{ title: 'Documents' }}
/>
```

---

### Step 5: Add to AddScreen Navigation

**File:** `src/screens/AddScreen.tsx`

Add buttons to navigate to the new screens:

```typescript
<TouchableOpacity
  style={styles.menuItem}
  onPress={() => navigation.navigate('Receipts', { vehicleId: selectedVehicleId })}
>
  <Text style={styles.menuItemText}>📄 Receipt</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.menuItem}
  onPress={() => navigation.navigate('Documents', { vehicleId: selectedVehicleId })}
>
  <Text style={styles.menuItemText}>📁 Document</Text>
</TouchableOpacity>
```

---

### Step 6: Add Sync for Receipts and Documents

**File:** `src/services/sync.ts`

Add sync methods to SyncManager:

```typescript
private async pushReceipts(): Promise<SyncResult> {
  const result: SyncResult = {
    type: 'receipts',
    pushed: 0,
    pulled: 0,
    failed: 0,
    resolved: 0,
    localWins: 0,
    remoteWins: 0,
  };

  try {
    const unsynced = await ReceiptService.getUnsynced();

    for (const receipt of unsynced) {
      try {
        const formData = new FormData();
        formData.append('vehicle_id', receipt.vehicle_id.toString());
        if (receipt.maintenance_id) {
          formData.append('maintenance_id', receipt.maintenance_id.toString());
        }
        formData.append('date', receipt.date || '');
        formData.append('vendor', receipt.vendor || '');
        formData.append('amount', receipt.amount?.toString() || '0');
        formData.append('category', receipt.category || '');
        formData.append('notes', receipt.notes || '');

        const response = await this.api.createReceipt(formData);
        await ReceiptService.markSynced(receipt.id, response.id);

        result.pushed++;
        logger.info(`Receipt synced: ${receipt.id} → ${response.id}`);
      } catch (error) {
        logger.error(`Failed to sync receipt ${receipt.id}:`, error);
        result.failed++;
      }
    }
  } catch (error) {
    logger.error('Receipt push failed:', error);
    result.failed += unsynced.length;
  }

  return result;
}

private async pullReceipts(): Promise<SyncResult> {
  const result: SyncResult = {
    type: 'receipts',
    pushed: 0,
    pulled: 0,
    failed: 0,
    resolved: 0,
    localWins: 0,
    remoteWins: 0,
  };

  try {
    const response = await this.api.getReceipts();

    for (const remoteReceipt of response.receipts) {
      const existing = await ReceiptService.getByRemoteId(remoteReceipt.id);

      if (!existing) {
        await ReceiptService.create({
          vehicle_id: remoteReceipt.vehicle_id,
          maintenance_id: remoteReceipt.maintenance_id,
          date: remoteReceipt.date,
          vendor: remoteReceipt.vendor,
          amount: remoteReceipt.amount,
          category: remoteReceipt.category,
          notes: remoteReceipt.notes,
          filename: remoteReceipt.filename,
          synced: 1,
          remote_id: remoteReceipt.id,
        });
        result.pulled++;
      } else {
        const conflict = resolveConflict(existing, remoteReceipt, 'receipts');
        if (conflict.resolved && !conflict.localWins) {
          result.remoteWins++;
          await ReceiptService.update(existing.id, {
            ...remoteReceipt,
            synced: 1,
            remote_id: remoteReceipt.id,
          });
        }
        result.resolved++;
      }
    }
  } catch (error) {
    logger.error('Receipt pull failed:', error);
    result.failed++;
  }

  return result;
}

// Similar methods for documents...
```

---

## Dependencies

Ensure these packages are installed:

```json
{
  "expo-image-picker": "~15.0.0",
  "expo-document-picker": "~12.0.0"
}
```

---

## Testing Checklist

- [ ] ReceiptsScreen displays list of receipts
- [ ] Add receipt modal works
- [ ] Edit receipt pre-populates form
- [ ] Delete receipt shows confirmation
- [ ] Receipt photo selection works
- [ ] DocumentsScreen displays list of documents
- [ ] Add document modal works
- [ ] Document type picker works
- [ ] File selection works
- [ ] Edit/delete documents work
- [ ] Sync status badges show correctly
- [ ] Navigation from AddScreen works
- [ ] Build passes with no TypeScript errors

---

## Integration Steps

1. **Backup existing files**
2. **Install dependencies:**
   ```bash
   npx expo install expo-image-picker expo-document-picker
   ```
3. **Create ReceiptsScreen.tsx and DocumentsScreen.tsx**
4. **Update api.ts** with receipt/document methods
5. **Update navigation** to include new screens
6. **Update AddScreen** with navigation buttons
7. **Update sync.ts** with push/pull methods
8. **Test the implementation**

---

## Acceptance Criteria

- [ ] ReceiptsScreen shows list of receipts for vehicle
- [ ] User can add new receipt with vendor, amount, category, date
- [ ] User can edit existing receipt
- [ ] User can delete receipt with confirmation
- [ ] User can attach photo to receipt
- [ ] DocumentsScreen shows list of documents for vehicle
- [ ] User can add new document with title, type, description
- [ ] User can select file from device
- [ ] User can edit existing document
- [ ] User can delete document with confirmation
- [ ] Sync status indicators show on receipts and documents
- [ ] Navigation works from AddScreen and OverviewScreen
- [ ] Build passes with no errors

---

**Created:** 2026-02-24
**Status:** Ready for integration
