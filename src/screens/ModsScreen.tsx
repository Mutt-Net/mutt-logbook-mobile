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
import { ModService, VehicleService } from '../services/database';
import { Mod, Vehicle } from '../types';
import { Card, Input, Loading, EmptyState } from '../components/common';

const MOD_CATEGORIES = [
  { value: 'engine', label: 'Engine' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'exhaust', label: 'Exhaust' },
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'brakes', label: 'Brakes' },
  { value: 'wheels', label: 'Wheels' },
  { value: 'other', label: 'Other' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

type StatusFilter = 'all' | 'planned' | 'in_progress' | 'completed';

interface ModFormData {
  date: string;
  mileage: string;
  category: string;
  description: string;
  parts: string;
  cost: string;
  status: 'planned' | 'in_progress' | 'completed';
  notes: string;
}

const initialFormData: ModFormData = {
  date: new Date().toISOString().split('T')[0],
  mileage: '',
  category: '',
  description: '',
  parts: '',
  cost: '',
  status: 'planned',
  notes: '',
};

interface ModsScreenProps {
  vehicleId: number;
}

export default function ModsScreen({ vehicleId }: ModsScreenProps) {
  const [mods, setMods] = useState<Mod[]>([]);
  const [filteredMods, setFilteredMods] = useState<Mod[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState<ModFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadData = useCallback(async () => {
    const [vehicleData, modsData] = await Promise.all([
      VehicleService.getById(vehicleId),
      ModService.getByVehicle(vehicleId),
    ]);
    setVehicle(vehicleData);
    setMods(modsData);
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

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredMods(mods);
    } else {
      setFilteredMods(mods.filter(mod => mod.status === statusFilter));
    }
  }, [mods, statusFilter]);

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

  const handleEditPress = (item: Mod) => {
    setFormData({
      date: item.date || '',
      mileage: item.mileage?.toString() || '',
      category: item.category || '',
      description: item.description || '',
      parts: item.parts || '',
      cost: item.cost?.toString() || '',
      status: item.status,
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setModalVisible(true);
  };

  const handleDeletePress = (item: Mod) => {
    Alert.alert(
      'Delete Mod',
      `Are you sure you want to delete "${item.description || 'Mod'}" from ${item.date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await ModService.delete(item.id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.date) {
      Alert.alert('Error', 'Date is required');
      return;
    }

    setSaving(true);
    try {
      const modData = {
        vehicle_id: vehicleId,
        date: formData.date || null,
        mileage: formData.mileage ? parseInt(formData.mileage, 10) : null,
        category: formData.category || null,
        description: formData.description || null,
        parts: formData.parts || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        status: formData.status,
        notes: formData.notes || null,
      };

      if (editingId !== null) {
        await ModService.update(editingId, modData);
      } else {
        await ModService.create(modData);
      }
      setModalVisible(false);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save mod');
    } finally {
      setSaving(false);
    }
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
    if (!category) return 'Mod';
    const found = MOD_CATEGORIES.find(c => c.value === category);
    return found ? found.label : category;
  };

  const getCategoryColor = (category: string | null): string => {
    switch (category) {
      case 'engine':
        return '#FF2D55';
      case 'suspension':
        return '#AF52DE';
      case 'exhaust':
        return '#FF9500';
      case 'interior':
        return '#34C759';
      case 'exterior':
        return '#5AC8FA';
      case 'brakes':
        return '#FF3B30';
      case 'wheels':
        return '#5856D6';
      default:
        return '#8E8E93';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'planned':
        return '#FF9500';
      case 'in_progress':
        return '#007AFF';
      case 'completed':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'planned':
        return 'Planned';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const renderItem = ({ item }: { item: Mod }) => (
    <Card>
      <View style={styles.itemHeader}>
        <View style={styles.itemHeaderLeft}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
            <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.itemDescription} numberOfLines={2}>
        {item.description || 'No description'}
      </Text>
      {item.parts && (
        <Text style={styles.itemParts} numberOfLines={1}>
          Parts: {item.parts}
        </Text>
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
          <Text style={styles.headerTitle}>{vehicle?.name || 'Mods'}</Text>
          <Text style={styles.headerSubtitle}>
            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                statusFilter === filter.value && styles.filterChipSelected,
              ]}
              onPress={() => setStatusFilter(filter.value as StatusFilter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === filter.value && styles.filterChipTextSelected,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filteredMods.length === 0 ? (
        <EmptyState
          message="No Mods"
          submessage={
            statusFilter === 'all'
              ? "Add your first modification to start tracking your vehicle's upgrades"
              : `No ${getStatusLabel(statusFilter).toLowerCase()} mods found`
          }
        />
      ) : (
        <FlatList
          data={filteredMods}
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
              {editingId !== null ? 'Edit Mod' : 'Add Mod'}
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
                {MOD_CATEGORIES.map((cat) => (
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
              placeholder="What modification was done?"
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />

            <Input
              label="Parts"
              value={formData.parts}
              onChangeText={(text) => setFormData({ ...formData, parts: text })}
              placeholder="List of parts used..."
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

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                {STATUS_FILTERS.filter(f => f.value !== 'all').map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.categoryChip,
                      formData.status === status.value && styles.categoryChipSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, status: status.value as 'planned' | 'in_progress' | 'completed' })}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        formData.status === status.value && styles.categoryChipTextSelected,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

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
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  filterChipTextSelected: {
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
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
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
  itemParts: {
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
