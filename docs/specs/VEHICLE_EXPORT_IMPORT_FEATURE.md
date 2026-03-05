# Vehicle Export/Import Feature Integration

## Overview

**Task:** P2-04 - Add vehicle export/import functionality UI
**Status:** Ready for integration
**Priority:** P2 (Enhanced Features)

---

## Feature Description

Allow users to export complete vehicle data (maintenance, mods, costs, fuel, notes, VCDS faults, photos) to a portable format and import it back. This is useful for:

- **Backing up** vehicle data before major changes
- **Transferring** data between devices
- **Exporting for resale** - provide comprehensive vehicle history to buyers
- **Archiving** vehicles that are no longer owned

---

## API Endpoints

The backend provides two endpoints:

### GET /api/vehicles/{id}/export

Exports all data for a vehicle in a portable JSON format.

**Response:**
```json
{
  "vehicle": { ... },
  "maintenance": [...],
  "mods": [...],
  "costs": [...],
  "fuel_entries": [...],
  "notes": [...],
  "vcds_faults": [...],
  "reminders": [...],
  "vehicle_photos": [...],
  "exported_at": "2026-02-24T10:30:00Z",
  "version": "1.0"
}
```

### POST /api/vehicles/import

Imports vehicle data from an exported JSON file.

**Request:**
```json
{
  "data": { ...exported vehicle data... },
  "merge_strategy": "skip_duplicates" | "overwrite" | "merge"
}
```

**Response:**
```json
{
  "imported": {
    "vehicle": 1,
    "maintenance": 15,
    "mods": 8,
    "costs": 23,
    "fuel_entries": 42,
    "notes": 5,
    "vcds_faults": 3,
    "reminders": 2,
    "vehicle_photos": 12
  },
  "skipped": {
    "maintenance": 2,
    "costs": 1
  },
  "errors": []
}
```

---

## UI Design

### SettingsScreen Enhancement

Add "Export/Import" section in SettingsScreen:

```
┌─────────────────────────────────────────┐
│  Settings                               │
├─────────────────────────────────────────┤
│  API Configuration                      │
│  - API URL                              │
│  - WiFi SSID/Password                   │
│  - Sync Now                             │
├─────────────────────────────────────────┤
│  Data Management                        │
│  - Export Vehicle Data           [→]    │
│  - Import Vehicle Data           [→]    │
│  - Clear Local Cache                    │
└─────────────────────────────────────────┘
```

### Export Vehicle Screen

When user taps "Export Vehicle Data":

```
┌─────────────────────────────────────────┐
│  Export Vehicle Data                [X] │
├─────────────────────────────────────────┤
│                                         │
│  Select vehicle to export:              │
│                                         │
│  ○ 2020 Volkswagen GTI                  │
│  ○ 2018 Audi S3                         │
│  ○ 2015 Volkswagen Golf TDI             │
│                                         │
│  Include in export:                     │
│  ☑ Maintenance Records                  │
│  ☑ Modifications                        │
│  ☑ Cost Tracking                        │
│  ☑ Fuel Entries                         │
│  ☑ Notes                                │
│  ☑ VCDS Faults                          │
│  ☑ Reminders                            │
│  ☑ Vehicle Photos                       │
│                                         │
│  Export format:                         │
│  ○ JSON (recommended)                   │
│  ○ PDF (for resale)                     │
│                                         │
│  ┌─────────────────┐ ┌────────────────┐ │
│  │     Cancel      │ │     Export     │ │
│  └─────────────────┘ └────────────────┘ │
└─────────────────────────────────────────┘
```

### Export Progress

```
┌─────────────────────────────────────────┐
│  Exporting...                           │
├─────────────────────────────────────────┤
│                                         │
│  Preparing vehicle data...              │
│                                         │
│  ████████████░░░░░░░░░ 65%              │
│                                         │
│  Exported:                              │
│  ✓ Maintenance (15 records)             │
│  ✓ Mods (8 records)                     │
│  ✓ Costs (23 records)                   │
│  ⏳ Fuel Entries (processing...)        │
│  ○ Notes                                │
│  ○ VCDS Faults                          │
│  ○ Reminders                            │
│  ○ Photos                               │
│                                         │
└─────────────────────────────────────────┘
```

