import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
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
  Dashboard,
  Analytics,
  VehicleFormData,
  MaintenanceFormData,
  ModFormData,
  CostFormData,
  FuelFormData,
} from '../types';

const BASE_URL = 'http://192.168.0.179:5000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const message = (error.response.data as { error?: string })?.error || 'An error occurred';
      throw new ApiError(error.response.status, message);
    } else if (error.request) {
      throw new ApiError(0, 'Network error - please check your connection');
    } else {
      throw new ApiError(0, error.message || 'An unexpected error occurred');
    }
  }
);

export const apiService = {
  // Vehicles
  vehicles: {
    getAll: async (): Promise<Vehicle[]> => {
      const response = await api.get<Vehicle[]>('/api/vehicles');
      return response.data;
    },
    create: async (data: VehicleFormData): Promise<Vehicle> => {
      const response = await api.post<Vehicle>('/api/vehicles', data);
      return response.data;
    },
    getById: async (id: number): Promise<Vehicle> => {
      const response = await api.get<Vehicle>(`/api/vehicles/${id}`);
      return response.data;
    },
    update: async (id: number, data: Partial<VehicleFormData>): Promise<Vehicle> => {
      const response = await api.put<Vehicle>(`/api/vehicles/${id}`, data);
      return response.data;
    },
    delete: async (id: number): Promise<void> => {
      await api.delete(`/api/vehicles/${id}`);
    },
  },

  // Maintenance
  maintenance: {
    getAll: async (vehicleId?: number): Promise<Maintenance[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      const response = await api.get<Maintenance[]>('/api/maintenance', { params });
      return response.data;
    },
    create: async (data: MaintenanceFormData): Promise<Maintenance> => {
      const response = await api.post<Maintenance>('/api/maintenance', data);
      return response.data;
    },
    update: async (id: number, data: Partial<MaintenanceFormData>): Promise<Maintenance> => {
      const response = await api.put<Maintenance>(`/api/maintenance/${id}`, data);
      return response.data;
    },
    delete: async (id: number): Promise<void> => {
      await api.delete(`/api/maintenance/${id}`);
    },
  },

  // Mods
  mods: {
    getAll: async (vehicleId?: number): Promise<Mod[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      const response = await api.get<Mod[]>('/api/mods', { params });
      return response.data;
    },
    create: async (data: ModFormData): Promise<Mod> => {
      const response = await api.post<Mod>('/api/mods', data);
      return response.data;
    },
    update: async (id: number, data: Partial<ModFormData>): Promise<Mod> => {
      const response = await api.put<Mod>(`/api/mods/${id}`, data);
      return response.data;
    },
    delete: async (id: number): Promise<void> => {
      await api.delete(`/api/mods/${id}`);
    },
  },

  // Costs
  costs: {
    getAll: async (vehicleId?: number): Promise<Cost[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      const response = await api.get<Cost[]>('/api/costs', { params });
      return response.data;
    },
    create: async (data: CostFormData): Promise<Cost> => {
      const response = await api.post<Cost>('/api/costs', data);
      return response.data;
    },
    getSummary: async (vehicleId?: number): Promise<{ total: number; by_category: Record<string, number> }> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      const response = await api.get<{ total: number; by_category: Record<string, number> }>('/api/costs/summary', { params });
      return response.data;
    },
  },

  // Notes
  notes: {
    getAll: async (vehicleId?: number): Promise<Note[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      const response = await api.get<Note[]>('/api/notes', { params });
      return response.data;
    },
    create: async (data: { vehicle_id: number; date?: string; title?: string; content?: string; tags?: string }): Promise<Note> => {
      const response = await api.post<Note>('/api/notes', data);
      return response.data;
    },
    delete: async (id: number): Promise<void> => {
      await api.delete(`/api/notes/${id}`);
    },
  },

  // VCDS
  vcds: {
    getAll: async (vehicleId?: number): Promise<VCDSFault[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      const response = await api.get<VCDSFault[]>('/api/vcds', { params });
      return response.data;
    },
    create: async (data: Omit<VCDSFault, 'id' | 'created_at'>): Promise<VCDSFault> => {
      const response = await api.post<VCDSFault>('/api/vcds', data);
      return response.data;
    },
    update: async (id: number, data: Partial<Omit<VCDSFault, 'id' | 'created_at'>>): Promise<VCDSFault> => {
      const response = await api.put<VCDSFault>(`/api/vcds/${id}`, data);
      return response.data;
    },
    parse: async (data: { raw_text: string }): Promise<{ faults: Partial<VCDSFault>[] }> => {
      const response = await api.post<{ faults: Partial<VCDSFault>[] }>('/api/vcds/parse', data);
      return response.data;
    },
    import: async (data: { faults: Partial<VCDSFault>[]; vehicle_id: number }): Promise<VCDSFault[]> => {
      const response = await api.post<VCDSFault[]>('/api/vcds/import', data);
      return response.data;
    },
  },

  // Guides
  guides: {
    getAll: async (vehicleId?: number): Promise<Guide[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      const response = await api.get<Guide[]>('/api/guides', { params });
      return response.data;
    },
    create: async (data: Omit<Guide, 'id' | 'created_at'>): Promise<Guide> => {
      const response = await api.post<Guide>('/api/guides', data);
      return response.data;
    },
    update: async (id: number, data: Partial<Omit<Guide, 'id' | 'created_at'>>): Promise<Guide> => {
      const response = await api.put<Guide>(`/api/guides/${id}`, data);
      return response.data;
    },
    delete: async (id: number): Promise<void> => {
      await api.delete(`/api/guides/${id}`);
    },
    getTemplates: async (): Promise<Guide[]> => {
      const response = await api.get<Guide[]>('/api/guides/templates');
      return response.data;
    },
    createTemplate: async (data: Omit<Guide, 'id' | 'created_at'>): Promise<Guide> => {
      const response = await api.post<Guide>('/api/guides/templates', data);
      return response.data;
    },
  },

  // Photos
  photos: {
    getAll: async (vehicleId?: number): Promise<VehiclePhoto[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      const response = await api.get<VehiclePhoto[]>('/api/vehicle-photos', { params });
      return response.data;
    },
    create: async (data: FormData): Promise<VehiclePhoto> => {
      const response = await api.post<VehiclePhoto>('/api/vehicle-photos', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
  },

  // Fuel
  fuel: {
    getAll: async (vehicleId?: number): Promise<FuelEntry[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      const response = await api.get<FuelEntry[]>('/api/fuel', { params });
      return response.data;
    },
    create: async (data: FuelFormData): Promise<FuelEntry> => {
      const response = await api.post<FuelEntry>('/api/fuel', data);
      return response.data;
    },
    update: async (id: number, data: Partial<FuelFormData>): Promise<FuelEntry> => {
      const response = await api.put<FuelEntry>(`/api/fuel/${id}`, data);
      return response.data;
    },
    delete: async (id: number): Promise<void> => {
      await api.delete(`/api/fuel/${id}`);
    },
  },

  // Reminders
  reminders: {
    getAll: async (vehicleId?: number): Promise<Reminder[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      const response = await api.get<Reminder[]>('/api/reminders', { params });
      return response.data;
    },
    create: async (data: Omit<Reminder, 'id' | 'created_at'>): Promise<Reminder> => {
      const response = await api.post<Reminder>('/api/reminders', data);
      return response.data;
    },
    update: async (id: number, data: Partial<Omit<Reminder, 'id' | 'created_at'>>): Promise<Reminder> => {
      const response = await api.put<Reminder>(`/api/reminders/${id}`, data);
      return response.data;
    },
    delete: async (id: number): Promise<void> => {
      await api.delete(`/api/reminders/${id}`);
    },
  },

  // Dashboard
  dashboard: {
    get: async (vehicleId?: number): Promise<Dashboard> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      const response = await api.get<Dashboard>('/api/dashboard', { params });
      return response.data;
    },
  },

  // Analytics
  analytics: {
    get: async (vehicleId?: number): Promise<Analytics> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      const response = await api.get<Analytics>('/api/analytics', { params });
      return response.data;
    },
  },

  // Upload
  upload: {
    file: async (file: { uri: string; name: string; type: string }): Promise<{ url: string }> => {
      const formData = new FormData();
      formData.append('file', file as any);
      const response = await api.post<{ url: string }>('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
  },
};

export { ApiError };
export default apiService;
