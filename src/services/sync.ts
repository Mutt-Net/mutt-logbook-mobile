import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  VehicleService,
  MaintenanceService,
  ModService,
  CostService,
  NoteService,
  VCDSFaultService,
  GuideService,
  VehiclePhotoService,
  FuelEntryService,
  ReminderService,
  ReceiptService,
  DocumentService,
} from './database';
import apiService from './api';
import { addWifiListener, removeWifiListener } from './wifi';
import { logger } from '../lib/logger';

const LAST_SYNC_KEY = 'last_sync_timestamp';
const SYNC_ERRORS_KEY = 'sync_errors';
const MAX_ERROR_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SyncResult {
  success: boolean;
  pushed: {
    vehicles: number;
    maintenance: number;
    mods: number;
    costs: number;
    notes: number;
    vcds: number;
    guides: number;
    photos: number;
    fuel: number;
    reminders: number;
    receipts: number;
    documents: number;
  };
  pulled: {
    vehicles: number;
    maintenance: number;
    mods: number;
    costs: number;
    notes: number;
    vcds: number;
    guides: number;
    photos: number;
    fuel: number;
    reminders: number;
    receipts: number;
    documents: number;
  };
  conflicts: {
    resolved: number;
    localWins: number;
    remoteWins: number;
  };
  errors: string[];
  timestamp: string;
}

const getLastSyncTimestamp = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
};

const setLastSyncTimestamp = async (timestamp: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp);
  } catch (error) {
    logger.warn('Failed to save last sync timestamp', { error });
  }
};
const getSyncErrors = async (): Promise<string[]> => {
  try {
    const errorsJson = await AsyncStorage.getItem(SYNC_ERRORS_KEY);
    if (!errorsJson) return [];
    
    const parsed = JSON.parse(errorsJson);
    if (!parsed || !Array.isArray(parsed.errors)) return [];
    
    return parsed.errors;
  } catch {
    return [];
  }
};

const setSyncErrors = async (errors: string[]): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    const errorData = { errors, timestamp };
    await AsyncStorage.setItem(SYNC_ERRORS_KEY, JSON.stringify(errorData));
  } catch (error) {
    logger.warn('Failed to save sync errors', { error });
  }
};

const clearSyncErrors = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SYNC_ERRORS_KEY);
  } catch (error) {
    logger.warn('Failed to clear sync errors', { error });
  }
};

const getSyncErrorInfo = async (): Promise<{ errors: string[]; timestamp: string | null }> => {
  try {
    const errorsJson = await AsyncStorage.getItem(SYNC_ERRORS_KEY);
    if (!errorsJson) return { errors: [], timestamp: null };
    
    const parsed = JSON.parse(errorsJson);
    if (!parsed || !Array.isArray(parsed.errors)) return { errors: [], timestamp: null };
    
    // Check if errors are stale (older than 24 hours)
    if (parsed.timestamp) {
      const errorTime = new Date(parsed.timestamp).getTime();
      const now = Date.now();
      if (now - errorTime > MAX_ERROR_AGE_MS) {
        await clearSyncErrors();
        return { errors: [], timestamp: null };
      }
    }
    
    return { errors: parsed.errors, timestamp: parsed.timestamp || null };
  } catch {
    return { errors: [], timestamp: null };
  }
};


/**
 * Compare two timestamps and return which is newer.
 * Returns: 'local' if local is newer or equal, 'remote' if remote is newer
 */
const compareTimestamps = (localUpdatedAt: string | null | undefined, remoteUpdatedAt: string | null | undefined): 'local' | 'remote' => {
  // If no local timestamp, remote wins (it's new data)
  if (!localUpdatedAt) return 'remote';
  // If no remote timestamp, keep local
  if (!remoteUpdatedAt) return 'local';
  
  try {
    const localTime = new Date(localUpdatedAt).getTime();
    const remoteTime = new Date(remoteUpdatedAt).getTime();
    
    // Local wins on tie (prefer existing data)
    return remoteTime > localTime ? 'remote' : 'local';
  } catch {
    // If parsing fails, prefer local
    return 'local';
  }
};