### Export Success

```
┌─────────────────────────────────────────┐
│  Export Complete                    [X] │
├─────────────────────────────────────────┤
│                                         │
│  ✓ Export successful!                   │
│                                         │
│  File: 2020_VW_GTI_export_20260224.json │
│  Size: 2.4 MB                           │
│                                         │
│  Included:                              │
│  - 15 maintenance records               │
│  - 8 modifications                      │
│  - 23 cost entries                      │
│  - 42 fuel entries                      │
│  - 5 notes                              │
│  - 3 VCDS faults                        │
│  - 2 reminders                          │
│  - 12 photos                            │
│                                         │
│  ┌─────────────────┐ ┌────────────────┐ │
│  │      Done       │ │     Share      │ │
│  └─────────────────┘ └────────────────┘ │
└─────────────────────────────────────────┘
```

### Import Vehicle Screen

When user taps "Import Vehicle Data":

```
┌─────────────────────────────────────────┐
│  Import Vehicle Data                [X] │
├─────────────────────────────────────────┤
│                                         │
│  Select export file:                    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📄 2020_VW_GTI_export_...json  │    │
│  │     Feb 24, 2026 • 2.4 MB       │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Or select from device:                 │
│  ┌─────────────────────────────────┐    │
│  │      Browse Files...            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Import strategy:                       │
│  ○ Skip duplicates (recommended)        │
│  ○ Overwrite existing                   │
│  ○ Merge (keep both)                    │
│                                         │
│  ┌─────────────────┐ ┌────────────────┐ │
│  │     Cancel      │ │     Import     │ │
│  └─────────────────┘ └────────────────┘ │
└─────────────────────────────────────────┘
```

### Import Review

After selecting file, show preview:

```
┌─────────────────────────────────────────┐
│  Review Import                      [X] │
├─────────────────────────────────────────┤
│                                         │
│  File: 2020_VW_GTI_export_20260224.json │
│                                         │
│  Vehicle: 2020 Volkswagen GTI           │
│  VIN: WVWZZZ1KZAW123456                 │
│  Exported: Feb 24, 2026                 │
│                                         │
│  Data to import:                        │
│  - 15 maintenance records               │
│  - 8 modifications                      │
│  - 23 cost entries                      │
│  - 42 fuel entries                      │
│  - 5 notes                              │
│  - 3 VCDS faults                        │
│  - 2 reminders                          │
│  - 12 photos                            │
│                                         │
│  Strategy: Skip duplicates              │
│  Estimated new records: 89              │
│  Estimated skipped: 0                   │
│                                         │
│  ┌─────────────────┐ ┌────────────────┐ │
│  │     Back        │ │    Import      │ │
│  └─────────────────┘ └────────────────┘ │
└─────────────────────────────────────────┘
```

### Import Progress

```
┌─────────────────────────────────────────┐
│  Importing...                           │
├─────────────────────────────────────────┤
│                                         │
│  Importing vehicle data...              │
│                                         │
│  ████████████████░░░░ 80%               │
│                                         │
│  Imported:                              │
│  ✓ Vehicle (1 record)                   │
│  ✓ Maintenance (15 records)             │
│  ✓ Mods (8 records)                     │
│  ✓ Costs (23 records)                   │
│  ⏳ Fuel Entries (processing...)        │
│  ○ Notes                                │
│  ○ VCDS Faults                          │
│  ○ Reminders                            │
│  ○ Photos                               │
│                                         │
└─────────────────────────────────────────┘
```

### Import Success

