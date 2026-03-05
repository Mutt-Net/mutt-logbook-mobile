# Sync Status Integration Guide

## Overview

This guide explains how to integrate sync status indicators into the Mutt Logbook Mobile app.

**Task:** P1-03 - Add sync status indicators to UI  
**Status:** Components created, integration scripts ready

---

## Components

### 1. SyncStatusBadge Component

**Location:** `src/components/common/SyncStatusBadge.tsx`

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface SyncStatusBadgeProps {
  isSynced: boolean;
  size?: 'small' | 'medium';
}

/**
 * Displays a visual indicator showing whether a record has been synced.
 * Orange dot = unsynced (pending sync)
 * Green dot = synced
 */
export function SyncStatusBadge({ isSynced, size = 'small' }: SyncStatusBadgeProps) {
  const dimensions = size === 'small' ? 8 : 12;

  return (
    <View
      style={[
        styles.badge,
        {
          width: dimensions,
          height: dimensions,
          backgroundColor: isSynced ? '#30D158' : '#FF9500',
        },
      ]}
    />
  );
}
```

**Visual Design:**
- **Green (#30D158):** Record is synced to server
- **Orange (#FF9500):** Record is pending sync (created/modified locally)
- **Small (8px):** For list items
- **Medium (12px):** For detail views

---

### 2. Sync Utilities

**Location:** `src/lib/syncUtils.ts`

```typescript
interface SyncStatus {
  synced: number; // 0 = unsynced, 1 = synced
  remote_id?: number | null;
}

export function isUnsynced(record: SyncStatus | null | undefined): boolean {
  if (!record) return false;
  return record.synced === 0;
}

export function getSyncStatusLabel(record: SyncStatus | null | undefined): string {
  return isUnsynced(record) ? 'Pending sync' : 'Synced';
}

export function getSyncStatusColor(record: SyncStatus | null | undefined): string {
  return isUnsynced(record) ? '#FF9500' : '#30D158';
}
```

---

### 3. Type Extensions

**Location:** `src/types/index.ts`

```typescript
// Extension type for records with sync status
export interface WithSyncStatus {
  synced: number; // 0 = unsynced, 1 = synced
  remote_id?: number | null;
}

// Utility type to add sync status to any entity
export type SyncStatusEntity<T> = T & WithSyncStatus;
```

---

## Integration Pattern

### Step 1: Add Imports

```typescript
// Add SyncStatusBadge to component imports
import { SyncStatusBadge } from '../components/common';

// Add isUnsynced utility
import { isUnsynced } from '../lib/syncUtils';

// Update type imports to include WithSyncStatus
import { Maintenance, WithSyncStatus } from '../types';
```

### Step 2: Update List Item Rendering

```typescript
// Before
<View style={styles.itemHeader}>
  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
    <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
  </View>
  <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
</View>

// After
<View style={styles.itemHeader}>
  <SyncStatusBadge isSynced={!isUnsynced(item)} size="small" />
  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
    <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
  </View>
  <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
</View>
```

### Step 3: Update Styles (if needed)

```typescript
const styles = StyleSheet.create({
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncStatusContainer: {
    marginRight: 8,
  },
  // ... other styles
});
```

---

## Screens to Update

| Screen | File | Status |
|--------|------|--------|
| Maintenance | `src/screens/MaintenanceScreen.tsx` | Ready |
| Mods | `src/screens/ModsScreen.tsx` | Ready |
| Costs | `src/screens/CostsScreen.tsx` | Ready |
| Fuel | `src/screens/FuelScreen.tsx` | Ready |
| Notes | `src/screens/NotesScreen.tsx` | Ready |
| VCDS | `src/screens/VCDSScreen.tsx` | Ready |
| Reminders | `src/screens/RemindersScreen.tsx` | Ready |

---

## Automated Integration

Run the integration script:

```powershell
# From Stratum - Qwen directory
.\integrate-sync-status.ps1
```

This script will:
1. Verify required files exist
2. Update all 7 screens with sync status badges
3. Report which screens were updated
4. Provide next steps

---

## Manual Integration

If the script fails or you prefer manual integration:

### Example: MaintenanceScreen.tsx

```typescript
// 1. Update imports (line ~10)
import { Card, Button, Input, Loading, EmptyState, SyncStatusBadge } from '../components/common';
import { isUnsynced } from '../lib/syncUtils';
import { Maintenance, Vehicle, WithSyncStatus } from '../types';

// 2. Update renderItem function (find the itemHeader View)
<View style={styles.itemHeader}>
  <View style={styles.syncStatusContainer}>
    <SyncStatusBadge isSynced={!isUnsynced(item)} size="small" />
  </View>
  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
    <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
  </View>
  <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
</View>

// 3. Add style for syncStatusContainer
syncStatusContainer: {
  marginRight: 8,
},
```

---

## Testing

After integration:

1. **Build:** `npm run build` - Verify no TypeScript errors
2. **Test:** `npm test` - Ensure existing tests pass
3. **Manual Test:**
   - Create a new maintenance record while offline
   - Verify orange dot appears next to the record
   - Connect to WiFi and trigger sync
   - Verify dot turns green after sync completes

---

## Database Schema

All tables include sync tracking fields:

```sql
-- Example: maintenance table
CREATE TABLE maintenance (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER,
  date TEXT,
  mileage INTEGER,
  category TEXT,
  description TEXT,
  parts_used TEXT,
  labor_hours REAL,
  cost REAL,
  shop_name TEXT,
  notes TEXT,
  synced INTEGER DEFAULT 0,      -- 0 = unsynced, 1 = synced
  remote_id INTEGER,             -- Server-side ID after sync
  updated_at TEXT,               -- Last modification timestamp
  created_at TEXT
);
```

---

## Sync Flow

```
┌─────────────────────────────────────────────────────────┐
│  USER ACTION                                            │
│  - Create record → synced = 0, remote_id = null         │
│  - Edit record   → synced = 0, remote_id = existing     │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│  UI DISPLAY                                             │
│  - List shows orange SyncStatusBadge                    │
│  - User knows record is pending sync                    │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│  AUTO-SYNC (WiFi detected)                              │
│  - SyncManager.push() sends unsynced records            │
│  - Server responds with remote_id                       │
│  - Local DB updated: synced = 1, remote_id = server_id  │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│  UI UPDATE                                              │
│  - SyncStatusBadge turns green                          │
│  - User knows record is synced                          │
└─────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Badge Not Showing

1. Check the record has `synced` field (should be 0 or 1)
2. Verify `isUnsynced()` is called correctly: `!isUnsynced(item)`
3. Check SyncStatusBadge is imported and rendered

### Badge Always Orange

1. Check sync is actually running (see SyncManager logs)
2. Verify API endpoint is reachable
3. Check server is returning `remote_id` on success

### Badge Always Green

1. Records might already be synced from previous session
2. Check `synced` field is being set to 0 on create/edit
3. Verify auto-sync isn't running immediately

---

## Related Tasks

- **P1-02:** Sync conflict resolution (timestamp-based)
- **P1-04:** Sync error handling and user notification
- **P2-01:** Image picker integration with sync

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/components/common/SyncStatusBadge.tsx` | Visual indicator component |
| `src/lib/syncUtils.ts` | Utility functions for sync status |
| `src/types/index.ts` | Type definitions including WithSyncStatus |
| `src/services/sync.ts` | SyncManager implementation |
| `src/services/database.ts` | Database operations with sync tracking |
| `integrate-sync-status.ps1` | Automated integration script |

---

*Created: 2026-02-24*  
*Status: Ready for integration*
