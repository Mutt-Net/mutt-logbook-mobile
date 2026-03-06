import { analyticsService } from '../services/analyticsService';

// Mock all external dependencies so tests run without native modules
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/api', () => ({
  default: {
    analytics: {
      get: jest.fn().mockRejectedValue(new Error('Network error')),
    },
  },
}));

jest.mock('../lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockVehicle = { id: 1, name: 'Golf', mileage: 50000, make: 'VW', model: 'Golf', reg: null, vin: null, year: 2015, engine: null, transmission: null, created_at: '2026-01-01' };

jest.mock('../services/database', () => ({
  VehicleService: { getById: jest.fn() },
  CostService: { getByVehicle: jest.fn() },
  MaintenanceService: { getByVehicle: jest.fn() },
}));

import { VehicleService, CostService, MaintenanceService } from '../services/database';

const mockVehicleService = VehicleService as jest.Mocked<typeof VehicleService>;
const mockCostService = CostService as jest.Mocked<typeof CostService>;
const mockMaintenanceService = MaintenanceService as jest.Mocked<typeof MaintenanceService>;

function makeCost(overrides: Record<string, unknown> = {}) {
  return { id: 1, vehicle_id: 1, date: '2026-03-01', category: 'parts', amount: 100, description: null, notes: null, synced: 0, remote_id: null, created_at: '2026-03-01', updated_at: '2026-03-01', ...overrides };
}

function makeMaintenance(overrides: Record<string, unknown> = {}) {
  return { id: 1, vehicle_id: 1, date: '2026-03-01', mileage: null, category: null, description: 'Oil change', parts_used: null, labor_hours: null, cost: 50, shop_name: null, notes: null, synced: 0, remote_id: null, created_at: '2026-03-01', updated_at: '2026-03-01', ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVehicleService.getById.mockResolvedValue(mockVehicle as any);
  mockCostService.getByVehicle.mockResolvedValue([]);
  mockMaintenanceService.getByVehicle.mockResolvedValue([]);
});

describe('analyticsService.getAnalytics — local fallback', () => {
  it('returns local data when API and cache both fail', async () => {
    const result = await analyticsService.getAnalytics(1);
    expect(result.isCache).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.total_spent).toBe(0);
  });

  it('sums cost amounts into total_spent', async () => {
    mockCostService.getByVehicle.mockResolvedValue([makeCost({ amount: 200 }), makeCost({ amount: 50 })] as any);
    const result = await analyticsService.getAnalytics(1);
    expect(result.data.total_spent).toBe(250);
  });

  it('includes maintenance costs in total_spent', async () => {
    mockMaintenanceService.getByVehicle.mockResolvedValue([makeMaintenance({ cost: 75 })] as any);
    const result = await analyticsService.getAnalytics(1);
    expect(result.data.total_spent).toBe(75);
  });

  it('aggregates monthly_spending by YYYY-MM key', async () => {
    mockCostService.getByVehicle.mockResolvedValue([
      makeCost({ date: '2026-03-01', amount: 100 }),
      makeCost({ date: '2026-03-15', amount: 50 }),
      makeCost({ date: '2026-04-01', amount: 200 }),
    ] as any);
    const result = await analyticsService.getAnalytics(1);
    expect(result.data.monthly_spending['2026-03']).toBe(150);
    expect(result.data.monthly_spending['2026-04']).toBe(200);
  });

  it('aggregates category_spending by category', async () => {
    mockCostService.getByVehicle.mockResolvedValue([
      makeCost({ category: 'parts', amount: 100 }),
      makeCost({ category: 'parts', amount: 50 }),
      makeCost({ category: 'fuel', amount: 80 }),
    ] as any);
    const result = await analyticsService.getAnalytics(1);
    expect(result.data.category_spending['parts']).toBe(150);
    expect(result.data.category_spending['fuel']).toBe(80);
  });

  it('uses vehicle mileage as current_mileage', async () => {
    const result = await analyticsService.getAnalytics(1);
    expect(result.data.current_mileage).toBe(50000);
  });

  it('returns 0 current_mileage when vehicle not found', async () => {
    mockVehicleService.getById.mockResolvedValue(null as any);
    const result = await analyticsService.getAnalytics(1);
    expect(result.data.current_mileage).toBe(0);
  });

  it('returns empty aggregates when no records exist', async () => {
    const result = await analyticsService.getAnalytics(1);
    expect(result.data.monthly_spending).toEqual({});
    expect(result.data.category_spending).toEqual({});
    expect(result.data.total_spent).toBe(0);
  });
});
