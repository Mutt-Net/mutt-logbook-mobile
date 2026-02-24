// Types matching Flask SQLAlchemy models

export interface Vehicle {
  id: number;
  name: string;
  make: string;
  model: string;
  reg: string | null;
  vin: string | null;
  year: number | null;
  engine: string | null;
  transmission: string | null;
  mileage: number;
  created_at: string;
}

export interface Maintenance {
  id: number;
  vehicle_id: number;
  date: string | null;
  mileage: number | null;
  category: string | null;
  description: string | null;
  parts_used: string | null;
  labor_hours: number | null;
  cost: number | null;
  shop_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface Mod {
  id: number;
  vehicle_id: number;
  date: string | null;
  mileage: number | null;
  category: string | null;
  description: string | null;
  parts: string | null;
  cost: number | null;
  status: 'planned' | 'in_progress' | 'completed';
  notes: string | null;
  created_at: string;
}

export interface Cost {
  id: number;
  vehicle_id: number;
  date: string | null;
  category: string | null;
  amount: number | null;
  description: string | null;
  created_at: string;
}

export interface Note {
  id: number;
  vehicle_id: number;
  date: string | null;
  title: string | null;
  content: string | null;
  tags: string | null;
  created_at: string;
}

export interface VCDSFault {
  id: number;
  vehicle_id: number;
  address: string | null;
  component: string | null;
  fault_code: string | null;
  description: string | null;
  status: 'active' | 'cleared';
  detected_date: string | null;
  cleared_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface Guide {
  id: number;
  vehicle_id: number | null;
  title: string;
  category: string | null;
  content: string | null;
  interval_miles: number | null;
  interval_months: number | null;
  is_template: boolean;
  created_at: string;
}

export interface VehiclePhoto {
  id: number;
  vehicle_id: number;
  filename: string | null;
  caption: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface FuelEntry {
  id: number;
  vehicle_id: number;
  date: string | null;
  mileage: number | null;
  gallons: number | null;
  price_per_gallon: number | null;
  total_cost: number | null;
  station: string | null;
  notes: string | null;
  created_at: string;
}

export interface Reminder {
  id: number;
  vehicle_id: number;
  type: string;
  interval_miles: number | null;
  interval_months: number | null;
  last_service_date: string | null;
  last_service_mileage: number | null;
  next_due_date: string | null;
  next_due_mileage: number | null;
  notes: string | null;
  created_at: string;
}

export interface Dashboard {
  total_spent: number;
  maintenance_cost: number;
  mods_cost: number;
  other_costs: number;
  recent_maintenance: Array<{
    date: string | null;
    category: string | null;
    description: string | null;
  }>;
  active_faults: number;
}

export interface Analytics {
  monthly_spending: Record<string, number>;
  yearly_spending: Record<string, number>;
  category_spending: Record<string, number>;
  total_spent: number;
  service_intervals: Record<string, { miles: number; months: number }>;
  last_service: Record<string, { date: string | null; mileage: number | null }>;
  current_mileage: number;
}

// Local syncable record type
export interface SyncableRecord<T> {
  data: T;
  synced: boolean;
  remote_id?: number;
  updated_at: string;
}

// Extension type for records with sync status
export interface WithSyncStatus {
  synced: number; // 0 = unsynced, 1 = synced
  remote_id?: number | null;
}

// Utility type to add sync status to any entity
export type SyncStatusEntity<T> = T & WithSyncStatus;

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Form types
export interface VehicleFormData {
  name?: string;
  make: string;
  model: string;
  reg?: string;
  vin?: string;
  year?: number;
  engine?: string;
  transmission?: string;
  mileage?: number;
}

export interface MaintenanceFormData {
  vehicle_id: number;
  date: string;
  mileage?: number;
  category?: string;
  description?: string;
  parts_used?: string[];
  labor_hours?: number;
  cost?: number;
  shop_name?: string;
  notes?: string;
}

export interface ModFormData {
  vehicle_id: number;
  date?: string;
  mileage?: number;
  category?: string;
  description?: string;
  parts?: string[];
  cost?: number;
  status?: 'planned' | 'in_progress' | 'completed';
  notes?: string;
}

export interface CostFormData {
  vehicle_id: number;
  date?: string;
  category?: string;
  amount?: number;
  description?: string;
}

export interface FuelFormData {
  vehicle_id: number;
  date?: string;
  mileage?: number;
  gallons?: number;
  price_per_gallon?: number;
  total_cost?: number;
  station?: string;
  notes?: string;
}

export interface Receipt {
  id: number;
  vehicle_id: number;
  maintenance_id: number | null;
  date: string | null;
  vendor: string | null;
  amount: number | null;
  category: string | null;
  notes: string | null;
  filename: string | null;
  created_at: string;
}

export interface Document {
  id: number;
  vehicle_id: number;
  maintenance_id: number | null;
  title: string;
  description: string | null;
  document_type: string | null;
  filename: string | null;
  uploaded_at: string;
  created_at: string;
}

export interface ReceiptFormData {
  vehicle_id: number;
  maintenance_id?: number;
  date?: string;
  vendor?: string;
  amount?: number;
  category?: string;
  notes?: string;
}

export interface DocumentFormData {
  vehicle_id: number;
  maintenance_id?: number;
  title: string;
  description?: string;
  document_type?: string;
}
