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
  TextInput,
} from 'react-native';
import { VCDSFaultService, VehicleService } from '../services/database';
import { VCDSFault, Vehicle } from '../types';
import apiService from '../services/api';
import { Card, Button, Input, Loading, EmptyState } from '../components/common';

interface ParsedFault {
  address: string | null;
  fault_code: string | null;
  component: string | null;
  description: string | null;
  status: 'active' | 'cleared';
  selected: boolean;
  isDuplicate: boolean;
}

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
  const [editingId, setEditingId] = useState<number | null>(null);

  // VCDS import state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [vcdsText, setVcdsText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedFaults, setParsedFaults] = useState<ParsedFault[]>([]);

  const loadData = useCallback(async () => {
    const [vehicleData, faultsData] = await Promise.all([
      VehicleService.getById(vehicleId),
      VCDSFaultService.getByVehicle(vehicleId),
    ]);
    setVehicle(vehicleData);
    setFaults(faultsData);
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

  const handleEditPress = (item: VCDSFault) => {
    setFormData({
      address: item.address || '',
      fault_code: item.fault_code || '',
      component: item.component || '',
      description: item.description || '',
      status: item.status as 'active' | 'cleared',
    });
    setEditingId(item.id);
    setModalVisible(true);
  };

  const handleDeletePress = (item: VCDSFault) => {
    Alert.alert(
      'Delete Fault Code',
      `Are you sure you want to delete fault code ${item.fault_code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await VCDSFaultService.delete(item.id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.fault_code) {
      Alert.alert('Error', 'Fault code is required');
      return;
    }

    setSaving(true);
    try {
      const faultData = {
        vehicle_id: vehicleId,
        address: formData.address || null,
        fault_code: formData.fault_code || null,
        component: formData.component || null,
        description: formData.description || null,
        status: formData.status,
        detected_date: formData.status === 'active' ? new Date().toISOString().split('T')[0] : null,
        cleared_date: formData.status === 'cleared' ? new Date().toISOString().split('T')[0] : null,
        notes: null,
      };

      if (editingId !== null) {
        await VCDSFaultService.update(editingId, faultData);
      } else {
        await VCDSFaultService.create(faultData);
      }
      setModalVisible(false);
      await loadData();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Please try again';
      Alert.alert('Save Failed', `Could not save fault code. ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleParse = async () => {
    if (!vcdsText.trim()) {
      Alert.alert('Error', 'Please paste your VCDS log text first');
      return;
    }
    setParsing(true);
    try {
      const response = await apiService.vcds.parse({ raw_text: vcdsText });
      const existing = new Set(faults.map(f => f.fault_code).filter(Boolean));
      const withMeta: ParsedFault[] = response.faults.map(f => ({
        address: f.address ?? null,
        fault_code: f.fault_code ?? null,
        component: f.component ?? null,
        description: f.description ?? null,
        status: (f.status as 'active' | 'cleared') ?? 'active',
        selected: !existing.has(f.fault_code ?? null),
        isDuplicate: existing.has(f.fault_code ?? null),
      }));
      setParsedFaults(withMeta);
      setImportModalVisible(false);
      setReviewModalVisible(true);
    } catch {
      Alert.alert('Parse Failed', 'Could not parse the VCDS log. Check the format and try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    const toImport = parsedFaults.filter(f => f.selected && !f.isDuplicate);
    if (toImport.length === 0) {
      Alert.alert('Nothing to Import', 'Select at least one new fault to import.');
      return;
    }
    setImporting(true);
    try {
      for (const f of toImport) {
        await VCDSFaultService.create({
          vehicle_id: vehicleId,
          address: f.address,
          fault_code: f.fault_code,
          component: f.component,
          description: f.description,
          status: f.status,
          detected_date: new Date().toISOString().split('T')[0],
          cleared_date: null,
          notes: null,
        });
      }
      Alert.alert('Imported', `${toImport.length} fault${toImport.length !== 1 ? 's' : ''} added.`);
      setReviewModalVisible(false);
      setVcdsText('');
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to import faults. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const toggleFaultSelection = (index: number) => {
    const updated = [...parsedFaults];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    setParsedFaults(updated);
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
          <Text style={styles.headerTitle}>{vehicle?.name || 'VCDS Faults'}</Text>
          <Text style={styles.headerSubtitle}>
            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : ''}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.importButton} onPress={() => setImportModalVisible(true)}>
            <Text style={styles.importButtonText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
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

      {/* VCDS Log Import Modal */}
      <Modal
        visible={importModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.overlayContainer}>
          <View style={styles.overlayModal}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>Import VCDS Log</Text>
              <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                <Text style={styles.overlayClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.overlayInstruction}>
              Paste your VCDS log output below:
            </Text>
            <TextInput
              style={styles.vcdsTextInput}
              multiline
              value={vcdsText}
              onChangeText={setVcdsText}
              placeholder={'01-Engine--Status: Malfunction\n1 Fault Found:\nP0300 - Active...'}
              placeholderTextColor="#555"
              textAlignVertical="top"
            />
            <View style={styles.overlayButtons}>
              <TouchableOpacity
                style={[styles.overlayBtn, styles.cancelBtn]}
                onPress={() => setImportModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.overlayBtn, styles.parseBtn, parsing && styles.btnDisabled]}
                onPress={handleParse}
                disabled={parsing}
              >
                <Text style={styles.parseBtnText}>{parsing ? 'Parsing...' : 'Parse'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review Parsed Faults Modal */}
      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.overlayContainer}>
          <View style={styles.overlayModal}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>Review Parsed Faults</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <Text style={styles.overlayClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.overlayInstruction}>
              Found {parsedFaults.length} fault{parsedFaults.length !== 1 ? 's' : ''}. Select which to import:
            </Text>
            <ScrollView style={styles.parsedList}>
              {parsedFaults.map((fault, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.parsedItem, fault.isDuplicate && styles.parsedItemDuplicate]}
                  onPress={() => !fault.isDuplicate && toggleFaultSelection(index)}
                  disabled={fault.isDuplicate}
                >
                  <View style={[styles.checkbox, fault.selected && !fault.isDuplicate && styles.checkboxSelected]}>
                    {fault.selected && !fault.isDuplicate && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.parsedItemContent}>
                    <Text style={styles.parsedFaultCode}>{fault.fault_code || 'Unknown'}</Text>
                    {fault.component && <Text style={styles.parsedComponent}>{fault.component}</Text>}
                    {fault.description && (
                      <Text style={styles.parsedDescription} numberOfLines={2}>{fault.description}</Text>
                    )}
                    {fault.isDuplicate && <Text style={styles.duplicateBadge}>Already exists — skipped</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.overlayButtons}>
              <TouchableOpacity
                style={[styles.overlayBtn, styles.cancelBtn]}
                onPress={() => { setReviewModalVisible(false); setImportModalVisible(true); }}
              >
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.overlayBtn, styles.parseBtn, importing && styles.btnDisabled]}
                onPress={handleImport}
                disabled={importing}
              >
                <Text style={styles.parseBtnText}>
                  {importing ? 'Importing...' : `Import (${parsedFaults.filter(f => f.selected && !f.isDuplicate).length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              {editingId !== null ? 'Edit Fault Code' : 'Add Fault Code'}
            </Text>
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  importButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  overlayModal: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  overlayClose: {
    fontSize: 20,
    color: '#8E8E93',
    padding: 4,
  },
  overlayInstruction: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  vcdsTextInput: {
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    minHeight: 180,
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  overlayButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  overlayBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#3A3A3C',
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  parseBtn: {
    backgroundColor: '#007AFF',
  },
  parseBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  parsedList: {
    maxHeight: 320,
    marginBottom: 8,
  },
  parsedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  parsedItemDuplicate: {
    opacity: 0.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#555',
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  parsedItemContent: {
    flex: 1,
  },
  parsedFaultCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  parsedComponent: {
    fontSize: 13,
    color: '#FF9500',
    marginTop: 2,
  },
  parsedDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  duplicateBadge: {
    fontSize: 11,
    color: '#FF9500',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

