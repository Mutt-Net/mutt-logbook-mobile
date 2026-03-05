# VCDS Log Import/Parsing UI Integration

## Overview

**Task:** P2-02 - Add VCDS log import/parsing UI  
**Status:** Ready for integration  
**Differentiator:** This feature sets Mutt Logbook apart from basic maintenance loggers

---

## Feature Description

Allow users to import VCDS (VAG-COM Diagnostic System) fault logs by:
1. Pasting VCDS text output into a text area
2. Parsing the text to extract fault codes
3. Creating fault records automatically
4. Displaying parsed faults for review before saving

---

## API Endpoints

The backend provides two endpoints:

### POST /api/vcds/parse

Parses VCDS text output and returns structured fault data.

**Request:**
```json
{
  "text": "<VCDS log text>"
}
```

**Response:**
```json
{
  "faults": [
    {
      "address": "01",
      "component": "Engine",
      "fault_code": "P0300",
      "description": "Random/Multiple Cylinder Misfire Detected",
      "status": "active"
    }
  ]
}
```

### POST /api/vcds/import

Parses and imports VCDS faults directly to the database.

**Request:**
```json
{
  "vehicle_id": 1,
  "text": "<VCDS log text>"
}
```

**Response:**
```json
{
  "imported": 3,
  "faults": [...]
}
```

---

## UI Design

### VCDSScreen Enhancement

Add an "Import VCDS Log" button at the top of VCDSScreen:

```
┌─────────────────────────────────────────┐
│  VCDS Faults                    [Import]│
├─────────────────────────────────────────┤
│  [Search/Filter]                        │
├─────────────────────────────────────────┤
│  Fault List:                            │
│  - P0300 - Engine Misfire    [Active]  │
│  - P0420 - Catalyst Efficiency [Active]│
│  ...                                    │
└─────────────────────────────────────────┘
```

### Import Modal

When user taps "Import":

```
┌─────────────────────────────────────────┐
│  Import VCDS Log                    [X] │
├─────────────────────────────────────────┤
│                                         │
│  Paste your VCDS log output below:     │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 01-Engine--Status: Malfunction    │  │
│  │                                   │  │
│  │ 1 Fault Found:                    │  │
│  │ 000256 - Random/Multiple Cylinder │  │
│  │          Misfire Detected         │  │
│  │          P0300 - 001 - Active     │  │
│  │                                   │  │
│  │ ...                               │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─────────────────┐ ┌────────────────┐ │
│  │     Cancel      │ │     Parse      │ │
│  └─────────────────┘ └────────────────┘ │
└─────────────────────────────────────────┘
```

### Parse Results Modal

After parsing, show results for review:

```
┌─────────────────────────────────────────┐
│  Review Parsed Faults               [X] │
├─────────────────────────────────────────┤
│                                         │
│  Found 3 faults:                        │
│                                         │
│  ☑ 01-Engine                            │
│     P0300 - Random/Multiple Cylinder    │
│     Misfire Detected                    │
│                                         │
│  ☑ 03-ABS                               │
│     C1234 - Wheel Speed Sensor          │
│                                         │
│  ☐ 15-Airbag                            │
│     B0001 - Driver Airbag Igniter       │
│     (Already exists - skip)             │
│                                         │
│  ┌─────────────────┐ ┌────────────────┐ │
│  │     Back        │ │   Import (3)   │ │
│  └─────────────────┘ └────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Implementation Plan

### Step 1: Add API Methods

**File:** `src/services/api.ts`

```typescript
interface VCDSParseResponse {
  faults: Array<{
    address: string;
    component: string;
    fault_code: string;
    description: string;
    status: 'active' | 'cleared';
  }>;
}

class ApiService {
  // ... existing methods

  async parseVCDSLog(text: string): Promise<VCDSParseResponse> {
    const response = await this.post('/api/vcds/parse', { text });
    return response.data;
  }

  async importVCDSLog(
    vehicleId: number,
    text: string
  ): Promise<{ imported: number; faults: VCDSFault[] }> {
    const response = await this.post('/api/vcds/import', {
      vehicle_id: vehicleId,
      text,
    });
    return response.data;
  }
}
```

---

### Step 2: Add VCDS Import Component

**File:** `src/screens/VCDSScreen.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  CheckBox,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Loading, EmptyState, SyncStatusBadge } from '../components/common';
import { VCDSFault, Vehicle, WithSyncStatus } from '../types';
import { VCDSFaultService } from '../services/database';
import { api } from '../services/api';
import { isUnsynced } from '../lib/syncUtils';