/**
 * Resolve sync conflict using timestamp-based strategy.
 * Returns true if remote should overwrite local.
 */
const resolveConflict = (
  localRecord: Record<string, unknown> | null,
  remoteRecord: Record<string, unknown>
): boolean => {
  if (!localRecord) return true; // No local record, accept remote
  
  const localUpdatedAt = localRecord.updated_at as string | null | undefined;
  const remoteUpdatedAt = remoteRecord.updated_at as string | null | undefined;
  
  const winner = compareTimestamps(localUpdatedAt, remoteUpdatedAt);
  return winner === 'remote';
};

class SyncManager {
  private static instance: SyncManager;
  private isAutoSyncEnabled = false;
  private isSyncing = false;
  private wifiUnsubscribe: (() => void) | null = null;

  private constructor() {}

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  async getSyncErrors(): Promise<string[]> {
    return await getSyncErrors();
  }

  async getSyncErrorInfo(): Promise<{ errors: string[]; timestamp: string | null }> {
    return await getSyncErrorInfo();
  }

  async clearSyncErrors(): Promise<void> {
    await clearSyncErrors();
  }


  startAutoSync(): void {
    if (this.isAutoSyncEnabled) return;

    this.isAutoSyncEnabled = true;
    this.wifiUnsubscribe = addWifiListener(async (isHomeWifi) => {
      if (isHomeWifi && !this.isSyncing) {
        try {
          await this.syncAll();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Auto-sync failed';
          logger.warn('Auto-sync failed', { error: errorMsg });
          await setSyncErrors([errorMsg]);
        }
      }
    });
  }

  stopAutoSync(): void {
    this.isAutoSyncEnabled = false;
    if (this.wifiUnsubscribe) {
      this.wifiUnsubscribe();
      this.wifiUnsubscribe = null;
    }
  }

