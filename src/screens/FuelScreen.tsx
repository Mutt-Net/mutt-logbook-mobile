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
import { FuelEntryService, VehicleService } from '../services/database';
import { FuelEntry, Vehicle, WithSyncStatus } from '../types';
import { isUnsynced } from '../lib/syncUtils';
import { Card, Input, Loading, EmptyState, SyncStatusBadge } from '../components/common';

interface FuelFormData {
  date: string;
  mileage: string;
  gallons: string;
  price_per_gallon: string;
  total_cost: string;
  station: string;
  notes: string;
}

const initialFormData: FuelFormData = {
  date: new Date().toISOString().split('T')[0],
  mileage: '',
  gallons: '',
  price_per_gallon: '',
  total_cost: '',
  station: '',
  notes: '',
};

interface FuelScreenProps {
  vehicleId: number;
}

export default function FuelScreen({ vehicleId }: FuelScreenProps) {
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState<FuelFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const [vehicleData, fuelData] = await Promise.all([
      VehicleService.getById(vehicleId),
      FuelEntryService.getByVehicle(vehicleId),
    ]);
    setVehicle(vehicleData);
    setFuelEntries(fuelData);
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

  const handleEditPress = (item: FuelEntry) => {
    setFormData({
      date: item.date || '',
      mileage: item.mileage?.toString() || '',
      gallons: item.gallons?.toString() || '',
      price_per_gallon: item.price_per_gallon?.toString() || '',
      total_cost: item.total_cost?.toString() || '',
      station: item.station || '',
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setModalVisible(true);
  };

  const handleDeletePress = (item: FuelEntry) => {
    Alert.alert(
      'Delete Fuel Entry',
      `Are you sure you want to delete this fuel entry from ${item.date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await FuelEntryService.delete(item.id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleGallonsOrPriceChange = (field: 'gallons' | 'price_per_gallon', value: string) => {
    const newFormData = { ...formData, [field]: value };
    
    const gallons = parseFloat(newFormData.gallons) || 0;
    const pricePerGallon = parseFloat(newFormData.price_per_gallon) || 0;
    
    if (gallons > 0 && pricePerGallon > 0) {
      newFormData.total_cost = (gallons * pricePerGallon).toFixed(2);
    }
    
    setFormData(newFormData);
  };

  const handleSave = async () => {
    if (!formData.date) {
      Alert.alert('Error', 'Date is required');
      return;
    }
    if (!formData.gallons) {
      Alert.alert('Error', 'Gallons is required');
      return;
    }

    setSaving(true);
    try {
      const fuelData = {
        vehicle_id: vehicleId,
        date: formData.date || null,
        mileage: formData.mileage ? parseInt(formData.mileage, 10) : null,
        gallons: formData.gallons ? parseFloat(formData.gallons) : null,
        price_per_gallon: formData.price_per_gallon ? parseFloat(formData.price_per_gallon) : null,
        total_cost: formData.total_cost ? parseFloat(formData.total_cost) : null,
        station: formData.station || null,
        notes: formData.notes || null,
      };

      if (editingId !== null) {
        await FuelEntryService.update(editingId, fuelData);
      } else {
        await FuelEntryService.create(fuelData);
      }
      setModalVisible(false);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save fuel entry');
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

  const calculateSummary = () => {
    const totalCost = fuelEntries.reduce((sum, entry) => sum + (entry.total_cost || 0), 0);
    const totalGallons = fuelEntries.reduce((sum, entry) => sum + (entry.gallons || 0), 0);
    
    let totalMiles = 0;
    const sortedEntries = [...fuelEntries].sort((a, b) => {
      const mileageA = a.mileage || 0;
      const mileageB = b.mileage || 0;
      return mileageB - mileageA;
    });
    
    for (let i = 0; i < sortedEntries.length - 1; i++) {
      const current = sortedEntries[i];
      const next = sortedEntries[i + 1];
      if (current.mileage && next.mileage && current.mileage > next.mileage) {
        totalMiles += current.mileage - next.mileage;
      }
    }
    
    const avgMpg = totalGallons > 0 && totalMiles > 0 ? totalMiles / totalGallons : 0;
    
    return { totalCost, avgMpg };
  };

  const { totalCost, avgMpg } = calculateSummary();

  const renderSummaryCard = () => (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Spent</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalCost)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Avg MPG</Text>
          <Text style={styles.summaryValue}>
            {avgMpg > 0 ? avgMpg.toFixed(1) : '-'}
          </Text>
        </View>
      </View>
    </Card>
  );

  const renderItem = ({ item }: { item: FuelEntry }) => (
    <Card>
      <View style={styles.itemHeader}>
        <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
        {item.station && <Text style={styles.itemStation}>{item.station}</Text>}
      </View>
      <View style={styles.itemDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Gallons</Text>
          <Text style={styles.detailValue}>
            {item.gallons ? item.gallons.toFixed(2) : '-'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>$/Gal</Text>
          <Text style={styles.detailValue}>
            {item.price_per_gallon ? formatCurrency(item.price_per_gallon) : '-'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total</Text>
          <Text style={styles.detailCost}>{formatCurrency(item.total_cost)}</Text>
        </View>
      </View>
      <View style={styles.itemFooter}>
        {item.mileage && (
          <Text style={styles.itemMileage}>{item.mileage.toLocaleString()} mi</Text>
        )}
        {item.notes && (
          <Text style={styles.itemNotes} numberOfLines={1}>{item.notes}</Text>
        )}
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
          <Text style={styles.headerTitle}>{vehicle?.name || 'Fuel'}</Text>
          <Text style={styles.headerSubtitle}>
            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {fuelEntries.length === 0 ? (
        <EmptyState
          message="No Fuel Records"
          submessage="Add your first fuel entry to start tracking your vehicle's fuel economy"
        />
      ) : (
        <FlatList
          data={fuelEntries}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderSummaryCard}
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
              {editingId !== null ? 'Edit Fuel' : 'Add Fuel'}
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

            <Input
              label="Gallons *"
              value={formData.gallons}
              onChangeText={(text) => handleGallonsOrPriceChange('gallons', text)}
              placeholder="0.000"
              keyboardType="decimal-pad"
            />

            <Input
              label="Price per Gallon"
              value={formData.price_per_gallon}
              onChangeText={(text) => handleGallonsOrPriceChange('price_per_gallon', text)}
              placeholder="0.000"
              keyboardType="decimal-pad"
            />

            <Input
              label="Total Cost"
              value={formData.total_cost}
              onChangeText={(text) => setFormData({ ...formData, total_cost: text })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <Input
              label="Station"
              value={formData.station}
              onChangeText={(text) => setFormData({ ...formData, station: text })}
              placeholder="e.g., Shell, Costco"
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
  summaryCard: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  itemStation: {
    fontSize: 14,
    color: '#8E8E93',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  detailCost: {
    fontSize: 18,
    fontWeight: '600',
    color: '#30D158',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    paddingTop: 8,
  },
  itemMileage: {
    fontSize: 14,
    color: '#8E8E93',
  },
  itemNotes: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalSpacer: {
    height: 40,
  },
});

