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
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { ReceiptService, VehicleService } from '../services/database';
import { Receipt, Vehicle } from '../types';
import { isUnsynced } from '../lib/syncUtils';
import { Card, Input, Loading, EmptyState, SyncStatusBadge } from '../components/common';

const RECEIPT_CATEGORIES = [
  { value: 'parts', label: 'Parts' },
  { value: 'labor', label: 'Labor' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'registration', label: 'Registration' },
  { value: 'other', label: 'Other' },
];

interface ReceiptFormData {
  date: string;
  vendor: string;
  amount: string;
  category: string;
  notes: string;
}

const initialFormData: ReceiptFormData = {
  date: new Date().toISOString().split('T')[0],
  vendor: '',
  amount: '',
  category: 'parts',
  notes: '',
};

export default function ReceiptsScreen() {
  const route = useRoute<RouteProp<{ Screen: { vehicleId?: number } }, 'Screen'>>();
  const vehicleId = route.params?.vehicleId ?? 0;
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState<ReceiptFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const [vehicleData, receiptsData] = await Promise.all([
      VehicleService.getById(vehicleId),
      ReceiptService.getByVehicle(vehicleId),
    ]);
    setVehicle(vehicleData);
    setReceipts(receiptsData);
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

  const handleAddPress = () => {
    setFormData({ ...initialFormData, date: new Date().toISOString().split('T')[0] });
    setEditingId(null);
    setModalVisible(true);
  };

  const handleEditPress = (item: Receipt) => {
    setFormData({
      date: item.date || new Date().toISOString().split('T')[0],
      vendor: item.vendor || '',
      amount: item.amount != null ? String(item.amount) : '',
      category: item.category || 'parts',
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setModalVisible(true);
  };

  const handleDeletePress = (item: Receipt) => {
    Alert.alert(
      'Delete Receipt',
      `Delete receipt from ${item.vendor || 'Unknown'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await ReceiptService.delete(item.id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.vendor.trim()) {
      Alert.alert('Error', 'Vendor is required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        vehicle_id: vehicleId,
        maintenance_id: null,
        date: formData.date || null,
        vendor: formData.vendor.trim() || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        category: formData.category || null,
        notes: formData.notes.trim() || null,
        filename: null,
        synced: 0,
        remote_id: null,
        updated_at: new Date().toISOString(),
      };
      if (editingId !== null) {
        await ReceiptService.update(editingId, data);
      } else {
        await ReceiptService.create(data);
      }
      setModalVisible(false);
      await loadData();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Please try again';
      Alert.alert('Save Failed', `Could not save receipt. ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatAmount = (amount: number | null): string => {
    if (amount == null) return 'N/A';
    return `$${amount.toFixed(2)}`;
  };

  const totalSpent = receipts.reduce((sum, r) => sum + (r.amount || 0), 0);

  const renderItem = ({ item }: { item: Receipt }) => (
    <Card>
      <View style={styles.itemHeader}>
        <View style={styles.itemHeaderLeft}>
          <Text style={styles.vendor}>{item.vendor || 'Unknown Vendor'}</Text>
          <Text style={styles.date}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.itemHeaderRight}>
          <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
          {(isUnsynced(item as any)) && <SyncStatusBadge isSynced={false} size="small" />}
        </View>
      </View>
      {item.category && (
        <View style={[styles.categoryBadge, { backgroundColor: '#2C2C2E' }]}>
          <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
        </View>
      )}
      {item.notes && (
        <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
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
          <Text style={styles.headerTitle}>{vehicle?.name || 'Receipts'}</Text>
          <Text style={styles.headerSubtitle}>Total: {formatAmount(totalSpent)}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {receipts.length === 0 ? (
        <EmptyState
          message="No Receipts"
          submessage="Add receipts to track your vehicle expenses"
        />
      ) : (
        <FlatList
          data={receipts}
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
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingId !== null ? 'Edit Receipt' : 'Add Receipt'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label="Vendor *"
              value={formData.vendor}
              onChangeText={text => setFormData({ ...formData, vendor: text })}
              placeholder="AutoZone, Jiffy Lube, etc."
            />
            <Input
              label="Date"
              value={formData.date}
              onChangeText={text => setFormData({ ...formData, date: text })}
              placeholder="YYYY-MM-DD"
            />
            <Input
              label="Amount ($)"
              value={formData.amount}
              onChangeText={text => setFormData({ ...formData, amount: text })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {RECEIPT_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[styles.chip, formData.category === cat.value && styles.chipSelected]}
                      onPress={() => setFormData({ ...formData, category: cat.value })}
                    >
                      <Text style={[styles.chipText, formData.category === cat.value && styles.chipTextSelected]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <Input
              label="Notes"
              value={formData.notes}
              onChangeText={text => setFormData({ ...formData, notes: text })}
              placeholder="Additional details"
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />
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
  itemHeaderRight: { alignItems: 'flex-end', gap: 4 },
  vendor: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  date: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  amount: { fontSize: 18, fontWeight: '700', color: '#30D158' },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryText: { fontSize: 11, fontWeight: '600', color: '#8E8E93' },
  notes: { fontSize: 13, color: '#FFFFFF', marginBottom: 8 },
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
  modalSpacer: { height: 40 },
});
