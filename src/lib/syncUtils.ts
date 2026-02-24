/**
 * Sync status utilities for determining if records need to be synced.
 */

interface SyncStatus {
  synced: number; // 0 = unsynced, 1 = synced
  remote_id?: number | null;
}

/**
 * Check if a record is unsynced (needs to be pushed to server).
 * @param record - Record with sync status fields
 * @returns true if record has not been synced
 */
export function isUnsynced(record: SyncStatus | null | undefined): boolean {
  if (!record) return false;
  return record.synced === 0;
}

/**
 * Get sync status label for display.
 * @param record - Record with sync status fields
 * @returns 'Synced' or 'Pending sync'
 */
export function getSyncStatusLabel(record: SyncStatus | null | undefined): string {
  return isUnsynced(record) ? 'Pending sync' : 'Synced';
}

/**
 * Get sync status color for display.
 * @param record - Record with sync status fields
 * @returns hex color code
 */
export function getSyncStatusColor(record: SyncStatus | null | undefined): string {
  return isUnsynced(record) ? '#FF9500' : '#30D158';
}
