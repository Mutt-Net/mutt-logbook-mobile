import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncManager } from '../services/sync';
import { isConnectedToHomeWifi, getHomeWifiSSID, setHomeWifiSSID, getHomeWifiPassword, setHomeWifiPassword, isApiReachable } from '../services/wifi';
import { configService } from '../services/config';
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

  const loadSettings = useCallback(async () => {
    try {
      const [savedApiUrl, lastSync, wifiConnected, savedWifiSSID, apiUp] = await Promise.all([
        configService.getApiUrl(),
        syncManager.getLastSyncTime(),
        isConnectedToHomeWifi(),
        getHomeWifiSSID(),
        isApiReachable(),
      ]);

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
      Alert.alert('Sync Error', 'An unexpected error occurred during sync');
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
});