```
┌─────────────────────────────────────────┐
│  Import Complete                    [X] │
├─────────────────────────────────────────┤
│                                         │
│  ✓ Import successful!                   │
│                                         │
│  Imported:                              │
│  - 1 vehicle                            │
│  - 15 maintenance records               │
│  - 8 modifications                      │
│  - 23 cost entries                      │
│  - 42 fuel entries                      │
│  - 5 notes                              │
│  - 3 VCDS faults                        │
│  - 2 reminders                          │
│  - 12 photos                            │
│                                         │
│  Skipped (duplicates):                  │
│  - 0 records                            │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │            Done                 │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## Implementation Plan

### Step 1: Add API Methods

**File:** `src/services/api.ts`

```typescript
interface VehicleExport {
  vehicle: Vehicle;
  maintenance: Maintenance[];
  mods: Mod[];
  costs: Cost[];
  fuel_entries: FuelEntry[];
  notes: Note[];
  vcds_faults: VCDSFault[];
  reminders: Reminder[];
  vehicle_photos: VehiclePhoto[];
  exported_at: string;
  version: string;
}

interface VehicleImportRequest {
  data: VehicleExport;
  merge_strategy: 'skip_duplicates' | 'overwrite' | 'merge';
}

interface VehicleImportResponse {
  imported: {
    vehicle: number;
    maintenance: number;
    mods: number;
    costs: number;
    fuel_entries: number;
    notes: number;
    vcds_faults: number;
    reminders: number;
    vehicle_photos: number;
  };
  skipped: {
    [key: string]: number;
  };
  errors: string[];
}

class ApiService {
  // ... existing methods

  /**
   * Export all data for a vehicle
   */
  async exportVehicle(vehicleId: number): Promise<VehicleExport> {
    const response = await this.instance.get(`/api/vehicles/${vehicleId}/export`);
    return response.data;
  }

  /**
   * Import vehicle data from export
   */
  async importVehicle(
    data: VehicleExport,
    mergeStrategy: 'skip_duplicates' | 'overwrite' | 'merge' = 'skip_duplicates'
  ): Promise<VehicleImportResponse> {
    const response = await this.instance.post('/api/vehicles/import', {
      data,
      merge_strategy: mergeStrategy,
    });
    return response.data;
  }

