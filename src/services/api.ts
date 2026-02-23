import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
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
import { configService } from './config';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

let apiInstance: AxiosInstance | null = null;

const getApiInstance = async (): Promise<AxiosInstance> => {
  if (apiInstance) {
    return apiInstance;
  }

  const baseUrl = await configService.getApiUrl();
  if (!baseUrl) {
    throw new Error('API URL not configured');
  }

  apiInstance = axios.create({
    baseURL: baseUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  apiInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    return config;
  });

  apiInstance.interceptors.response.use(
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

  return apiInstance;
};

const api = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const instance = await getApiInstance();
    const response = await instance.get<T>(url, config);
    return response.data;
  },
  post: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const instance = await getApiInstance();
    const response = await instance.post<T>(url, data, config);
    return response.data;
  },
  put: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const instance = await getApiInstance();
    const response = await instance.put<T>(url, data, config);
    return response.data;
  },
  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const instance = await getApiInstance();
    const response = await instance.delete<T>(url, config);
    return response.data;
  },
};

export const apiService = {
  // Vehicles
  vehicles: {
    getAll: async (): Promise<Vehicle[]> => {
      return api.get<Vehicle[]>('/api/vehicles');
    },
    create: async (data: VehicleFormData): Promise<Vehicle> => {
      return api.post<Vehicle>('/api/vehicles', data);
    },
    getById: async (id: number): Promise<Vehicle> => {
      return api.get<Vehicle>(`/api/vehicles/${id}`);
    },
    update: async (id: number, data: Partial<VehicleFormData>): Promise<Vehicle> => {
      return api.put<Vehicle>(`/api/vehicles/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
      return api.delete(`/api/vehicles/${id}`);
    },
    export: async (id: number): Promise<any> => {
      return api.get<any>(`/api/vehicles/${id}/export`);
    },
    import: async (data: any): Promise<{ id: number }> => {
      return api.post<{ id: number }>('/api/vehicles/import', data);
    },
  },

  // Maintenance
  maintenance: {
    getAll: async (vehicleId?: number): Promise<Maintenance[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<Maintenance[]>('/api/maintenance', { params });
    },
    getTimeline: async (vehicleId: number): Promise<any[]> => {
      const params = { vehicle_id: vehicleId };
      return api.get<any[]>('/api/maintenance/timeline', { params });
    },
    create: async (data: MaintenanceFormData): Promise<Maintenance> => {
      return api.post<Maintenance>('/api/maintenance', data);
    },
    update: async (id: number, data: Partial<MaintenanceFormData>): Promise<Maintenance> => {
      return api.put<Maintenance>(`/api/maintenance/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
      return api.delete(`/api/maintenance/${id}`);
    },
  },

  // Mods
  mods: {
    getAll: async (vehicleId?: number): Promise<Mod[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<Mod[]>('/api/mods', { params });
    },
    create: async (data: ModFormData): Promise<Mod> => {
      return api.post<Mod>('/api/mods', data);
    },
    update: async (id: number, data: Partial<ModFormData>): Promise<Mod> => {
      return api.put<Mod>(`/api/mods/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
      return api.delete(`/api/mods/${id}`);
    },
  },

  // Costs
  costs: {
    getAll: async (vehicleId?: number): Promise<Cost[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<Cost[]>('/api/costs', { params });
    },
    create: async (data: CostFormData): Promise<Cost> => {
      return api.post<Cost>('/api/costs', data);
    },
    getSummary: async (vehicleId?: number): Promise<{ total: number; by_category: Record<string, number> }> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<{ total: number; by_category: Record<string, number> }>('/api/costs/summary', { params });
    },
  },

  // Notes
  notes: {
    getAll: async (vehicleId?: number): Promise<Note[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<Note[]>('/api/notes', { params });
    },
    create: async (data: { vehicle_id: number; date?: string; title?: string; content?: string; tags?: string }): Promise<Note> => {
      return api.post<Note>('/api/notes', data);
    },
    delete: async (id: number): Promise<void> => {
      return api.delete(`/api/notes/${id}`);
    },
  },

  // VCDS
  vcds: {
    getAll: async (vehicleId?: number): Promise<VCDSFault[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<VCDSFault[]>('/api/vcds', { params });
    },
    create: async (data: Omit<VCDSFault, 'id' | 'created_at'>): Promise<VCDSFault> => {
      return api.post<VCDSFault>('/api/vcds', data);
    },
    update: async (id: number, data: Partial<Omit<VCDSFault, 'id' | 'created_at'>>): Promise<VCDSFault> => {
      return api.put<VCDSFault>(`/api/vcds/${id}`, data);
    },
    parse: async (data: { raw_text: string }): Promise<{ faults: Partial<VCDSFault>[] }> => {
      return api.post<{ faults: Partial<VCDSFault>[] }>('/api/vcds/parse', data);
    },
    import: async (data: { faults: Partial<VCDSFault>[]; vehicle_id: number }): Promise<VCDSFault[]> => {
      return api.post<VCDSFault[]>('/api/vcds/import', data);
    },
  },

  // Guides
  guides: {
    getAll: async (vehicleId?: number): Promise<Guide[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<Guide[]>('/api/guides', { params });
    },
    create: async (data: Omit<Guide, 'id' | 'created_at'>): Promise<Guide> => {
      return api.post<Guide>('/api/guides', data);
    },
    update: async (id: number, data: Partial<Omit<Guide, 'id' | 'created_at'>>): Promise<Guide> => {
      return api.put<Guide>(`/api/guides/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
      return api.delete(`/api/guides/${id}`);
    },
    getTemplates: async (): Promise<Guide[]> => {
      return api.get<Guide[]>('/api/guides/templates');
    },
    createTemplate: async (data: Omit<Guide, 'id' | 'created_at'>): Promise<Guide> => {
      return api.post<Guide>('/api/guides/templates', data);
    },
  },

  // Photos
  photos: {
    getAll: async (vehicleId?: number): Promise<VehiclePhoto[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<VehiclePhoto[]>('/api/vehicle-photos', { params });
    },
    create: async (data: FormData): Promise<VehiclePhoto> => {
      return api.post<VehiclePhoto>('/api/vehicle-photos', data);
    },
  },

  // Fuel
  fuel: {
    getAll: async (vehicleId?: number): Promise<FuelEntry[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<FuelEntry[]>('/api/fuel', { params });
    },
    create: async (data: FuelFormData): Promise<FuelEntry> => {
      return api.post<FuelEntry>('/api/fuel', data);
    },
    update: async (id: number, data: Partial<FuelFormData>): Promise<FuelEntry> => {
      return api.put<FuelEntry>(`/api/fuel/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
      return api.delete(`/api/fuel/${id}`);
    },
  },

  // Reminders
  reminders: {
    getAll: async (vehicleId?: number): Promise<Reminder[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<Reminder[]>('/api/reminders', { params });
    },
    create: async (data: Omit<Reminder, 'id' | 'created_at'>): Promise<Reminder> => {
      return api.post<Reminder>('/api/reminders', data);
    },
    update: async (id: number, data: Partial<Omit<Reminder, 'id' | 'created_at'>>): Promise<Reminder> => {
      return api.put<Reminder>(`/api/reminders/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
      return api.delete(`/api/reminders/${id}`);
    },
  },

  // Dashboard
  dashboard: {
    get: async (vehicleId?: number): Promise<Dashboard> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<Dashboard>('/api/dashboard', { params });
    },
  },

  // Analytics
  analytics: {
    get: async (vehicleId?: number): Promise<Analytics> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<Analytics>('/api/analytics', { params });
    },
  },

  // Receipts
  receipts: {
    getAll: async (vehicleId?: number): Promise<any[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<any[]>('/api/receipts', { params });
    },
    create: async (data: any): Promise<any> => {
      return api.post<any>('/api/receipts', data);
    },
    update: async (id: number, data: Partial<any>): Promise<any> => {
      return api.put<any>(`/api/receipts/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
      return api.delete(`/api/receipts/${id}`);
    },
  },

  // Documents
  documents: {
    getAll: async (vehicleId?: number): Promise<any[]> => {
      const params = vehicleId ? { vehicle_id: vehicleId } : {};
      return api.get<any[]>('/api/documents', { params });
    },
    create: async (data: FormData): Promise<any> => {
      return api.post<any>('/api/documents', data);
    },
    delete: async (id: number): Promise<void> => {
      return api.delete(`/api/documents/${id}`);
    },
  },

  // Settings
  settings: {
    getAll: async (): Promise<Record<string, any>> => {
      return api.get<Record<string, any>>('/api/settings');
    },
    update: async (key: string, value: any, valueType?: string): Promise<{ success: boolean }> => {
      return api.put<{ success: boolean }>('/api/settings', { key, value, value_type: valueType });
    },
    delete: async (key: string): Promise<void> => {
      return api.delete(`/api/settings/${key}`);
    },
  },

  // Upload
  upload: {
    file: async (file: { uri: string; name: string; type: string }): Promise<{ url: string }> => {
      const formData = new FormData();
      formData.append('file', file as any);
      return api.post<{ url: string }>('/api/upload', formData);
    },
  },

  // Auth
  auth: {
    verifyPin: async (pin: string): Promise<{ valid: boolean; error?: string }> => {
      return api.post<{ valid: boolean; error?: string }>('/api/auth/verify-pin', { pin });
    },
    setPin: async (pin: string): Promise<{ success: boolean }> => {
      return api.post<{ success: boolean }>('/api/auth/set-pin', { pin });
    },
  },
};

export { ApiError };
export default apiService;
