import * as SQLite from 'expo-sqlite';
import {
  Vehicle,
  Maintenance,
  Mod,
  Cost,
  Note,
  VCDSFault,
  Guide,
  VehiclePhoto,
  FuelEntry,
  Reminder,
} from '../types';

const DATABASE_NAME = 'muttlogbook.db';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  return db;
};

export const initDatabase = async (): Promise<void> => {
  const database = await getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      reg TEXT,
      vin TEXT,
      year INTEGER,
      engine TEXT,
      transmission TEXT,
      mileage INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      remote_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      date TEXT,
      mileage INTEGER,
      category TEXT,
      description TEXT,
      parts_used TEXT,
      labor_hours REAL,
      cost REAL,
      shop_name TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      remote_id INTEGER,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      date TEXT,
      mileage INTEGER,
      category TEXT,
      description TEXT,
      parts TEXT,
      cost REAL,
      status TEXT NOT NULL DEFAULT 'planned',
      notes TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      remote_id INTEGER,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      date TEXT,
      category TEXT,
      amount REAL,
      description TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      remote_id INTEGER,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      date TEXT,
      title TEXT,
      content TEXT,
      tags TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      remote_id INTEGER,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vcds_faults (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      address TEXT,
      component TEXT,
      fault_code TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      detected_date TEXT,
      cleared_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      remote_id INTEGER,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER,
      title TEXT NOT NULL,
      category TEXT,
      content TEXT,
      interval_miles INTEGER,
      interval_months INTEGER,
      is_template INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      remote_id INTEGER,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vehicle_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      filename TEXT,
      caption TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      remote_id INTEGER,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fuel_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      date TEXT,
      mileage INTEGER,
      gallons REAL,
      price_per_gallon REAL,
      total_cost REAL,
      station TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      remote_id INTEGER,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      interval_miles INTEGER,
      interval_months INTEGER,
      last_service_date TEXT,
      last_service_mileage INTEGER,
      next_due_date TEXT,
      next_due_mileage INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      remote_id INTEGER,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance(date DESC);
    CREATE INDEX IF NOT EXISTS idx_costs_vehicle_id ON costs(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_mods_vehicle_id ON mods(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_notes_vehicle_id ON notes(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_vcds_faults_vehicle_id ON vcds_faults(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_fuel_entries_vehicle_id ON fuel_entries(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_vehicle_id ON reminders(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_guides_vehicle_id ON guides(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle_id ON vehicle_photos(vehicle_id);
  `);
};

const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

const mapSynced = (row: Record<string, unknown>): Record<string, unknown> => {
  return {
    ...row,
    synced: row.synced === 1,
  };
};

export const VehicleService = {
  async create(vehicle: Omit<Vehicle, 'id' | 'created_at'>): Promise<number> {
    const database = await getDatabase();
    const created_at = getCurrentTimestamp();
    const result = await database.runAsync(
      `INSERT INTO vehicles (name, make, model, reg, vin, year, engine, transmission, mileage, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        vehicle.name,
        vehicle.make,
        vehicle.model,
        vehicle.reg,
        vehicle.vin,
        vehicle.year,
        vehicle.engine,
        vehicle.transmission,
        vehicle.mileage,
        created_at,
      ]
    );
    return result.lastInsertRowId;
  },

  async getAll(): Promise<Vehicle[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM vehicles ORDER BY created_at DESC'
    );
    return rows.map(row => mapSynced(row) as unknown as Vehicle);
  },

  async getById(id: number): Promise<Vehicle | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM vehicles WHERE id = ?',
      [id]
    );
    return row ? (mapSynced(row) as unknown as Vehicle) : null;
  },

  async update(
    id: number,
    vehicle: Partial<Omit<Vehicle, 'id' | 'created_at'>>
  ): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(vehicle).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      fields.push('synced = 0');
      values.push(id);
      await database.runAsync(
        `UPDATE vehicles SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  async delete(id: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM vehicles WHERE id = ?', [id]);
  },

  async getUnsynced(): Promise<Vehicle[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM vehicles WHERE synced = 0'
    );
    return rows.map(row => mapSynced(row) as unknown as Vehicle);
  },

  async markSynced(id: number, remoteId: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE vehicles SET synced = 1, remote_id = ? WHERE id = ?',
      [remoteId, id]
    );
  },
};

export const MaintenanceService = {
  async create(
    maintenance: Omit<Maintenance, 'id' | 'created_at'>
  ): Promise<number> {
    const database = await getDatabase();
    const created_at = getCurrentTimestamp();
    const result = await database.runAsync(
      `INSERT INTO maintenance (vehicle_id, date, mileage, category, description, parts_used, labor_hours, cost, shop_name, notes, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        maintenance.vehicle_id,
        maintenance.date,
        maintenance.mileage,
        maintenance.category,
        maintenance.description,
        maintenance.parts_used,
        maintenance.labor_hours,
        maintenance.cost,
        maintenance.shop_name,
        maintenance.notes,
        created_at,
      ]
    );
    return result.lastInsertRowId;
  },

  async getAll(): Promise<Maintenance[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM maintenance ORDER BY created_at DESC'
    );
    return rows.map(row => mapSynced(row) as unknown as Maintenance);
  },

  async getById(id: number): Promise<Maintenance | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM maintenance WHERE id = ?',
      [id]
    );
    return row ? (mapSynced(row) as unknown as Maintenance) : null;
  },

  async getByVehicle(vehicleId: number): Promise<Maintenance[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM maintenance WHERE vehicle_id = ? ORDER BY date DESC, created_at DESC',
      [vehicleId]
    );
    return rows.map(row => mapSynced(row) as unknown as Maintenance);
  },

  async update(
    id: number,
    maintenance: Partial<Omit<Maintenance, 'id' | 'created_at'>>
  ): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(maintenance).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      fields.push('synced = 0');
      values.push(id);
      await database.runAsync(
        `UPDATE maintenance SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  async delete(id: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM maintenance WHERE id = ?', [id]);
  },

  async getUnsynced(): Promise<Maintenance[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM maintenance WHERE synced = 0'
    );
    return rows.map(row => mapSynced(row) as unknown as Maintenance);
  },

  async markSynced(id: number, remoteId: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE maintenance SET synced = 1, remote_id = ? WHERE id = ?',
      [remoteId, id]
    );
  },
};

export const ModService = {
  async create(mod: Omit<Mod, 'id' | 'created_at'>): Promise<number> {
    const database = await getDatabase();
    const created_at = getCurrentTimestamp();
    const result = await database.runAsync(
      `INSERT INTO mods (vehicle_id, date, mileage, category, description, parts, cost, status, notes, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        mod.vehicle_id,
        mod.date,
        mod.mileage,
        mod.category,
        mod.description,
        mod.parts,
        mod.cost,
        mod.status,
        mod.notes,
        created_at,
      ]
    );
    return result.lastInsertRowId;
  },

  async getAll(): Promise<Mod[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM mods ORDER BY created_at DESC'
    );
    return rows.map(row => mapSynced(row) as unknown as Mod);
  },

  async getById(id: number): Promise<Mod | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM mods WHERE id = ?',
      [id]
    );
    return row ? (mapSynced(row) as unknown as Mod) : null;
  },

  async getByVehicle(vehicleId: number): Promise<Mod[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM mods WHERE vehicle_id = ? ORDER BY date DESC, created_at DESC',
      [vehicleId]
    );
    return rows.map(row => mapSynced(row) as unknown as Mod);
  },

  async update(id: number, mod: Partial<Omit<Mod, 'id' | 'created_at'>>): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(mod).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      fields.push('synced = 0');
      values.push(id);
      await database.runAsync(
        `UPDATE mods SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  async delete(id: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM mods WHERE id = ?', [id]);
  },

  async getUnsynced(): Promise<Mod[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM mods WHERE synced = 0'
    );
    return rows.map(row => mapSynced(row) as unknown as Mod);
  },

  async markSynced(id: number, remoteId: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE mods SET synced = 1, remote_id = ? WHERE id = ?',
      [remoteId, id]
    );
  },
};

export const CostService = {
  async create(cost: Omit<Cost, 'id' | 'created_at'>): Promise<number> {
    const database = await getDatabase();
    const created_at = getCurrentTimestamp();
    const result = await database.runAsync(
      `INSERT INTO costs (vehicle_id, date, category, amount, description, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        cost.vehicle_id,
        cost.date,
        cost.category,
        cost.amount,
        cost.description,
        created_at,
      ]
    );
    return result.lastInsertRowId;
  },

  async getAll(): Promise<Cost[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM costs ORDER BY created_at DESC'
    );
    return rows.map(row => mapSynced(row) as unknown as Cost);
  },

  async getById(id: number): Promise<Cost | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM costs WHERE id = ?',
      [id]
    );
    return row ? (mapSynced(row) as unknown as Cost) : null;
  },

  async getByVehicle(vehicleId: number): Promise<Cost[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM costs WHERE vehicle_id = ? ORDER BY date DESC, created_at DESC',
      [vehicleId]
    );
    return rows.map(row => mapSynced(row) as unknown as Cost);
  },

  async update(
    id: number,
    cost: Partial<Omit<Cost, 'id' | 'created_at'>>
  ): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(cost).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      fields.push('synced = 0');
      values.push(id);
      await database.runAsync(
        `UPDATE costs SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  async delete(id: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM costs WHERE id = ?', [id]);
  },

  async getUnsynced(): Promise<Cost[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM costs WHERE synced = 0'
    );
    return rows.map(row => mapSynced(row) as unknown as Cost);
  },

  async markSynced(id: number, remoteId: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE costs SET synced = 1, remote_id = ? WHERE id = ?',
      [remoteId, id]
    );
  },
};

export const NoteService = {
  async create(note: Omit<Note, 'id' | 'created_at'>): Promise<number> {
    const database = await getDatabase();
    const created_at = getCurrentTimestamp();
    const result = await database.runAsync(
      `INSERT INTO notes (vehicle_id, date, title, content, tags, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        note.vehicle_id,
        note.date,
        note.title,
        note.content,
        note.tags,
        created_at,
      ]
    );
    return result.lastInsertRowId;
  },

  async getAll(): Promise<Note[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM notes ORDER BY created_at DESC'
    );
    return rows.map(row => mapSynced(row) as unknown as Note);
  },

  async getById(id: number): Promise<Note | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM notes WHERE id = ?',
      [id]
    );
    return row ? (mapSynced(row) as unknown as Note) : null;
  },

  async getByVehicle(vehicleId: number): Promise<Note[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM notes WHERE vehicle_id = ? ORDER BY date DESC, created_at DESC',
      [vehicleId]
    );
    return rows.map(row => mapSynced(row) as unknown as Note);
  },

  async update(id: number, note: Partial<Omit<Note, 'id' | 'created_at'>>): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(note).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      fields.push('synced = 0');
      values.push(id);
      await database.runAsync(
        `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  async delete(id: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  },

  async getUnsynced(): Promise<Note[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM notes WHERE synced = 0'
    );
    return rows.map(row => mapSynced(row) as unknown as Note);
  },

  async markSynced(id: number, remoteId: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE notes SET synced = 1, remote_id = ? WHERE id = ?',
      [remoteId, id]
    );
  },
};

export const VCDSFaultService = {
  async create(fault: Omit<VCDSFault, 'id' | 'created_at'>): Promise<number> {
    const database = await getDatabase();
    const created_at = getCurrentTimestamp();
    const result = await database.runAsync(
      `INSERT INTO vcds_faults (vehicle_id, address, component, fault_code, description, status, detected_date, cleared_date, notes, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        fault.vehicle_id,
        fault.address,
        fault.component,
        fault.fault_code,
        fault.description,
        fault.status,
        fault.detected_date,
        fault.cleared_date,
        fault.notes,
        created_at,
      ]
    );
    return result.lastInsertRowId;
  },

  async getAll(): Promise<VCDSFault[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM vcds_faults ORDER BY detected_date DESC, created_at DESC'
    );
    return rows.map(row => mapSynced(row) as unknown as VCDSFault);
  },

  async getById(id: number): Promise<VCDSFault | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM vcds_faults WHERE id = ?',
      [id]
    );
    return row ? (mapSynced(row) as unknown as VCDSFault) : null;
  },

  async getByVehicle(vehicleId: number): Promise<VCDSFault[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM vcds_faults WHERE vehicle_id = ? ORDER BY detected_date DESC, created_at DESC',
      [vehicleId]
    );
    return rows.map(row => mapSynced(row) as unknown as VCDSFault);
  },

  async update(
    id: number,
    fault: Partial<Omit<VCDSFault, 'id' | 'created_at'>>
  ): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(fault).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      fields.push('synced = 0');
      values.push(id);
      await database.runAsync(
        `UPDATE vcds_faults SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  async delete(id: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM vcds_faults WHERE id = ?', [id]);
  },

  async getUnsynced(): Promise<VCDSFault[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM vcds_faults WHERE synced = 0'
    );
    return rows.map(row => mapSynced(row) as unknown as VCDSFault);
  },

  async markSynced(id: number, remoteId: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE vcds_faults SET synced = 1, remote_id = ? WHERE id = ?',
      [remoteId, id]
    );
  },
};

export const GuideService = {
  async create(guide: Omit<Guide, 'id' | 'created_at'>): Promise<number> {
    const database = await getDatabase();
    const created_at = getCurrentTimestamp();
    const result = await database.runAsync(
      `INSERT INTO guides (vehicle_id, title, category, content, interval_miles, interval_months, is_template, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        guide.vehicle_id,
        guide.title,
        guide.category,
        guide.content,
        guide.interval_miles,
        guide.interval_months,
        guide.is_template ? 1 : 0,
        created_at,
      ]
    );
    return result.lastInsertRowId;
  },

  async getAll(): Promise<Guide[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM guides ORDER BY created_at DESC'
    );
    return rows.map(row => ({
      ...mapSynced(row),
      is_template: row.is_template === 1,
    })) as unknown as Guide;
  },

  async getById(id: number): Promise<Guide | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM guides WHERE id = ?',
      [id]
    );
    if (!row) return null;
    return {
      ...mapSynced(row),
      is_template: row.is_template === 1,
    } as unknown as Guide;
  },

  async getByVehicle(vehicleId: number): Promise<Guide[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM guides WHERE vehicle_id = ? OR is_template = 1 ORDER BY is_template ASC, created_at DESC',
      [vehicleId]
    );
    return rows.map(row => ({
      ...mapSynced(row),
      is_template: row.is_template === 1,
    })) as unknown as Guide;
  },

  async getTemplates(): Promise<Guide[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM guides WHERE is_template = 1 ORDER BY created_at DESC'
    );
    return rows.map(row => ({
      ...mapSynced(row),
      is_template: true,
    })) as unknown as Guide;
  },

  async update(
    id: number,
    guide: Partial<Omit<Guide, 'id' | 'created_at'>>
  ): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(guide).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'is_template') {
          fields.push(`${key} = ?`);
          values.push(value ? 1 : 0);
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    if (fields.length > 0) {
      fields.push('synced = 0');
      values.push(id);
      await database.runAsync(
        `UPDATE guides SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  async delete(id: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM guides WHERE id = ?', [id]);
  },

  async getUnsynced(): Promise<Guide[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM guides WHERE synced = 0'
    );
    return rows.map(row => ({
      ...mapSynced(row),
      is_template: row.is_template === 1,
    })) as unknown as Guide;
  },

  async markSynced(id: number, remoteId: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE guides SET synced = 1, remote_id = ? WHERE id = ?',
      [remoteId, id]
    );
  },
};

export const VehiclePhotoService = {
  async create(photo: Omit<VehiclePhoto, 'id' | 'created_at'>): Promise<number> {
    const database = await getDatabase();
    const created_at = getCurrentTimestamp();
    const result = await database.runAsync(
      `INSERT INTO vehicle_photos (vehicle_id, filename, caption, is_primary, created_at, synced)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [
        photo.vehicle_id,
        photo.filename,
        photo.caption,
        photo.is_primary ? 1 : 0,
        created_at,
      ]
    );
    return result.lastInsertRowId;
  },

  async getAll(): Promise<VehiclePhoto[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM vehicle_photos ORDER BY created_at DESC'
    );
    return rows.map(row => ({
      ...mapSynced(row),
      is_primary: row.is_primary === 1,
    })) as unknown as VehiclePhoto;
  },

  async getById(id: number): Promise<VehiclePhoto | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM vehicle_photos WHERE id = ?',
      [id]
    );
    if (!row) return null;
    return {
      ...mapSynced(row),
      is_primary: row.is_primary === 1,
    } as unknown as VehiclePhoto;
  },

  async getByVehicle(vehicleId: number): Promise<VehiclePhoto[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM vehicle_photos WHERE vehicle_id = ? ORDER BY is_primary DESC, created_at DESC',
      [vehicleId]
    );
    return rows.map(row => ({
      ...mapSynced(row),
      is_primary: row.is_primary === 1,
    })) as unknown as VehiclePhoto;
  },

  async getPrimaryByVehicle(vehicleId: number): Promise<VehiclePhoto | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM vehicle_photos WHERE vehicle_id = ? AND is_primary = 1',
      [vehicleId]
    );
    if (!row) return null;
    return {
      ...mapSynced(row),
      is_primary: true,
    } as unknown as VehiclePhoto;
  },

  async update(
    id: number,
    photo: Partial<Omit<VehiclePhoto, 'id' | 'created_at'>>
  ): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(photo).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'is_primary') {
          fields.push(`${key} = ?`);
          values.push(value ? 1 : 0);
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    if (fields.length > 0) {
      fields.push('synced = 0');
      values.push(id);
      await database.runAsync(
        `UPDATE vehicle_photos SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  async delete(id: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM vehicle_photos WHERE id = ?', [id]);
  },

  async setPrimary(vehicleId: number, photoId: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE vehicle_photos SET is_primary = 0 WHERE vehicle_id = ?',
      [vehicleId]
    );
    await database.runAsync(
      'UPDATE vehicle_photos SET is_primary = 1, synced = 0 WHERE id = ?',
      [photoId]
    );
  },

  async getUnsynced(): Promise<VehiclePhoto[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM vehicle_photos WHERE synced = 0'
    );
    return rows.map(row => ({
      ...mapSynced(row),
      is_primary: row.is_primary === 1,
    })) as unknown as VehiclePhoto;
  },

  async markSynced(id: number, remoteId: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE vehicle_photos SET synced = 1, remote_id = ? WHERE id = ?',
      [remoteId, id]
    );
  },
};

export const FuelEntryService = {
  async create(entry: Omit<FuelEntry, 'id' | 'created_at'>): Promise<number> {
    const database = await getDatabase();
    const created_at = getCurrentTimestamp();
    const result = await database.runAsync(
      `INSERT INTO fuel_entries (vehicle_id, date, mileage, gallons, price_per_gallon, total_cost, station, notes, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        entry.vehicle_id,
        entry.date,
        entry.mileage,
        entry.gallons,
        entry.price_per_gallon,
        entry.total_cost,
        entry.station,
        entry.notes,
        created_at,
      ]
    );
    return result.lastInsertRowId;
  },

  async getAll(): Promise<FuelEntry[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM fuel_entries ORDER BY date DESC, created_at DESC'
    );
    return rows.map(row => mapSynced(row) as unknown as FuelEntry);
  },

  async getById(id: number): Promise<FuelEntry | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM fuel_entries WHERE id = ?',
      [id]
    );
    return row ? (mapSynced(row) as unknown as FuelEntry) : null;
  },

  async getByVehicle(vehicleId: number): Promise<FuelEntry[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM fuel_entries WHERE vehicle_id = ? ORDER BY date DESC, created_at DESC',
      [vehicleId]
    );
    return rows.map(row => mapSynced(row) as unknown as FuelEntry);
  },

  async update(
    id: number,
    entry: Partial<Omit<FuelEntry, 'id' | 'created_at'>>
  ): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(entry).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      fields.push('synced = 0');
      values.push(id);
      await database.runAsync(
        `UPDATE fuel_entries SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  async delete(id: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM fuel_entries WHERE id = ?', [id]);
  },

  async getUnsynced(): Promise<FuelEntry[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM fuel_entries WHERE synced = 0'
    );
    return rows.map(row => mapSynced(row) as unknown as FuelEntry);
  },

  async markSynced(id: number, remoteId: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE fuel_entries SET synced = 1, remote_id = ? WHERE id = ?',
      [remoteId, id]
    );
  },
};

export const ReminderService = {
  async create(reminder: Omit<Reminder, 'id' | 'created_at'>): Promise<number> {
    const database = await getDatabase();
    const created_at = getCurrentTimestamp();
    const result = await database.runAsync(
      `INSERT INTO reminders (vehicle_id, type, interval_miles, interval_months, last_service_date, last_service_mileage, next_due_date, next_due_mileage, notes, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        reminder.vehicle_id,
        reminder.type,
        reminder.interval_miles,
        reminder.interval_months,
        reminder.last_service_date,
        reminder.last_service_mileage,
        reminder.next_due_date,
        reminder.next_due_mileage,
        reminder.notes,
        created_at,
      ]
    );
    return result.lastInsertRowId;
  },

  async getAll(): Promise<Reminder[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM reminders ORDER BY next_due_date ASC, created_at DESC'
    );
    return rows.map(row => mapSynced(row) as unknown as Reminder);
  },

  async getById(id: number): Promise<Reminder | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM reminders WHERE id = ?',
      [id]
    );
    return row ? (mapSynced(row) as unknown as Reminder) : null;
  },

  async getByVehicle(vehicleId: number): Promise<Reminder[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM reminders WHERE vehicle_id = ? ORDER BY next_due_date ASC, created_at DESC',
      [vehicleId]
    );
    return rows.map(row => mapSynced(row) as unknown as Reminder);
  },

  async update(
    id: number,
    reminder: Partial<Omit<Reminder, 'id' | 'created_at'>>
  ): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(reminder).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      fields.push('synced = 0');
      values.push(id);
      await database.runAsync(
        `UPDATE reminders SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  async delete(id: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
  },

  async getUnsynced(): Promise<Reminder[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM reminders WHERE synced = 0'
    );
    return rows.map(row => mapSynced(row) as unknown as Reminder);
  },

  async markSynced(id: number, remoteId: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      'UPDATE reminders SET synced = 1, remote_id = ? WHERE id = ?',
      [remoteId, id]
    );
  },
};

export const SyncService = {
  async getAllUnsynced() {
    const [
      vehicles,
      maintenance,
      mods,
      costs,
      notes,
      faults,
      guides,
      photos,
      fuelEntries,
      reminders,
    ] = await Promise.all([
      VehicleService.getUnsynced(),
      MaintenanceService.getUnsynced(),
      ModService.getUnsynced(),
      CostService.getUnsynced(),
      NoteService.getUnsynced(),
      VCDSFaultService.getUnsynced(),
      GuideService.getUnsynced(),
      VehiclePhotoService.getUnsynced(),
      FuelEntryService.getUnsynced(),
      ReminderService.getUnsynced(),
    ]);

    return {
      vehicles,
      maintenance,
      mods,
      costs,
      notes,
      faults,
      guides,
      photos,
      fuelEntries,
      reminders,
    };
  },
};

export default {
  initDatabase,
  getDatabase,
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
  SyncService,
};