  /**
   * Export vehicle as PDF (for resale)
   */
  async exportVehiclePDF(vehicleId: number): Promise<Blob> {
    const response = await this.instance.get(`/api/vehicles/${vehicleId}/export/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  }
}
```

---

### Step 2: Create Export/Import Service

**File:** `src/lib/vehicleExportImport.ts`

```typescript
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { VehicleExport, VehicleImportResponse } from '../types';
import { api } from '../services/api';
import { logger } from './logger';

export interface ExportOptions {
  includeMaintenance: boolean;
  includeMods: boolean;
  includeCosts: boolean;
  includeFuel: boolean;
  includeNotes: boolean;
  includeVCDS: boolean;
  includeReminders: boolean;
  includePhotos: boolean;
}

export interface ImportStrategy {
  type: 'skip_duplicates' | 'overwrite' | 'merge';
}

export class VehicleExportImportService {
  /**
   * Export vehicle data to JSON file
   */
  static async exportToFile(
    vehicleId: number,
    vehicleName: string,
    options: ExportOptions
  ): Promise<{ filePath: string; stats: any }> {
    try {
      // Fetch export from API
      const exportData = await api.exportVehicle(vehicleId);

      // Filter based on options
      const filteredData = {
        vehicle: exportData.vehicle,
        exported_at: exportData.exported_at,
        version: exportData.version,
        ...(options.includeMaintenance && { maintenance: exportData.maintenance }),
        ...(options.includeMods && { mods: exportData.mods }),
        ...(options.includeCosts && { costs: exportData.costs }),
        ...(options.includeFuel && { fuel_entries: exportData.fuel_entries }),
        ...(options.includeNotes && { notes: exportData.notes }),
        ...(options.includeVCDS && { vcds_faults: exportData.vcds_faults }),
        ...(options.includeReminders && { reminders: exportData.reminders }),
        ...(options.includePhotos && { vehicle_photos: exportData.vehicle_photos }),
      };

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const safeName = vehicleName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeName}_export_${timestamp}.json`;

      // Write to file
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(filteredData, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      logger.info(`Exported vehicle data to ${fileUri}`);

      return {
        filePath: fileUri,
        stats: this.calculateStats(filteredData),
      };
    } catch (error) {
      logger.error('Export failed:', error);
      throw error;
    }
  }

  /**
   * Share exported file
   */
  static async shareFile(filePath: string): Promise<void> {
    try {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Share Vehicle Export',
        UTI: 'public.json',
      });
      logger.info(`Shared export file: ${filePath}`);
    } catch (error) {
      logger.error('Share failed:', error);
      throw error;
    }
  }

  /**
   * Import vehicle data from JSON file
   */
  static async importFromFile(
    filePath: string,
    strategy: ImportStrategy
  ): Promise<VehicleImportResponse> {
    try {
      // Read file
      const content = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const exportData: VehicleExport = JSON.parse(content);

      // Import via API
      const result = await api.importVehicle(exportData, strategy.type);

      logger.info(`Imported vehicle data: ${JSON.stringify(result.imported)}`);

      return result;
    } catch (error) {
      logger.error('Import failed:', error);
      throw error;
    }
  }

  /**
   * Pick file from device
   */
  static async pickFile(): Promise<string | null> {
    try {
      // Note: expo-document-picker needed for file picking
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      logger.error('File pick failed:', error);
      return null;
    }
  }

  /**
   * Calculate export statistics
   */
  static calculateStats(data: Partial<VehicleExport>): {
    totalRecords: number;
    byType: { [key: string]: number };
  } {
    const byType: { [key: string]: number } = {};

    if (data.maintenance) byType.maintenance = data.maintenance.length;
    if (data.mods) byType.mods = data.mods.length;
    if (data.costs) byType.costs = data.costs.length;
    if (data.fuel_entries) byType.fuel = data.fuel_entries.length;
    if (data.notes) byType.notes = data.notes.length;
    if (data.vcds_faults) byType.vcds = data.vcds_faults.length;
    if (data.reminders) byType.reminders = data.reminders.length;
    if (data.vehicle_photos) byType.photos = data.vehicle_photos.length;

    const totalRecords = Object.values(byType).reduce((sum, count) => sum + count, 0);

    return { totalRecords, byType };
  }

  /**
   * Preview import data
   */
  static async previewImport(filePath: string): Promise<{
    vehicle: any;
    stats: { totalRecords: number; byType: { [key: string]: number } };
    exportedAt: string;
  }> {
    try {
      const content = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const data: VehicleExport = JSON.parse(content);

      return {
        vehicle: data.vehicle,
        stats: this.calculateStats(data),
        exportedAt: data.exported_at,
      };
    } catch (error) {
      logger.error('Preview failed:', error);
      throw error;
    }
  }
}
```

---

### Step 3: Create ExportImportScreen

**File:** `src/screens/ExportImportScreen.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  CheckBox,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Card, Button, EmptyState } from '../components/common';
import { Vehicle } from '../types';
import { VehicleService } from '../services/database';
import {
  VehicleExportImportService,
  ExportOptions,
  ImportStrategy,
} from '../lib/vehicleExportImport';
import { logger } from '../lib/logger';

type Mode = 'export' | 'import';

interface ExportParams {
  vehicleId?: number;
}

