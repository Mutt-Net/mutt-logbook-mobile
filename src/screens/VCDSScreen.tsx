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
import { VCDSFaultService, VehicleService } from '../services/database';
import { VCDSFault, Vehicle } from '../types';
import { Card, Button, Input, Loading, EmptyState } from '../components/common';

interface VCDSFormData {
  address: string;
  fault_code: string;
  component: string;
  description: string;
  status: 'active' | 'cleared';
}

const initialFormData: VCDSFormData = {
  address: '',
  fault_code: '',
  component: '',
  description: '',
  status: 'active',
};

interface VCDSScreenProps {
  vehicleId: number;
}

export default function VCDSScreen({ vehicleId }: VCDSScreenProps) {
  const [faults, setFaults] = useState<VCDSFault[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState<VCDSFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const [vehicleData, faultsData] = await Promise.all([
      VehicleService.getById(vehicleId),
      VCDSFaultService.getByVehicle(vehicleId),
    ]);
    setVehicle(vehicleData);
    setFaults(faultsData);
  }, [vehicleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) {
      loadData();
    }
  }, [vehicleId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleAddPress = () => {
    setFormData(initialFormData);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.fault_code) {
      Alert.alert('Error', 'Fault code is required');
      return;
    }

    setSaving(true);
    try {
      await VCDSFaultService.create({
        vehicle_id: vehicleId,
        address: formData.address || null,
        fault_code: formData.fault_code || null,
        component: formData.component || null,
        description: formData.description || null,
        status: formData.status,
        detected_date: formData.status === 'active' ? new Date().toISOString().split('T')[0] : null,
        cleared_date: formData.status === 'cleared' ? new Date().toISOString().split('T')[0] : null,
        notes: null,
      });
      setModalVisible(false);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save fault code');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string | null): string => {
    return status === 'active' ? '#FF3B30' : '#30D158';
  };

  const renderItem = ({ item }: { item: VCDSFault }) => (
    <Card>
      <View style={styles.itemHeader}>
        <View style={styles.codeContainer}>
          <Text style={styles.faultCode}>{item.fault_code || 'N/A'}</Text>
          {item.address && <Text style={styles.address}>Address: {item.address}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>
      {item.component && (
        <Text style={styles.component}>{item.component}</Text>
      )}
      {item.description && (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      <View style={styles.itemFooter}>
        <Text style={styles.date}>Detected: {formatDate(item.detected_date)}</Text>
        {item.cleared_date && (
          <Text style={styles.clearedDate}>Cleared: {formatDate(item.cleared_date)}</Text>
        )}
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
          <Text style={styles.headerTitle}>{vehicle?.name || 'VCDS Faults'}</Text>
          <Text style={styles.headerSubtitle}>
            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {faults.length === 0 ? (
        <EmptyState
          message="No Fault Codes"
          submessage="Add your first VCDS fault code to track diagnostic issues"
        />
      ) : (
        <FlatList
          data={faults}
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
            <Text style={styles.modalTitle}>Add Fault Code</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label="Address (e.g., 01, 03, 17)"
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Control module address"
            />

            <Input
              label="Fault Code *"
              value={formData.fault_code}
              onChangeText={(text) => setFormData({ ...formData, fault_code: text })}
              placeholder="P0300, 00532, etc."
            />

            <Input
              label="Component"
              value={formData.component}
              onChangeText={(text) => setFormData({ ...formData, component: text })}
              placeholder="Faulty component"
            />

            <Input
              label="Description"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Fault description"
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusPicker}>
                <TouchableOpacity
                  style={[
                    styles.statusChip,
                    formData.status === 'active' && styles.statusChipSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, status: 'active' })}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      formData.status === 'active' && styles.statusChipTextSelected,
                    ]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusChip,
                    formData.status === 'cleared' && styles.statusChipSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, status: 'cleared' })}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      formData.status === 'cleared' && styles.statusChipTextSelected,
                    ]}
                  >
                    Cleared
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  codeContainer: {
    flex: 1,
  },
  faultCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#8E8E93',
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
  component: {
    fontSize: 16,
    color: '#FF9500',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
  },
  clearedDate: {
    fontSize: 12,
    color: '#30D158',
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
  statusPicker: {
    flexDirection: 'row',
  },
  statusChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    marginRight: 12,
  },
  statusChipSelected: {
    backgroundColor: '#007AFF',
  },
  statusChipText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  statusChipTextSelected: {
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
