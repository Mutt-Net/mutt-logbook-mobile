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
import { MaintenanceService, VehicleService } from '../services/database';
import { Maintenance, Vehicle, WithSyncStatus } from '../types';
import { isUnsynced } from '../lib/syncUtils';
import { Card, Button, Input, Loading, EmptyState, SyncStatusBadge } from '../components/common';

const MAINTENANCE_CATEGORIES = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'brakes', label: 'Brakes' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'engine', label: 'Engine' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'other', label: 'Other' },
];

interface MaintenanceFormData {
  date: string;
  mileage: string;
  category: string;
  description: string;
  cost: string;
  shop_name: string;
  notes: string;
  parts_used: string;
  labor_hours: string;
}

const initialFormData: MaintenanceFormData = {
  date: new Date().toISOString().split('T')[0],
  mileage: '',
  category: '',
  description: '',
  cost: '',
  shop_name: '',
  notes: '',
  parts_used: '',
  labor_hours: '',
};

interface MaintenanceScreenProps {
  vehicleId: number;
}

export default function MaintenanceScreen({ vehicleId }: MaintenanceScreenProps) {
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState<MaintenanceFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const [vehicleData, maintenanceData] = await Promise.all([
      VehicleService.getById(vehicleId),
      MaintenanceService.getByVehicle(vehicleId),
    ]);
    setVehicle(vehicleData);
    setMaintenance(maintenanceData);
  }, [vehicleId]);

  useEffect(() => {
    let cancelled = false;
    
    const fetchData = async () => {
      await loadData();
      if (!cancelled) {
        setLoading(false);
      }
    };
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;
    
    const fetchData = async () => {
      if (!loading) {
        await loadData();
      }
    };
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleAddPress = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setModalVisible(true);
  };

  const handleEditPress = (item: Maintenance) => {
    setFormData({
      date: item.date || '',
      mileage: item.mileage?.toString() || '',
      category: item.category || '',
      description: item.description || '',
      cost: item.cost?.toString() || '',
      shop_name: item.shop_name || '',
      notes: item.notes || '',
      parts_used: item.parts_used || '',
      labor_hours: item.labor_hours?.toString() || '',
    });
    setEditingId(item.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.date) {
      Alert.alert('Error', 'Date is required');
      return;
    }

    setSaving(true);
    try {
      const maintenanceData = {
        vehicle_id: vehicleId,
        date: formData.date || null,
        mileage: formData.mileage ? parseInt(formData.mileage, 10) : null,
        category: formData.category || null,
        description: formData.description || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        shop_name: formData.shop_name || null,
        notes: formData.notes || null,
        parts_used: formData.parts_used || null,
        labor_hours: formData.labor_hours ? parseFloat(formData.labor_hours) : null,
      };

      if (editingId !== null) {
        await MaintenanceService.update(editingId, maintenanceData);
      } else {
        await MaintenanceService.create(maintenanceData);
      }
      setModalVisible(false);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save maintenance record');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePress = (item: Maintenance) => {
    Alert.alert(
      'Delete Maintenance Record',
      `Are you sure you want to delete "${item.description || 'Maintenance'}" from ${item.date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await MaintenanceService.delete(item.id);
            await loadData();
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) return '-';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getCategoryLabel = (category: string | null): string => {
    if (!category) return 'Maintenance';
    const found = MAINTENANCE_CATEGORIES.find(c => c.value === category);
    return found ? found.label : category;
  };

  const getCategoryColor = (category: string | null): string => {
    switch (category) {
      case 'oil_change':
        return '#FF9500';
      case 'brakes':
        return '#FF3B30';
      case 'suspension':
        return '#AF52DE';
      case 'electrical':
        return '#5856D6';
      case 'engine':
        return '#FF2D55';
      case 'transmission':
        return '#00C7BE';
      case 'interior':
        return '#34C759';
      case 'exterior':
        return '#5AC8FA';
      default:
        return '#8E8E93';
    }
  };

  const renderItem = ({ item }: { item: Maintenance }) => (
    <Card>
      <View style={styles.itemHeader}>
        <View style={styles.syncStatusContainer}>
          <SyncStatusBadge isSynced={!isUnsynced(item)} size="small" />
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
          <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
        </View>
        <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.itemDescription} numberOfLines={2}>
        {item.description || 'No description'}
      </Text>
      {item.shop_name && (
        <Text style={styles.itemShop}>{item.shop_name}</Text>
      )}
      {item.parts_used && (
        <Text style={styles.itemParts}>Parts: {item.parts_used}</Text>
      )}
      {item.labor_hours && (
        <Text style={styles.itemLabor}>Labor: {item.labor_hours} hrs</Text>
      )}
      <View style={styles.itemFooter}>
        {item.mileage && (
          <Text style={styles.itemMileage}>{item.mileage.toLocaleString()} mi</Text>
        )}
        <Text style={styles.itemCost}>{formatCurrency(item.cost)}</Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditPress(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePress(item)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{vehicle?.name || 'Maintenance'}</Text>
          <Text style={styles.headerSubtitle}>
            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {maintenance.length === 0 ? (
        <EmptyState
          message="No Maintenance Records"
          submessage="Add your first maintenance record to start tracking your vehicle's service history"
        />
      ) : (
        <FlatList
          data={maintenance}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
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
              {editingId !== null ? 'Edit Maintenance' : 'Add Maintenance'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label="Date *"
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
              placeholder="YYYY-MM-DD"
            />

            <Input
              label="Mileage"
              value={formData.mileage}
              onChangeText={(text) => setFormData({ ...formData, mileage: text })}
              placeholder="Current odometer reading"
              keyboardType="numeric"
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                {MAINTENANCE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      formData.category === cat.value && styles.categoryChipSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat.value })}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        formData.category === cat.value && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Input
              label="Description"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="What was done?"
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />

            <Input
              label="Cost"
              value={formData.cost}
              onChangeText={(text) => setFormData({ ...formData, cost: text })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <Input
              label="Shop Name"
              value={formData.shop_name}
              onChangeText={(text) => setFormData({ ...formData, shop_name: text })}
              placeholder="Where was the service done?"
            />

            <Input
              label="Parts Used"
              value={formData.parts_used}
              onChangeText={(text) => setFormData({ ...formData, parts_used: text })}
              placeholder="List parts used"
            />

            <Input
              label="Labor Hours"
              value={formData.labor_hours}
              onChangeText={(text) => setFormData({ ...formData, labor_hours: text })}
              placeholder="Hours spent"
              keyboardType="decimal-pad"
            />

            <Input
              label="Notes"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Any additional notes..."
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
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncStatusContainer: {
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  itemDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  itemDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  itemShop: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  itemParts: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  itemLabor: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMileage: {
    fontSize: 14,
    color: '#8E8E93',
  },
  itemCost: {
    fontSize: 16,
    color: '#30D158',
    fontWeight: '600',
  },
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
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalCancel: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalSaveDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  categoryPicker: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  categoryChipTextSelected: {
    fontWeight: '600',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalSpacer: {
    height: 40,
  },
});