export function ExportImportScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as ExportParams | undefined;

  const [mode, setMode] = useState<Mode | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Export state
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeMaintenance: true,
    includeMods: true,
    includeCosts: true,
    includeFuel: true,
    includeNotes: true,
    includeVCDS: true,
    includeReminders: true,
    includePhotos: true,
  });
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    current: string;
    percent: number;
  }>({ current: '', percent: 0 });
  const [exportResult, setExportResult] = useState<{
    filePath: string;
    stats: any;
  } | null>(null);

  // Import state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFile, setImportFile] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importStrategy, setImportStrategy] = useState<ImportStrategy['type']>(
    'skip_duplicates'
  );
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: string;
    percent: number;
  }>({ current: '', percent: 0 });
  const [importResult, setImportResult] = useState<any | null>(null);

  React.useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    try {
      const data = await VehicleService.getAll();
      setVehicles(data);
      if (params?.vehicleId) {
        const vehicle = data.find(v => v.id === params.vehicleId);
        if (vehicle) {
          setSelectedVehicle(vehicle);
          setMode('export');
          setExportModalVisible(true);
        }
      }
    } catch (error) {
      logger.error('Failed to load vehicles:', error);
    }
  }

  async function handleExport() {
    if (!selectedVehicle) {
      Alert.alert('Error', 'Please select a vehicle');
      return;
    }

    setExporting(true);
    setExportProgress({ current: 'Preparing data...', percent: 10 });

    try {
      const steps = [
        'Fetching vehicle data',
        'Processing maintenance records',
        'Processing modifications',
        'Processing costs',
        'Processing fuel entries',
        'Processing notes',
        'Processing VCDS faults',
        'Processing reminders',
        'Processing photos',
        'Writing file',
      ];

      const result = await VehicleExportImportService.exportToFile(
        selectedVehicle.id,
        selectedVehicle.name,
        exportOptions
      );

      setExportProgress({ current: 'Complete!', percent: 100 });
      setExportResult(result);

      Alert.alert(
        'Export Complete',
        `Successfully exported ${result.stats.totalRecords} records.`,
        [
          { text: 'Done', onPress: () => setExportModalVisible(false) },
          { text: 'Share', onPress: () => VehicleExportImportService.shareFile(result.filePath) },
        ]
      );
    } catch (error: any) {
      Alert.alert('Export Error', error.message || 'Failed to export vehicle data');
    } finally {
      setExporting(false);
    }
  }

  async function handlePickImportFile() {
    try {
      const filePath = await VehicleExportImportService.pickFile();
      if (filePath) {
        setImportFile(filePath);
        const preview = await VehicleExportImportService.previewImport(filePath);
        setImportPreview(preview);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to read file');
    }
  }

  async function handleImport() {
    if (!importFile) {
      Alert.alert('Error', 'Please select a file');
      return;
    }

    setImporting(true);
    setImportProgress({ current: 'Reading file...', percent: 10 });

    try {
      const result = await VehicleExportImportService.importFromFile(
        importFile,
        { type: importStrategy }
      );

      setImportProgress({ current: 'Complete!', percent: 100 });
      setImportResult(result);

      const totalImported = Object.values(result.imported).reduce(
        (sum, count) => sum + count,
        0
      );
      const totalSkipped = Object.values(result.skipped || {}).reduce(
        (sum, count) => sum + count,
        0
      );

      Alert.alert(
        'Import Complete',
        `Imported ${totalImported} records.${totalSkipped > 0 ? ` Skipped ${totalSkipped} duplicates.` : ''}`,
        [
          {
            text: 'Done',
            onPress: () => {
              setImportModalVisible(false);
              setImportFile(null);
              setImportPreview(null);
              setImportResult(null);
              loadVehicles();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Import Error', error.message || 'Failed to import data');
    } finally {
      setImporting(false);
    }
  }

  function toggleExportOption(key: keyof ExportOptions) {
    setExportOptions(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function renderModeSelection() {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Export/Import</Text>

        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={[styles.modeButton, styles.exportButton]}
            onPress={() => setMode('export')}
          >
            <Text style={styles.modeButtonText}>Export Vehicle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, styles.importButton]}
            onPress={() => setMode('import')}
          >
            <Text style={styles.modeButtonText}>Import Data</Text>
          </TouchableOpacity>
        </View>

        {vehicles.length > 0 && (
          <View style={styles.quickExport}>
            <Text style={styles.sectionTitle}>Quick Export</Text>
            {vehicles.map(vehicle => (
              <TouchableOpacity
                key={vehicle.id}
                style={styles.vehicleItem}
                onPress={() => {
                  setSelectedVehicle(vehicle);
                  setMode('export');
                  setExportModalVisible(true);
                }}
              >
                <Text style={styles.vehicleName}>{vehicle.name}</Text>
                <Text style={styles.exportArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!mode ? (
        renderModeSelection()
      ) : mode === 'export' ? (
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setMode(null)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Export Vehicle</Text>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.label}>Select Vehicle</Text>
            {vehicles.map(vehicle => (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.vehicleOption,
                  selectedVehicle?.id === vehicle.id && styles.vehicleOptionSelected,
                ]}
                onPress={() => setSelectedVehicle(vehicle)}
              >
                <Text
                  style={[
                    styles.vehicleOptionText,
                    selectedVehicle?.id === vehicle.id && styles.vehicleOptionTextSelected,
                  ]}
                >
                  {vehicle.name}
                </Text>
                {selectedVehicle?.id === vehicle.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionTitle}>Include in Export</Text>
            <View style={styles.options}>
              <View style={styles.option}>
                <CheckBox
                  value={exportOptions.includeMaintenance}
                  onValueChange={() => toggleExportOption('includeMaintenance')}
                />
                <Text style={styles.optionLabel}>Maintenance Records</Text>
              </View>
              <View style={styles.option}>
                <CheckBox
                  value={exportOptions.includeMods}
                  onValueChange={() => toggleExportOption('includeMods')}
                />
                <Text style={styles.optionLabel}>Modifications</Text>
              </View>
              <View style={styles.option}>
                <CheckBox
                  value={exportOptions.includeCosts}
                  onValueChange={() => toggleExportOption('includeCosts')}
                />
                <Text style={styles.optionLabel}>Cost Tracking</Text>
              </View>
              <View style={styles.option}>
                <CheckBox
                  value={exportOptions.includeFuel}
                  onValueChange={() => toggleExportOption('includeFuel')}
                />
                <Text style={styles.optionLabel}>Fuel Entries</Text>
              </View>
              <View style={styles.option}>
                <CheckBox
                  value={exportOptions.includeNotes}
                  onValueChange={() => toggleExportOption('includeNotes')}
                />
                <Text style={styles.optionLabel}>Notes</Text>
              </View>
              <View style={styles.option}>
                <CheckBox
                  value={exportOptions.includeVCDS}
                  onValueChange={() => toggleExportOption('includeVCDS')}
                />
                <Text style={styles.optionLabel}>VCDS Faults</Text>
              </View>
              <View style={styles.option}>
                <CheckBox
                  value={exportOptions.includeReminders}
                  onValueChange={() => toggleExportOption('includeReminders')}
                />
                <Text style={styles.optionLabel}>Reminders</Text>
              </View>
              <View style={styles.option}>
                <CheckBox
                  value={exportOptions.includePhotos}
                  onValueChange={() => toggleExportOption('includePhotos')}
                />
                <Text style={styles.optionLabel}>Vehicle Photos</Text>
              </View>
            </View>

            <Button
              title="Export"
              onPress={handleExport}
              disabled={!selectedVehicle || exporting}
              loading={exporting}
            />
          </ScrollView>
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setMode(null)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Import Data</Text>
          </View>

          <ScrollView style={styles.content}>
            {!importFile ? (
              <TouchableOpacity style={styles.filePicker} onPress={handlePickImportFile}>
                <Text style={styles.filePickerText}>📄 Browse Files...</Text>
              </TouchableOpacity>
            ) : importPreview ? (
              <Card style={styles.previewCard}>
                <Text style={styles.previewTitle}>Import Preview</Text>
                <Text style={styles.previewVehicle}>
                  {importPreview.vehicle?.year} {importPreview.vehicle?.make}{' '}
                  {importPreview.vehicle?.model}
                </Text>
                <Text style={styles.previewStats}>
                  {importPreview.stats.totalRecords} records total
                </Text>
              </Card>
            ) : null}

            <Text style={styles.label}>Import Strategy</Text>
            <View style={styles.strategies}>
              <TouchableOpacity
                style={[
                  styles.strategy,
                  importStrategy === 'skip_duplicates' && styles.strategySelected,
                ]}
                onPress={() => setImportStrategy('skip_duplicates')}
              >
                <Text
                  style={[
                    styles.strategyText,
                    importStrategy === 'skip_duplicates' && styles.strategyTextSelected,
                  ]}
                >
                  Skip Duplicates
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.strategy,
                  importStrategy === 'overwrite' && styles.strategySelected,
                ]}
                onPress={() => setImportStrategy('overwrite')}
              >
                <Text
                  style={[
                    styles.strategyText,
                    importStrategy === 'overwrite' && styles.strategyTextSelected,
                  ]}
                >
                  Overwrite
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.strategy,
                  importStrategy === 'merge' && styles.strategySelected,
                ]}
                onPress={() => setImportStrategy('merge')}
              >
                <Text
                  style={[
                    styles.strategyText,
                    importStrategy === 'merge' && styles.strategyTextSelected,
                  ]}
                >
                  Merge
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Import"
              onPress={handleImport}
              disabled={!importFile || importing}
              loading={importing}
            />
          </ScrollView>
        </View>
      )}
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
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  backButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  modeButtons: {
    gap: 16,
    marginTop: 20,
  },
  modeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportButton: {
    backgroundColor: '#007AFF',
  },
  importButton: {
    backgroundColor: '#30D158',
  },
  modeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  quickExport: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 12,
  },
  vehicleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    marginBottom: 8,
  },
  vehicleName: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  exportArrow: {
    color: '#666',
    fontSize: 18,
  },
  label: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 8,
  },
  vehicleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    marginBottom: 8,
  },
  vehicleOptionSelected: {
    backgroundColor: '#007AFF',
  },
  vehicleOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  vehicleOptionTextSelected: {
    fontWeight: '600',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  options: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 12,
  },
  filePicker: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginVertical: 16,
  },
  filePickerText: {
    color: '#007AFF',
    fontSize: 16,
  },
  previewCard: {
    marginVertical: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  previewVehicle: {
    fontSize: 16,
    color: '#AAA',
    marginBottom: 4,
  },
  previewStats: {
    fontSize: 14,
    color: '#666',
  },
  strategies: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  strategy: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
  },
  strategySelected: {
    backgroundColor: '#007AFF',
  },
  strategyText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  strategyTextSelected: {
    fontWeight: '600',
  },
});
```

---

### Step 4: Update SettingsScreen

Add Export/Import section to SettingsScreen:

```typescript
// Add navigation to ExportImportScreen
<TouchableOpacity
  style={styles.settingItem}
  onPress={() => navigation.navigate('ExportImport' as never)}
