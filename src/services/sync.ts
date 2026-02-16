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
} from './database';
import apiService from './api';
import { addWifiListener, removeWifiListener } from './wifi';

const LAST_SYNC_KEY = 'last_sync_timestamp';
const HOME_WIFI_SSID = 'Mushroom Kingdom';

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
    console.warn('Failed to save last sync timestamp:', error);
  }
};

const getRemoteIdMap = (remoteData: { id: number }[]): Map<number, number> => {
  const map = new Map<number, number>();
  remoteData.forEach(item => {
    map.set(item.id, item.id);
  });
  return map;
};

class SyncManager {
  private static instance: SyncManager;
  private isAutoSyncEnabled = false;
  private isSyncing = false;

  private constructor() {}

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  startAutoSync(): void {
    if (this.isAutoSyncEnabled) return;

    this.isAutoSyncEnabled = true;
    addWifiListener(async (isHomeWifi) => {
      if (isHomeWifi && !this.isSyncing) {
        try {
          await this.syncAll();
        } catch (error) {
          console.warn('Auto-sync failed:', error);
        }
      }
    });
  }

  stopAutoSync(): void {
    this.isAutoSyncEnabled = false;
    removeWifiListener();
  }

  getLastSyncTime(): Promise<string | null> {
    return getLastSyncTimestamp();
  }

  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        pushed: { vehicles: 0, maintenance: 0, mods: 0, costs: 0, notes: 0, vcds: 0, guides: 0, photos: 0, fuel: 0, reminders: 0 },
        pulled: { vehicles: 0, maintenance: 0, mods: 0, costs: 0, notes: 0, vcds: 0, guides: 0, photos: 0, fuel: 0, reminders: 0 },
        errors: ['Sync already in progress'],
        timestamp: new Date().toISOString(),
      };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      pushed: { vehicles: 0, maintenance: 0, mods: 0, costs: 0, notes: 0, vcds: 0, guides: 0, photos: 0, fuel: 0, reminders: 0 },
      pulled: { vehicles: 0, maintenance: 0, mods: 0, costs: 0, notes: 0, vcds: 0, guides: 0, photos: 0, fuel: 0, reminders: 0 },
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

      await setLastSyncTimestamp(result.timestamp);
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  async syncVehicles(result: SyncResult): Promise<void> {
    try {
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

      const remoteVehicles = await apiService.vehicles.getAll();
      for (const remote of remoteVehicles) {
        const existing = await VehicleService.getById(remote.id);
        if (!existing) {
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
        }
      }
    } catch (error) {
      result.errors.push(`Vehicles sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncMaintenance(result: SyncResult): Promise<void> {
    try {
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

      const remoteMaintenance = await apiService.maintenance.getAll();
      for (const remote of remoteMaintenance) {
        const existing = await MaintenanceService.getById(remote.id);
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
        }
      }
    } catch (error) {
      result.errors.push(`Maintenance sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncMods(result: SyncResult): Promise<void> {
    try {
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

      const remoteMods = await apiService.mods.getAll();
      for (const remote of remoteMods) {
        const existing = await ModService.getById(remote.id);
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
        }
      }
    } catch (error) {
      result.errors.push(`Mods sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncCosts(result: SyncResult): Promise<void> {
    try {
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

      const remoteCosts = await apiService.costs.getAll();
      for (const remote of remoteCosts) {
        const existing = await CostService.getById(remote.id);
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
        }
      }
    } catch (error) {
      result.errors.push(`Costs sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncNotes(result: SyncResult): Promise<void> {
    try {
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

      const remoteNotes = await apiService.notes.getAll();
      for (const remote of remoteNotes) {
        const existing = await NoteService.getById(remote.id);
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
        }
      }
    } catch (error) {
      result.errors.push(`Notes sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncVCDS(result: SyncResult): Promise<void> {
    try {
      const unsynced = await VCDSFaultService.getUnsynced();
      for (const fault of unsynced) {
        try {
          const created = await apiService.vcds.create({
            vehicle_id: fault.vehicle_id,
            address: fault.address || undefined,
            component: fault.component || undefined,
            fault_code: fault.fault_code || undefined,
            description: fault.description || undefined,
            status: fault.status || 'active',
            detected_date: fault.detected_date || undefined,
            cleared_date: fault.cleared_date || undefined,
            notes: fault.notes || undefined,
          });
          await VCDSFaultService.markSynced(fault.id, created.id);
          result.pushed.vcds++;
        } catch (error) {
          result.errors.push(`VCDS Fault ${fault.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      const remoteFaults = await apiService.vcds.getAll();
      for (const remote of remoteFaults) {
        const existing = await VCDSFaultService.getById(remote.id);
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
        }
      }
    } catch (error) {
      result.errors.push(`VCDS sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncGuides(result: SyncResult): Promise<void> {
    try {
      const unsynced = await GuideService.getUnsynced();
      for (const guide of unsynced) {
        try {
          const created = await apiService.guides.create({
            vehicle_id: guide.vehicle_id || undefined,
            title: guide.title,
            category: guide.category || undefined,
            content: guide.content || undefined,
            interval_miles: guide.interval_miles || undefined,
            interval_months: guide.interval_months || undefined,
            is_template: guide.is_template,
          });
          await GuideService.markSynced(guide.id, created.id);
          result.pushed.guides++;
        } catch (error) {
          result.errors.push(`Guide ${guide.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      const remoteGuides = await apiService.guides.getAll();
      for (const remote of remoteGuides) {
        const existing = await GuideService.getById(remote.id);
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
        }
      }
    } catch (error) {
      result.errors.push(`Guides sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncPhotos(result: SyncResult): Promise<void> {
    try {
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

      const remotePhotos = await apiService.photos.getAll();
      for (const remote of remotePhotos) {
        const existing = await VehiclePhotoService.getById(remote.id);
        if (!existing) {
          await VehiclePhotoService.create({
            vehicle_id: remote.vehicle_id,
            filename: remote.filename,
            caption: remote.caption,
            is_primary: remote.is_primary,
          });
          await VehiclePhotoService.markSynced(remote.id, remote.id);
          result.pulled.photos++;
        }
      }
    } catch (error) {
      result.errors.push(`Photos sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncFuel(result: SyncResult): Promise<void> {
    try {
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

      const remoteFuel = await apiService.fuel.getAll();
      for (const remote of remoteFuel) {
        const existing = await FuelEntryService.getById(remote.id);
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
        }
      }
    } catch (error) {
      result.errors.push(`Fuel sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }

  async syncReminders(result: SyncResult): Promise<void> {
    try {
      const unsynced = await ReminderService.getUnsynced();
      for (const reminder of unsynced) {
        try {
          const created = await apiService.reminders.create({
            vehicle_id: reminder.vehicle_id,
            type: reminder.type,
            interval_miles: reminder.interval_miles || undefined,
            interval_months: reminder.interval_months || undefined,
            last_service_date: reminder.last_service_date || undefined,
            last_service_mileage: reminder.last_service_mileage || undefined,
            next_due_date: reminder.next_due_date || undefined,
            next_due_mileage: reminder.next_due_mileage || undefined,
            notes: reminder.notes || undefined,
          });
          await ReminderService.markSynced(reminder.id, created.id);
          result.pushed.reminders++;
        } catch (error) {
          result.errors.push(`Reminder ${reminder.id}: ${error instanceof Error ? error.message : 'Failed to sync'}`);
        }
      }

      const remoteReminders = await apiService.reminders.getAll();
      for (const remote of remoteReminders) {
        const existing = await ReminderService.getById(remote.id);
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
        }
      }
    } catch (error) {
      result.errors.push(`Reminders sync: ${error instanceof Error ? error.message : 'Failed'}`);
    }
  }
}

export const syncManager = SyncManager.getInstance();
export default syncManager;