interface ParsedFault {
  address: string;
  component: string;
  fault_code: string;
  description: string;
  status: 'active' | 'cleared';
  selected: boolean;
  exists?: boolean;
}

export function VCDSScreen({ vehicleId }: { vehicleId: number }) {
  const navigation = useNavigation();
  const [faults, setFaults] = useState<VCDSFault[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Import state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [vcdsText, setVcdsText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedFaults, setParsedFaults] = useState<ParsedFault[]>([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadFaults();
  }, [vehicleId]);

  async function loadFaults() {
    setLoading(true);
    try {
      const data = await VCDSFaultService.getByVehicle(vehicleId);
      setFaults(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load VCDS faults');
    } finally {
      setLoading(false);
    }
  }

  async function handleParse() {
    if (!vcdsText.trim()) {
      Alert.alert('Error', 'Please paste VCDS log text');
      return;
    }

    setParsing(true);
    try {
      const response = await api.parseVCDSLog(vcdsText);
      
      // Check for existing faults
      const faultsWithExistence = response.faults.map(fault => ({
        ...fault,
        selected: true,
        exists: faults.some(f => f.fault_code === fault.fault_code),
      }));
      
      setParsedFaults(faultsWithExistence);
      setImportModalVisible(false);
      setReviewModalVisible(true);
    } catch (error) {
      Alert.alert('Parse Error', 'Failed to parse VCDS log. Please check the format.');
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    const selectedFaults = parsedFaults.filter(f => f.selected && !f.exists);
    
    if (selectedFaults.length === 0) {
      Alert.alert('No Faults', 'No new faults to import');
      setReviewModalVisible(false);
      return;
    }

    setImporting(true);
    try {
      // Import selected faults
      for (const fault of selectedFaults) {
        await VCDSFaultService.create({
          vehicle_id: vehicleId,
          address: fault.address,
          component: fault.component,
          fault_code: fault.fault_code,
          description: fault.description,
          status: fault.status,
          detected_date: new Date().toISOString(),
          notes: '',
        });
      }

      Alert.alert('Success', `Imported ${selectedFaults.length} faults`);
      setReviewModalVisible(false);
      setVcdsText('');
      loadFaults();
    } catch (error) {
      Alert.alert('Import Error', 'Failed to import faults');
    } finally {
      setImporting(false);
    }
  }

  function toggleFaultSelection(index: number) {
    const updated = [...parsedFaults];
    updated[index].selected = !updated[index].selected;
    setParsedFaults(updated);
  }

  function renderItem(item: VCDSFault & WithSyncStatus) {
    return (
      <Card key={item.id} style={styles.faultCard}>
        <View style={styles.faultHeader}>
          <View style={styles.faultHeaderLeft}>
            <SyncStatusBadge isSynced={!isUnsynced(item)} size="small" />
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
            <Text style={styles.faultCode}>{item.fault_code || 'N/A'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleEditPress(item)}
            style={styles.editButton}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        {item.component && (
          <Text style={styles.faultComponent}>{item.component}</Text>
        )}
        {item.description && (
          <Text style={styles.faultDescription}>{item.description}</Text>
        )}
        
        <View style={styles.faultMeta}>
          <Text style={styles.faultMetaText}>
            Address: {item.address || 'N/A'}
          </Text>
          <Text style={styles.faultMetaText}>
            Detected: {formatDate(item.detected_date)}
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Import Button */}
      <View style={styles.header}>
        <Text style={styles.title}>VCDS Faults</Text>
        <TouchableOpacity
          style={styles.importButton}
          onPress={() => setImportModalVisible(true)}
        >
          <Text style={styles.importButtonText}>Import</Text>
        </TouchableOpacity>
      </View>

      {/* Fault List */}
      {loading ? (
        <Loading />
      ) : faults.length === 0 ? (
        <EmptyState
          title="No VCDS Faults"
          subtitle="Import a VCDS log or add faults manually"
        />
      ) : (
        <ScrollView style={styles.list}>
          {faults.map(renderItem)}
        </ScrollView>
      )}

      {/* Import Modal */}
      <Modal
        visible={importModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import VCDS Log</Text>
              <TouchableOpacity onPress={() => setImportModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInstruction}>
              Paste your VCDS log output below:
            </Text>

            <TextInput
              style={styles.textInput}
              multiline
              value={vcdsText}
              onChangeText={setVcdsText}
              placeholder="01-Engine--Status: Malfunction..."
              placeholderTextColor="#666"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setImportModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.parseButton]}
                onPress={handleParse}
                disabled={parsing}
              >
                <Text style={styles.parseButtonText}>
                  {parsing ? 'Parsing...' : 'Parse'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Parsed Faults</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInstruction}>
              Found {parsedFaults.length} faults. Select which to import:
            </Text>

            <ScrollView style={styles.faultList}>
              {parsedFaults.map((fault, index) => (
                <View key={index} style={styles.parsedFaultItem}>
                  <CheckBox
                    value={fault.selected}
                    onValueChange={() => toggleFaultSelection(index)}
                    disabled={fault.exists}
                  />
                  <View style={styles.parsedFaultContent}>
                    <Text style={styles.parsedFaultCode}>
                      {fault.fault_code}
                    </Text>
                    <Text style={styles.parsedFaultDescription}>
                      {fault.description}
                    </Text>
                    {fault.exists && (
                      <Text style={styles.existsBadge}>Already exists</Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.backButton]}
                onPress={() => setReviewModalVisible(false)}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.importButton]}
                onPress={handleImport}
                disabled={importing}
              >
                <Text style={styles.importButtonText}>
                  {importing
                    ? 'Importing...'
                    : `Import (${parsedFaults.filter(f => f.selected && !f.exists).length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... existing styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  importButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  importButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // ... modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  modalInstruction: {
    color: '#AAA',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#3A3A3C',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  parseButton: {
    backgroundColor: '#007AFF',
  },
  parseButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#3A3A3C',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  importButton: {
    backgroundColor: '#30D158',
  },
  faultList: {
    maxHeight: 300,
    marginVertical: 12,
  },
  parsedFaultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  parsedFaultContent: {
    flex: 1,
    marginLeft: 8,
  },
  parsedFaultCode: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  parsedFaultDescription: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 4,
  },
  existsBadge: {
    color: '#FF9500',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
```

---

### Step 3: Update API Service

**File:** `src/services/api.ts`

Add the VCDS methods to the ApiService class.

---

### Step 4: Test the Feature

1. **Unit Tests:**
   - Test parseVCDSLog with valid/invalid input
   - Test importVCDSLog with various fault counts
   - Test duplicate detection

2. **Integration Tests:**
   - Test full import flow from UI
   - Test with real VCDS output samples
   - Test error handling (network failures, parse errors)

3. **Manual Tests:**
   - Copy real VCDS output from VAG-COM
   - Paste into app and verify parsing
   - Verify faults appear in list with correct data

---

## Sample VCDS Output Format

```
VCDS Version: 23.3.1.0
VIN: WVWZZZ1KZAW123456

01-Engine--Status: Malfunction 0010
Address 01: Electronics Info. Labels: None
   Part No SW: 1K0 906 056 HW: 1K0 906 056
   Component: SIMOS 715 8103
   
1 Fault Found:
000256 - Random/Multiple Cylinder Misfire Detected
         P0300 - 001 - Active
         Freeze Frame:
                RPM: 2400
                Load: 45%
```

---

## Acceptance Criteria

- [ ] User can tap "Import" button on VCDSScreen
- [ ] Modal appears with text input for VCDS log
- [ ] User can paste VCDS output and tap "Parse"
- [ ] Parsed faults are displayed for review
- [ ] User can select/deselect faults to import
- [ ] Existing faults are marked and disabled
- [ ] Selected faults are created in database
- [ ] Success message shows count of imported faults
- [ ] Error handling for invalid format
- [ ] Error handling for network failures
- [ ] Imported faults show with sync status indicator

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/services/api.ts` | Modify | Add parseVCDSLog and importVCDSLog methods |
| `src/screens/VCDSScreen.tsx` | Modify | Add import UI, modals, and logic |
| `src/types/index.ts` | Already done | VCDSFault type exists |
| `src/services/database.ts` | Already done | VCDSFaultService exists |

---

## Related Tasks

- **P1-03:** Sync status indicators (already integrated)
- **P2-03:** Receipt/document upload (future)
- **P2-04:** Vehicle export/import (future)

---

*Created: 2026-02-24*  
*Ready for implementation*