>
  <Text style={styles.settingLabel}>Export Vehicle Data</Text>
  <Text style={styles.settingArrow}>→</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.settingItem}
  onPress={() => navigation.navigate('ExportImport' as never, { mode: 'import' })}
>
  <Text style={styles.settingLabel}>Import Vehicle Data</Text>
  <Text style={styles.settingArrow}>→</Text>
</TouchableOpacity>
```

---

### Step 5: Update Navigation

**File:** `src/navigation/AppNavigator.tsx`

```typescript
import { ExportImportScreen } from '../screens/ExportImportScreen';

// Add to stack navigator
<Stack.Screen
  name="ExportImport"
  component={ExportImportScreen}
  options={{ title: 'Export/Import' }}
/>
```

---

### Step 6: Add Dependencies

Required Expo packages:

```bash
npx expo install expo-file-system expo-sharing expo-document-picker
```

---

## Acceptance Criteria

- [ ] User can access Export/Import from Settings
- [ ] User can select vehicle to export
- [ ] User can choose what data to include
- [ ] Export creates JSON file with selected data
- [ ] User can share exported file
- [ ] User can import from JSON file
- [ ] User can choose import strategy (skip/overwrite/merge)
- [ ] Import shows preview before committing
- [ ] Import handles duplicates correctly
- [ ] Progress indicators during export/import
- [ ] Error handling for invalid files
- [ ] Error handling for network failures
- [ ] Success messages with record counts

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/services/api.ts` | Modify | Add export/import API methods |
| `src/lib/vehicleExportImport.ts` | Create | Export/import service layer |
| `src/screens/ExportImportScreen.tsx` | Create | Export/import UI |
| `src/navigation/AppNavigator.tsx` | Modify | Add ExportImportScreen to navigation |
| `src/screens/SettingsScreen.tsx` | Modify | Add export/import links |

---

## Related Tasks

- **P2-01:** Vehicle photo upload (photos included in export)
- **P2-02:** VCDS import (separate from full vehicle export)
- **P2-03:** Receipts/documents (may be included in future export versions)

---

*Created: 2026-02-24*
*Ready for implementation*