  getLastSyncTime(): Promise<string | null> {
    return getLastSyncTimestamp();
  }

  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        pushed: { vehicles: 0, maintenance: 0, mods: 0, costs: 0, notes: 0, vcds: 0, guides: 0, photos: 0, fuel: 0, reminders: 0, receipts: 0, documents: 0 },
        pulled: { vehicles: 0, maintenance: 0, mods: 0, costs: 0, notes: 0, vcds: 0, guides: 0, photos: 0, fuel: 0, reminders: 0, receipts: 0, documents: 0 },
        conflicts: { resolved: 0, localWins: 0, remoteWins: 0 },
        errors: ['Sync already in progress'],
        timestamp: new Date().toISOString(),
      };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      pushed: { vehicles: 0, maintenance: 0, mods: 0, costs: 0, notes: 0, vcds: 0, guides: 0, photos: 0, fuel: 0, reminders: 0, receipts: 0, documents: 0 },
      pulled: { vehicles: 0, maintenance: 0, mods: 0, costs: 0, notes: 0, vcds: 0, guides: 0, photos: 0, fuel: 0, reminders: 0, receipts: 0, documents: 0 },
      conflicts: { resolved: 0, localWins: 0, remoteWins: 0 },
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      await this.syncVehicles(result);
      await this.syncMaintenance(result);
      await this.syncMods(result);
      await this.syncCosts(result);
      await this.syncNotes(result);
      await this.syncVCDS(result);
      await this.syncGuides(result);
      await this.syncPhotos(result);
      await this.syncFuel(result);
      await this.syncReminders(result);
      await this.syncReceipts(result);
      await this.syncDocuments(result);

      await setLastSyncTimestamp(result.timestamp);
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      await setSyncErrors(result.errors);
      logger.error('Sync failed', { errors: result.errors });
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  async syncVehicles(result: SyncResult): Promise<void> {
    try {
      // Push: Send local unsynced records to remote
      const unsynced = await VehicleService.getUnsynced();
      for (const vehicle of unsynced) {
        try {
          const created = await apiService.vehicles.create({
            name: vehicle.name,
            make: vehicle.make,
            model: vehicle.model,
            reg: vehicle.reg || undefined,
            vin: vehicle.vin || undefined,
            year: vehicle.year || undefined,
            engine: vehicle.engine || undefined,
            transmission: vehicle.transmission || undefined,
            mileage: vehicle.mileage,
          });
          await VehicleService.markSynced(vehicle.id, created.id);
          result.pushed.vehicles++;
        } catch (error) {
          result.errors.push(`Vehicle ${vehicle.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      // Pull: Fetch remote records with conflict resolution
      const remoteVehicles = await apiService.vehicles.getAll();
      for (const remote of remoteVehicles) {
        const existing = await VehicleService.getByRemoteId(remote.id);
        
        if (!existing) {
          // No local record with this remote_id, create new
          await VehicleService.create({
            name: remote.name,
            make: remote.make,
            model: remote.model,
            reg: remote.reg,
            vin: remote.vin,
            year: remote.year,
            engine: remote.engine,
            transmission: remote.transmission,
            mileage: remote.mileage,
          });
          await VehicleService.markSynced(remote.id, remote.id);
          result.pulled.vehicles++;
        } else {
          // Conflict: compare timestamps
          result.conflicts.resolved++;
          const shouldUpdate = resolveConflict(existing as unknown as Record<string, unknown>, remote as unknown as Record<string, unknown>);
          
          if (shouldUpdate) {
            // Remote is newer, update local
            await VehicleService.update(existing.id, {
              name: remote.name,
              make: remote.make,
              model: remote.model,
              reg: remote.reg,
              vin: remote.vin,
              year: remote.year,
              engine: remote.engine,
              transmission: remote.transmission,
              mileage: remote.mileage,
            });
            await VehicleService.markSynced(existing.id, remote.id);
            result.pulled.vehicles++;
            result.conflicts.remoteWins++;
          } else {
            // Local is newer, keep local but mark as synced
            await VehicleService.markSynced(existing.id, remote.id);
            result.conflicts.localWins++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Vehicles sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncMaintenance(result: SyncResult): Promise<void> {
    try {
      // Push
      const unsynced = await MaintenanceService.getUnsynced();
      for (const item of unsynced) {
        try {
          const created = await apiService.maintenance.create({
            vehicle_id: item.vehicle_id,
            date: item.date || '',
            mileage: item.mileage || undefined,
            category: item.category || undefined,
            description: item.description || undefined,
            parts_used: item.parts_used ? [item.parts_used] : undefined,
            labor_hours: item.labor_hours || undefined,
            cost: item.cost || undefined,
            shop_name: item.shop_name || undefined,
            notes: item.notes || undefined,
          });
          await MaintenanceService.markSynced(item.id, created.id);
          result.pushed.maintenance++;
        } catch (error) {
          result.errors.push(`Maintenance ${item.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      // Pull with conflict resolution
      const remoteMaintenance = await apiService.maintenance.getAll();
      for (const remote of remoteMaintenance) {
        const existing = await MaintenanceService.getByRemoteId(remote.id);
        
        if (!existing) {
          await MaintenanceService.create({
            vehicle_id: remote.vehicle_id,
            date: remote.date,
            mileage: remote.mileage,
            category: remote.category,
            description: remote.description,
            parts_used: remote.parts_used,
            labor_hours: remote.labor_hours,
            cost: remote.cost,
            shop_name: remote.shop_name,
            notes: remote.notes,
          });
          await MaintenanceService.markSynced(remote.id, remote.id);
          result.pulled.maintenance++;
        } else {
          result.conflicts.resolved++;
          const shouldUpdate = resolveConflict(existing as unknown as Record<string, unknown>, remote as unknown as Record<string, unknown>);
          
          if (shouldUpdate) {
            await MaintenanceService.update(existing.id, {
              vehicle_id: remote.vehicle_id,
              date: remote.date,
              mileage: remote.mileage,
              category: remote.category,
              description: remote.description,
              parts_used: remote.parts_used,
              labor_hours: remote.labor_hours,
              cost: remote.cost,
              shop_name: remote.shop_name,
              notes: remote.notes,
            });
            await MaintenanceService.markSynced(existing.id, remote.id);
            result.pulled.maintenance++;
            result.conflicts.remoteWins++;
          } else {
            await MaintenanceService.markSynced(existing.id, remote.id);
            result.conflicts.localWins++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Maintenance sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncMods(result: SyncResult): Promise<void> {
    try {
      // Push
      const unsynced = await ModService.getUnsynced();
      for (const mod of unsynced) {
        try {
          const created = await apiService.mods.create({
            vehicle_id: mod.vehicle_id,
            date: mod.date || undefined,
            mileage: mod.mileage || undefined,
            category: mod.category || undefined,
            description: mod.description || undefined,
            parts: mod.parts ? [mod.parts] : undefined,
            cost: mod.cost || undefined,
            status: mod.status || 'planned',
            notes: mod.notes || undefined,
          });
          await ModService.markSynced(mod.id, created.id);
          result.pushed.mods++;
        } catch (error) {
          result.errors.push(`Mod ${mod.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      // Pull with conflict resolution
      const remoteMods = await apiService.mods.getAll();
      for (const remote of remoteMods) {
        const existing = await ModService.getByRemoteId(remote.id);
        
        if (!existing) {
          await ModService.create({
            vehicle_id: remote.vehicle_id,
            date: remote.date,
            mileage: remote.mileage,
            category: remote.category,
            description: remote.description,
            parts: remote.parts,
            cost: remote.cost,
            status: remote.status,
            notes: remote.notes,
          });
          await ModService.markSynced(remote.id, remote.id);
          result.pulled.mods++;
        } else {
          result.conflicts.resolved++;
          const shouldUpdate = resolveConflict(existing as unknown as Record<string, unknown>, remote as unknown as Record<string, unknown>);
          
          if (shouldUpdate) {
            await ModService.update(existing.id, {
              vehicle_id: remote.vehicle_id,
              date: remote.date,
              mileage: remote.mileage,
              category: remote.category,
              description: remote.description,
              parts: remote.parts,
              cost: remote.cost,
              status: remote.status,
              notes: remote.notes,
            });
            await ModService.markSynced(existing.id, remote.id);
            result.pulled.mods++;
            result.conflicts.remoteWins++;
          } else {
            await ModService.markSynced(existing.id, remote.id);
            result.conflicts.localWins++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Mods sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncCosts(result: SyncResult): Promise<void> {
    try {
      // Push
      const unsynced = await CostService.getUnsynced();
      for (const cost of unsynced) {
        try {
          const created = await apiService.costs.create({
            vehicle_id: cost.vehicle_id,
            date: cost.date || undefined,
            category: cost.category || undefined,
            amount: cost.amount || undefined,
            description: cost.description || undefined,
          });
          await CostService.markSynced(cost.id, created.id);
          result.pushed.costs++;
        } catch (error) {
          result.errors.push(`Cost ${cost.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      // Pull with conflict resolution
      const remoteCosts = await apiService.costs.getAll();
      for (const remote of remoteCosts) {
        const existing = await CostService.getByRemoteId(remote.id);
        
        if (!existing) {
          await CostService.create({
            vehicle_id: remote.vehicle_id,
            date: remote.date,
            category: remote.category,
            amount: remote.amount,
            description: remote.description,
          });
          await CostService.markSynced(remote.id, remote.id);
          result.pulled.costs++;
        } else {
          result.conflicts.resolved++;
          const shouldUpdate = resolveConflict(existing as unknown as Record<string, unknown>, remote as unknown as Record<string, unknown>);
          
          if (shouldUpdate) {
            await CostService.update(existing.id, {
              vehicle_id: remote.vehicle_id,
              date: remote.date,
              category: remote.category,
              amount: remote.amount,
              description: remote.description,
            });
            await CostService.markSynced(existing.id, remote.id);
            result.pulled.costs++;
            result.conflicts.remoteWins++;
          } else {
            await CostService.markSynced(existing.id, remote.id);
            result.conflicts.localWins++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Costs sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncNotes(result: SyncResult): Promise<void> {
    try {
      // Push
      const unsynced = await NoteService.getUnsynced();
      for (const note of unsynced) {
        try {
          const created = await apiService.notes.create({
            vehicle_id: note.vehicle_id,
            date: note.date || undefined,
            title: note.title || undefined,
            content: note.content || undefined,
            tags: note.tags || undefined,
          });
          await NoteService.markSynced(note.id, created.id);
          result.pushed.notes++;
        } catch (error) {
          result.errors.push(`Note ${note.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      // Pull with conflict resolution
      const remoteNotes = await apiService.notes.getAll();
      for (const remote of remoteNotes) {
        const existing = await NoteService.getByRemoteId(remote.id);
        
        if (!existing) {
          await NoteService.create({
            vehicle_id: remote.vehicle_id,
            date: remote.date,
            title: remote.title,
            content: remote.content,
            tags: remote.tags,
          });
          await NoteService.markSynced(remote.id, remote.id);
          result.pulled.notes++;
        } else {
          result.conflicts.resolved++;
          const shouldUpdate = resolveConflict(existing as unknown as Record<string, unknown>, remote as unknown as Record<string, unknown>);
          
          if (shouldUpdate) {
            await NoteService.update(existing.id, {
              vehicle_id: remote.vehicle_id,
              date: remote.date,
              title: remote.title,
              content: remote.content,
              tags: remote.tags,
            });
            await NoteService.markSynced(existing.id, remote.id);
            result.pulled.notes++;
            result.conflicts.remoteWins++;
          } else {
            await NoteService.markSynced(existing.id, remote.id);
            result.conflicts.localWins++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Notes sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncVCDS(result: SyncResult): Promise<void> {
    try {
      // Push
      const unsynced = await VCDSFaultService.getUnsynced();
      for (const fault of unsynced) {
        try {
          const created = await apiService.vcds.create({
            vehicle_id: fault.vehicle_id,
            address: fault.address ?? null,
            component: fault.component ?? null,
            fault_code: fault.fault_code ?? null,
            description: fault.description ?? null,
            status: fault.status || 'active',
            detected_date: fault.detected_date ?? null,
            cleared_date: fault.cleared_date ?? null,
            notes: fault.notes ?? null,
          });
          await VCDSFaultService.markSynced(fault.id, created.id);
          result.pushed.vcds++;
        } catch (error) {
          result.errors.push(`VCDS Fault ${fault.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      // Pull with conflict resolution
      const remoteFaults = await apiService.vcds.getAll();
      for (const remote of remoteFaults) {
        const existing = await VCDSFaultService.getByRemoteId(remote.id);
        
        if (!existing) {
          await VCDSFaultService.create({
            vehicle_id: remote.vehicle_id,
            address: remote.address,
            component: remote.component,
            fault_code: remote.fault_code,
            description: remote.description,
            status: remote.status,
            detected_date: remote.detected_date,
            cleared_date: remote.cleared_date,
            notes: remote.notes,
          });
          await VCDSFaultService.markSynced(remote.id, remote.id);
          result.pulled.vcds++;
        } else {
          result.conflicts.resolved++;
          const shouldUpdate = resolveConflict(existing as unknown as Record<string, unknown>, remote as unknown as Record<string, unknown>);
          
          if (shouldUpdate) {
            await VCDSFaultService.update(existing.id, {
              vehicle_id: remote.vehicle_id,
              address: remote.address,
              component: remote.component,
              fault_code: remote.fault_code,
              description: remote.description,
              status: remote.status,
              detected_date: remote.detected_date,
              cleared_date: remote.cleared_date,
              notes: remote.notes,
            });
            await VCDSFaultService.markSynced(existing.id, remote.id);
            result.pulled.vcds++;
            result.conflicts.remoteWins++;
          } else {
            await VCDSFaultService.markSynced(existing.id, remote.id);
            result.conflicts.localWins++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`VCDS sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncGuides(result: SyncResult): Promise<void> {
    try {
      // Push
      const unsynced = await GuideService.getUnsynced();
      for (const guide of unsynced) {
        try {
          const created = await apiService.guides.create({
            vehicle_id: guide.vehicle_id ?? null,
            title: guide.title,
            category: guide.category ?? null,
            content: guide.content ?? null,
            interval_miles: guide.interval_miles ?? null,
            interval_months: guide.interval_months ?? null,
            is_template: guide.is_template,
          });
          await GuideService.markSynced(guide.id, created.id);
          result.pushed.guides++;
        } catch (error) {
          result.errors.push(`Guide ${guide.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      // Pull with conflict resolution
      const remoteGuides = await apiService.guides.getAll();
      for (const remote of remoteGuides) {
        const existing = await GuideService.getByRemoteId(remote.id);
        
        if (!existing) {
          await GuideService.create({
            vehicle_id: remote.vehicle_id,
            title: remote.title,
            category: remote.category,
            content: remote.content,
            interval_miles: remote.interval_miles,
            interval_months: remote.interval_months,
            is_template: remote.is_template,
          });
          await GuideService.markSynced(remote.id, remote.id);
          result.pulled.guides++;
        } else {
          result.conflicts.resolved++;
          const shouldUpdate = resolveConflict(existing as unknown as Record<string, unknown>, remote as unknown as Record<string, unknown>);
          
          if (shouldUpdate) {
            await GuideService.update(existing.id, {
              vehicle_id: remote.vehicle_id,
              title: remote.title,
              category: remote.category,
              content: remote.content,
              interval_miles: remote.interval_miles,
              interval_months: remote.interval_months,
              is_template: remote.is_template,
            });
            await GuideService.markSynced(existing.id, remote.id);
            result.pulled.guides++;
            result.conflicts.remoteWins++;
          } else {
            await GuideService.markSynced(existing.id, remote.id);
            result.conflicts.localWins++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Guides sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncPhotos(result: SyncResult): Promise<void> {
    try {
      // Push
      const unsynced = await VehiclePhotoService.getUnsynced();
      for (const photo of unsynced) {
        try {
          if (photo.filename) {
            const created = await apiService.photos.create({
              uri: photo.filename,
              name: photo.filename.split('/').pop() || 'photo.jpg',
              type: 'image/jpeg',
            } as any);
            await VehiclePhotoService.markSynced(photo.id, created.id);
            result.pushed.photos++;
          }
        } catch (error) {
          result.errors.push(`Photo ${photo.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      // Pull with conflict resolution
      const remotePhotos = await apiService.photos.getAll();
      for (const remote of remotePhotos) {
        const existing = await VehiclePhotoService.getByRemoteId(remote.id);
        
        if (!existing) {
          await VehiclePhotoService.create({
            vehicle_id: remote.vehicle_id,
            filename: remote.filename,
            caption: remote.caption,
            is_primary: remote.is_primary,
          });
          await VehiclePhotoService.markSynced(remote.id, remote.id);
          result.pulled.photos++;
        } else {
          result.conflicts.resolved++;
          const shouldUpdate = resolveConflict(existing as unknown as Record<string, unknown>, remote as unknown as Record<string, unknown>);
          
          if (shouldUpdate) {
            await VehiclePhotoService.update(existing.id, {
              vehicle_id: remote.vehicle_id,
              filename: remote.filename,
              caption: remote.caption,
              is_primary: remote.is_primary,
            });
            await VehiclePhotoService.markSynced(existing.id, remote.id);
            result.pulled.photos++;
            result.conflicts.remoteWins++;
          } else {
            await VehiclePhotoService.markSynced(existing.id, remote.id);
            result.conflicts.localWins++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Photos sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncFuel(result: SyncResult): Promise<void> {
    try {
      // Push
      const unsynced = await FuelEntryService.getUnsynced();
      for (const entry of unsynced) {
        try {
          const created = await apiService.fuel.create({
            vehicle_id: entry.vehicle_id,
            date: entry.date || undefined,
            mileage: entry.mileage || undefined,
            gallons: entry.gallons || undefined,
            price_per_gallon: entry.price_per_gallon || undefined,
            total_cost: entry.total_cost || undefined,
            station: entry.station || undefined,
            notes: entry.notes || undefined,
          });
          await FuelEntryService.markSynced(entry.id, created.id);
          result.pushed.fuel++;
        } catch (error) {
          result.errors.push(`Fuel entry ${entry.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      // Pull with conflict resolution
      const remoteFuel = await apiService.fuel.getAll();
      for (const remote of remoteFuel) {
        const existing = await FuelEntryService.getByRemoteId(remote.id);
        
        if (!existing) {
          await FuelEntryService.create({
            vehicle_id: remote.vehicle_id,
            date: remote.date,
            mileage: remote.mileage,
            gallons: remote.gallons,
            price_per_gallon: remote.price_per_gallon,
            total_cost: remote.total_cost,
            station: remote.station,
            notes: remote.notes,
          });
          await FuelEntryService.markSynced(remote.id, remote.id);
          result.pulled.fuel++;
        } else {
          result.conflicts.resolved++;
          const shouldUpdate = resolveConflict(existing as unknown as Record<string, unknown>, remote as unknown as Record<string, unknown>);
          
          if (shouldUpdate) {
            await FuelEntryService.update(existing.id, {
              vehicle_id: remote.vehicle_id,
              date: remote.date,
              mileage: remote.mileage,
              gallons: remote.gallons,
              price_per_gallon: remote.price_per_gallon,
              total_cost: remote.total_cost,
              station: remote.station,
              notes: remote.notes,
            });
            await FuelEntryService.markSynced(existing.id, remote.id);
            result.pulled.fuel++;
            result.conflicts.remoteWins++;
          } else {
            await FuelEntryService.markSynced(existing.id, remote.id);
            result.conflicts.localWins++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Fuel sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncReminders(result: SyncResult): Promise<void> {
    try {
      // Push
      const unsynced = await ReminderService.getUnsynced();
      for (const reminder of unsynced) {
        try {
          const created = await apiService.reminders.create({
            vehicle_id: reminder.vehicle_id,
            type: reminder.type,
            interval_miles: reminder.interval_miles ?? null,
            interval_months: reminder.interval_months ?? null,
            last_service_date: reminder.last_service_date ?? null,
            last_service_mileage: reminder.last_service_mileage ?? null,
            next_due_date: reminder.next_due_date ?? null,
            next_due_mileage: reminder.next_due_mileage ?? null,
            notes: reminder.notes ?? null,
          });
          await ReminderService.markSynced(reminder.id, created.id);
          result.pushed.reminders++;
        } catch (error) {
          result.errors.push(`Reminder ${reminder.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      // Pull with conflict resolution
      const remoteReminders = await apiService.reminders.getAll();
      for (const remote of remoteReminders) {
        const existing = await ReminderService.getByRemoteId(remote.id);
        
        if (!existing) {
          await ReminderService.create({
            vehicle_id: remote.vehicle_id,
            type: remote.type,
            interval_miles: remote.interval_miles,
            interval_months: remote.interval_months,
            last_service_date: remote.last_service_date,
            last_service_mileage: remote.last_service_mileage,
            next_due_date: remote.next_due_date,
            next_due_mileage: remote.next_due_mileage,
            notes: remote.notes,
          });
          await ReminderService.markSynced(remote.id, remote.id);
          result.pulled.reminders++;
        } else {
          result.conflicts.resolved++;
          const shouldUpdate = resolveConflict(existing as unknown as Record<string, unknown>, remote as unknown as Record<string, unknown>);
          
          if (shouldUpdate) {
            await ReminderService.update(existing.id, {
              vehicle_id: remote.vehicle_id,
              type: remote.type,
              interval_miles: remote.interval_miles,
              interval_months: remote.interval_months,
              last_service_date: remote.last_service_date,
              last_service_mileage: remote.last_service_mileage,
              next_due_date: remote.next_due_date,
              next_due_mileage: remote.next_due_mileage,
              notes: remote.notes,
            });
            await ReminderService.markSynced(existing.id, remote.id);
            result.pulled.reminders++;
            result.conflicts.remoteWins++;
          } else {
            await ReminderService.markSynced(existing.id, remote.id);
            result.conflicts.localWins++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Reminders sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncReceipts(result: SyncResult): Promise<void> {
    try {
      // Push
      const unsynced = await ReceiptService.getUnsynced();
      for (const receipt of unsynced) {
        try {
          const created = await apiService.receipts.create({
            vehicle_id: receipt.vehicle_id,
            maintenance_id: receipt.maintenance_id || undefined,
            date: receipt.date || undefined,
            vendor: receipt.vendor || undefined,
            amount: receipt.amount || undefined,
            category: receipt.category || undefined,
            notes: receipt.notes || undefined,
          });
          await ReceiptService.markSynced(receipt.id, created.id);
          result.pushed.receipts++;
        } catch (error) {
          result.errors.push(`Receipt ${receipt.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      // Pull with conflict resolution
      const remoteReceipts = await apiService.receipts.getAll();
      for (const remote of remoteReceipts) {
        const existing = await ReceiptService.getByRemoteId(remote.id);
        
        if (!existing) {
          await ReceiptService.create({
            vehicle_id: remote.vehicle_id,
            maintenance_id: remote.maintenance_id,
            date: remote.date,
            vendor: remote.vendor,
            amount: remote.amount,
            category: remote.category,
            notes: remote.notes,
            filename: remote.filename,
          });
          await ReceiptService.markSynced(remote.id, remote.id);
          result.pulled.receipts++;
        } else {
          result.conflicts.resolved++;
          const shouldUpdate = resolveConflict(existing as unknown as Record<string, unknown>, remote as unknown as Record<string, unknown>);
          
          if (shouldUpdate) {
            await ReceiptService.update(existing.id, {
              vehicle_id: remote.vehicle_id,
              maintenance_id: remote.maintenance_id,
              date: remote.date,
              vendor: remote.vendor,
              amount: remote.amount,
              category: remote.category,
              notes: remote.notes,
              filename: remote.filename,
            });
            await ReceiptService.markSynced(existing.id, remote.id);
            result.pulled.receipts++;
            result.conflicts.remoteWins++;
          } else {
            await ReceiptService.markSynced(existing.id, remote.id);
            result.conflicts.localWins++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Receipts sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncDocuments(result: SyncResult): Promise<void> {
    try {
      // Push
      const unsynced = await DocumentService.getUnsynced();
      for (const doc of unsynced) {
        try {
          const formData = new FormData();
          formData.append('vehicle_id', String(doc.vehicle_id));
          if (doc.maintenance_id) formData.append('maintenance_id', String(doc.maintenance_id));
          formData.append('title', doc.title);
          if (doc.description) formData.append('description', doc.description);
          if (doc.document_type) formData.append('document_type', doc.document_type);
          const created = await apiService.documents.create(formData);
          await DocumentService.markSynced(doc.id, created.id);
          result.pushed.documents++;
        } catch (error) {
          result.errors.push(`Document ${doc.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      // Pull with conflict resolution
      const remoteDocs = await apiService.documents.getAll();
      for (const remote of remoteDocs) {
        const existing = await DocumentService.getByRemoteId(remote.id);
        
        if (!existing) {
          await DocumentService.create({
            vehicle_id: remote.vehicle_id,
            maintenance_id: remote.maintenance_id,
            title: remote.title,
            description: remote.description,
            document_type: remote.document_type,
            filename: remote.filename,
            created_at: new Date().toISOString(),
          });
          await DocumentService.markSynced(remote.id, remote.id);
          result.pulled.documents++;
        } else {
          result.conflicts.resolved++;
          const shouldUpdate = resolveConflict(existing as unknown as Record<string, unknown>, remote as unknown as Record<string, unknown>);
          
          if (shouldUpdate) {
            await DocumentService.update(existing.id, {
              vehicle_id: remote.vehicle_id,
              maintenance_id: remote.maintenance_id,
              title: remote.title,
              description: remote.description,
              document_type: remote.document_type,
              filename: remote.filename,
            });
            await DocumentService.markSynced(existing.id, remote.id);
            result.pulled.documents++;
            result.conflicts.remoteWins++;
          } else {
            await DocumentService.markSynced(existing.id, remote.id);
            result.conflicts.localWins++;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Documents sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }
}

export const syncManager = SyncManager.getInstance();
export default syncManager;

