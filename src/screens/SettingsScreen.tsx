import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Share,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncManager } from '../services/sync';
import { isConnectedToHomeWifi, getHomeWifiSSID, setHomeWifiSSID, getHomeWifiPassword, setHomeWifiPassword, isApiReachable } from '../services/wifi';
import { configService } from '../services/config';
import {
  VehicleService,
  MaintenanceService,
  ModService,
  CostService,
  FuelEntryService,
  NoteService,
  VCDSFaultService,
  ReminderService,
} from '../services/database';
import { Vehicle } from '../types';
import { Card, Button, Input, Loading } from '../components/common';
import { logger } from '../lib/logger';

const APP_VERSION = '1.2.1';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export default function SettingsScreen() {
  const [apiUrl, setApiUrl] = useState('');
  const [apiReachable, setApiReachable] = useState(false);
  const [homeWifiConnected, setHomeWifiConnected] = useState(false);
  const [homeWifiSSID, setHomeWifiSSIDState] = useState('Mushroom Kingdom');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [editingApiUrl, setEditingApiUrl] = useState(false);
  const [editingWifiSSID, setEditingWifiSSID] = useState(false);
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pendingAction, setPendingAction] = useState<'apiUrl' | 'wifiSSID' | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [tempApiUrl, setTempApiUrl] = useState('');
  const [tempWifiSSID, setTempWifiSSID] = useState('');
  const [tempWifiPassword, setTempWifiPassword] = useState('');
  const [loading, setLoading] = useState(true);

  // Sync error state
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const [syncErrorTimestamp, setSyncErrorTimestamp] = useState<string | null>(null);

  // Export/import state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const [savedApiUrl, lastSync, wifiConnected, savedWifiSSID, apiUp, errorInfo] = await Promise.all([
        configService.getApiUrl(),
        syncManager.getLastSyncTime(),
        isConnectedToHomeWifi(),
        getHomeWifiSSID(),
        isApiReachable(),
        syncManager.getSyncErrorInfo(),
      ]);
      setSyncErrors(errorInfo.errors);
      setSyncErrorTimestamp(errorInfo.timestamp);

      if (savedApiUrl) {
        setApiUrl(savedApiUrl);
      }
      setLastSyncTime(lastSync);
      setHomeWifiConnected(wifiConnected);
      setHomeWifiSSIDState(savedWifiSSID);
      setApiReachable(apiUp);
    } catch (error) {
      logger.warn('Failed to load settings', { error });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      const result = await syncManager.syncAll();
      if (result.success) {
        setSyncStatus('success');
        setLastSyncTime(result.timestamp);
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        setSyncStatus('error');
        Alert.alert('Sync Failed', result.errors.join('\n'));
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    } catch (error) {
      setSyncStatus('error');
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Sync Error', `Sync failed: ${errMsg}. Check your API URL and network connection.`);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleSaveApiUrl = async () => {
    setPendingAction('apiUrl');
    setVerifyingPin(true);
  };

  const handleSaveApiUrlConfirmed = async () => {
    try {
      await configService.setApiUrl(tempApiUrl);
      setApiUrl(tempApiUrl);
      setEditingApiUrl(false);
      setVerifyingPin(false);
      setPendingAction(null);
      setPinInput('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save API URL');
    }
  };

  const handleEditApiUrl = () => {
    setTempApiUrl(apiUrl);
    setEditingApiUrl(true);
  };

  const handleEditWifiSSID = async () => {
    const currentPassword = await getHomeWifiPassword();
    setTempWifiSSID(homeWifiSSID);
    setTempWifiPassword(currentPassword);
    setEditingWifiSSID(true);
  };

  const handleSaveWifiSSID = async () => {
    setPendingAction('wifiSSID');
    setVerifyingPin(true);
  };

  const handleSaveWifiSSIDConfirmed = async () => {
    try {
      await setHomeWifiSSID(tempWifiSSID);
      await setHomeWifiPassword(tempWifiPassword);
      setHomeWifiSSIDState(tempWifiSSID);
      setEditingWifiSSID(false);
      setVerifyingPin(false);
      setPendingAction(null);
      setPinInput('');
      setTempWifiPassword('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save WiFi settings');
    }
  };

  const handleVerifyPin = async () => {
    const isValid = await configService.verifyPin(pinInput);
    if (!isValid) {
      Alert.alert('Access Denied', 'Incorrect PIN');
      setPinInput('');
      return;
    }

    if (pendingAction === 'apiUrl') {
      await handleSaveApiUrlConfirmed();
    } else if (pendingAction === 'wifiSSID') {
      await handleSaveWifiSSIDConfirmed();
    }
  };

  const handleCancelPin = () => {
    setVerifyingPin(false);
    setPendingAction(null);
    setPinInput('');
  };

  const handleClearSyncErrors = async () => {
    await syncManager.clearSyncErrors();
    setSyncErrors([]);
    setSyncErrorTimestamp(null);
  };

  const handleExportVehicle = async (vehicle: Vehicle) => {
    setExporting(true);
    setExportModalVisible(false);
    try {
      const [maintenance, mods, costs, fuel, notes, vcds, reminders] = await Promise.all([
        MaintenanceService.getByVehicle(vehicle.id),
        ModService.getByVehicle(vehicle.id),
        CostService.getByVehicle(vehicle.id),
        FuelEntryService.getByVehicle(vehicle.id),
        NoteService.getByVehicle(vehicle.id),
        VCDSFaultService.getByVehicle(vehicle.id),
        ReminderService.getByVehicle(vehicle.id),
      ]);
      const exportData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        vehicle,
        maintenance,
        mods,
        costs,
        fuel_entries: fuel,
        notes,
        vcds_faults: vcds,
        reminders,
      };
      await Share.share({
        title: `${vehicle.name} - Logbook Export`,
        message: JSON.stringify(exportData, null, 2),
      });
    } catch (error) {
      logger.error('Export failed', { error });
      Alert.alert('Export Failed', 'Could not export vehicle data.');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenExport = async () => {
    try {
      const allVehicles = await VehicleService.getAll();
      setVehicles(allVehicles);
      setExportModalVisible(true);
    } catch {
      Alert.alert('Error', 'Could not load vehicles');
    }
  };

  const handleImport = async () => {
    if (!importJson.trim()) {
      Alert.alert('Error', 'Paste vehicle export JSON first');
      return;
    }
    setImporting(true);
    try {
      const data = JSON.parse(importJson);
      if (!data.vehicle || !data.version) {
        Alert.alert('Invalid Format', 'This does not appear to be a valid vehicle export.');
        return;
      }
      const { vehicle: v, maintenance = [], mods = [], costs = [], fuel_entries = [], notes = [], vcds_faults = [], reminders = [] } = data;
      const newVehicleId = await VehicleService.create({
        name: `${v.name} (Imported)`,
        make: v.make,
        model: v.model,
        year: v.year,
        vin: v.vin,
        color: v.color,
        mileage: v.mileage,
        license_plate: v.license_plate,
        notes: v.notes,
        synced: 0,
        remote_id: null,
        updated_at: new Date().toISOString(),
      });
      let count = 1;
      for (const r of maintenance) {
        await MaintenanceService.create({ ...r, vehicle_id: newVehicleId, synced: 0, remote_id: null });
        count++;
      }
      for (const r of mods) {
        await ModService.create({ ...r, vehicle_id: newVehicleId, synced: 0, remote_id: null });
        count++;
      }
      for (const r of costs) {
        await CostService.create({ ...r, vehicle_id: newVehicleId, synced: 0, remote_id: null });
        count++;
      }
      for (const r of fuel_entries) {
        await FuelEntryService.create({ ...r, vehicle_id: newVehicleId, synced: 0, remote_id: null });
        count++;
      }
      for (const r of notes) {
        await NoteService.create({ ...r, vehicle_id: newVehicleId, synced: 0, remote_id: null });
        count++;
      }
      for (const r of vcds_faults) {
        await VCDSFaultService.create({ ...r, vehicle_id: newVehicleId, synced: 0, remote_id: null });
        count++;
      }
      for (const r of reminders) {
        await ReminderService.create({ ...r, vehicle_id: newVehicleId, synced: 0, remote_id: null });
        count++;
      }
      Alert.alert('Import Complete', `Imported ${v.name} with ${count} records.`);
      setImportModalVisible(false);
      setImportJson('');
    } catch (error) {
      logger.error('Import failed', { error });
      Alert.alert('Import Failed', 'Invalid JSON or import error. Check the format and try again.');
    } finally {
      setImporting(false);
    }
  };

  const formatLastSync = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSyncStatusColor = (): string => {
    switch (syncStatus) {
      case 'syncing':
        return '#007AFF';
      case 'success':
        return '#34C759';
      case 'error':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getSyncStatusText = (): string => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'success':
        return 'Sync Complete';
      case 'error':
        return 'Sync Failed';
      default:
        return 'Not Synced';
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>CONNECTION</Text>
        
        <Card>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>API Server</Text>
              <Text style={styles.settingValue}>{apiUrl}</Text>
            </View>
            <TouchableOpacity onPress={handleEditApiUrl}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Home WiFi</Text>
              <Text style={styles.settingValue}>
                {homeWifiSSID}
              </Text>
            </View>
            <TouchableOpacity onPress={handleEditWifiSSID}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>WiFi Status</Text>
            </View>
            <View style={[styles.statusBadge, homeWifiConnected ? styles.statusConnected : styles.statusDisconnected]}>
              <Text style={styles.statusText}>
                {homeWifiConnected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Server Status</Text>
            </View>
            <View style={[styles.statusBadge, apiReachable ? styles.statusConnected : styles.statusDisconnected]}>
              <Text style={styles.statusText}>
                {apiReachable ? 'Reachable' : 'Not Reachable'}
              </Text>
            </View>
          </View>

          {!homeWifiConnected && homeWifiSSID && (
            <>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <Text style={styles.wifiGuidance}>
                  Make sure your device is connected to "{homeWifiSSID}" for auto-sync
                </Text>
              </View>
            </>
          )}
        </Card>

        <Text style={styles.sectionTitle}>SYNC</Text>

        <Card>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sync Status</Text>
              <Text style={[styles.settingValue, { color: getSyncStatusColor() }]}>
                {getSyncStatusText()}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Last Sync</Text>
              <Text style={styles.settingValue}>
                {formatLastSync(lastSyncTime)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.syncButton, syncStatus === 'syncing' && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={syncStatus === 'syncing'}
          >
            <Text style={styles.syncButtonText}>
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
        </Card>

        {syncErrors.length > 0 && (
          <View style={styles.syncErrorBanner}>
            <View style={styles.syncErrorHeader}>
              <Text style={styles.syncErrorTitle}>Sync Errors</Text>
              <TouchableOpacity onPress={handleClearSyncErrors}>
                <Text style={styles.syncErrorClear}>Clear</Text>
              </TouchableOpacity>
            </View>
            {syncErrorTimestamp && (
              <Text style={styles.syncErrorTime}>
                Last occurred: {formatLastSync(syncErrorTimestamp)}
              </Text>
            )}
            {syncErrors.map((err, i) => (
              <Text key={i} style={styles.syncErrorItem}>• {err}</Text>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>

        <Card>
          <TouchableOpacity style={styles.settingRow} onPress={handleOpenExport} disabled={exporting}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Export Vehicle Data</Text>
              <Text style={styles.settingValue}>Share complete vehicle history as JSON</Text>
            </View>
            <Text style={styles.chevron}>{exporting ? '...' : '›'}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} onPress={() => setImportModalVisible(true)}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Import Vehicle Data</Text>
              <Text style={styles.settingValue}>Restore from exported JSON</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Card>

        <Text style={styles.sectionTitle}>ABOUT</Text>

        <Card>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>App Version</Text>
              <Text style={styles.settingValue}>{APP_VERSION}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Database</Text>
              <Text style={styles.settingValue}>SQLite (Local)</Text>
            </View>
          </View>
        </Card>

        <View style={styles.footer} />
      </ScrollView>

      {/* Export Vehicle Picker Modal */}
      <Modal
        visible={exportModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.overlayContainer}>
          <View style={styles.overlayModal}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>Select Vehicle to Export</Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <Text style={styles.overlayClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {vehicles.length === 0 ? (
              <Text style={styles.overlayEmpty}>No vehicles found</Text>
            ) : (
              vehicles.map(v => (
                <TouchableOpacity
                  key={v.id}
                  style={styles.vehicleRow}
                  onPress={() => handleExportVehicle(v)}
                >
                  <Text style={styles.vehicleName}>{v.name}</Text>
                  <Text style={styles.vehicleDetail}>{v.year} {v.make} {v.model}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </Modal>

      {/* Import Modal */}
      <Modal
        visible={importModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.overlayContainer}>
          <View style={styles.overlayModal}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>Import Vehicle Data</Text>
              <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                <Text style={styles.overlayClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.overlayInstruction}>
              Paste the exported vehicle JSON below:
            </Text>
            <TextInput
              style={styles.importTextInput}
              multiline
              value={importJson}
              onChangeText={setImportJson}
              placeholder='{"version":"1.0","vehicle":{...}}'
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
                style={[styles.overlayBtn, styles.importActionBtn, importing && styles.btnDisabled]}
                onPress={handleImport}
                disabled={importing}
              >
                <Text style={styles.importActionBtnText}>{importing ? 'Importing...' : 'Import'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editingApiUrl}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingApiUrl(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditingApiUrl(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>API Server</Text>
            <TouchableOpacity onPress={handleSaveApiUrl}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Input
              label="API URL"
              value={tempApiUrl}
              onChangeText={setTempApiUrl}
              placeholder="http://192.168.0.179:5000"
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={styles.modalHint}>
              Enter the URL of your Mutt Logbook API server
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editingWifiSSID}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setEditingWifiSSID(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setEditingWifiSSID(false);
            }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Home WiFi</Text>
            <TouchableOpacity onPress={handleSaveWifiSSID}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Input
              label="WiFi Network Name (SSID)"
              value={tempWifiSSID}
              onChangeText={setTempWifiSSID}
              placeholder="Enter your WiFi network name"
              autoCapitalize="none"
            />
            <Input
              label="WiFi Password"
              value={tempWifiPassword}
              onChangeText={setTempWifiPassword}
              placeholder="WiFi password"
              secureTextEntry
              autoCapitalize="none"
              style={{ marginTop: 16 }}
            />
            <Text style={styles.modalHint}>
              PIN required to save changes
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={verifyingPin}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancelPin}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancelPin}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Verify PIN</Text>
            <TouchableOpacity onPress={handleVerifyPin}>
              <Text style={styles.modalSave}>Confirm</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Input
              label="Enter 4-Digit PIN"
              value={pinInput}
              onChangeText={setPinInput}
              placeholder="Enter PIN"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.modalHint}>
              Enter your PIN to confirm changes
            </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#8E8E93',
  },
  editButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginVertical: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusConnected: {
    backgroundColor: '#34C759',
  },
  statusDisconnected: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  wifiGuidance: {
    fontSize: 13,
    color: '#FF9500',
    fontStyle: 'italic',
  },
  syncButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    height: 40,
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalHint: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  chevron: {
    fontSize: 20,
    color: '#8E8E93',
    marginLeft: 8,
  },
  syncErrorBanner: {
    backgroundColor: '#3A1A1A',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  syncErrorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  syncErrorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF3B30',
  },
  syncErrorClear: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  syncErrorTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  syncErrorItem: {
    fontSize: 13,
    color: '#FF9F9F',
    marginTop: 4,
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
    maxHeight: '75%',
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  overlayEmpty: {
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 20,
  },
  vehicleRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  vehicleDetail: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  importTextInput: {
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    minHeight: 160,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  overlayButtons: {
    flexDirection: 'row',
    gap: 12,
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
  importActionBtn: {
    backgroundColor: '#30D158',
  },
  importActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
