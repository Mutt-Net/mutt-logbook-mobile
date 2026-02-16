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
import { isConnectedToHomeWifi } from '../services/wifi';
import { Card, Button, Input, Loading } from '../components/common';

const API_URL_KEY = 'api_url';
const HOME_WIFI_SSID = 'Mushroom Kingdom';
const APP_VERSION = '1.0.0';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export default function SettingsScreen() {
  const [apiUrl, setApiUrl] = useState('http://192.168.0.179:5000');
  const [homeWifiConnected, setHomeWifiConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [editingApiUrl, setEditingApiUrl] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const [savedApiUrl, lastSync, wifiConnected] = await Promise.all([
        AsyncStorage.getItem(API_URL_KEY),
        syncManager.getLastSyncTime(),
        isConnectedToHomeWifi(),
      ]);

      if (savedApiUrl) {
        setApiUrl(savedApiUrl);
      }
      setLastSyncTime(lastSync);
      setHomeWifiConnected(wifiConnected);
    } catch (error) {
      console.warn('Failed to load settings:', error);
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
    try {
      await AsyncStorage.setItem(API_URL_KEY, tempApiUrl);
      setApiUrl(tempApiUrl);
      setEditingApiUrl(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save API URL');
    }
  };

  const handleEditApiUrl = () => {
    setTempApiUrl(apiUrl);
    setEditingApiUrl(true);
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
                {HOME_WIFI_SSID}
              </Text>
            </View>
            <View style={[styles.statusBadge, homeWifiConnected ? styles.statusConnected : styles.statusDisconnected]}>
              <Text style={styles.statusText}>
                {homeWifiConnected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
          </View>
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
