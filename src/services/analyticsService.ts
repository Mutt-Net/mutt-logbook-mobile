// src/services/analyticsService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Analytics } from '../types';
import apiService from './api';
import { VehicleService, CostService, MaintenanceService } from './database';
import { createLogger } from '../lib/logger';

const logger = createLogger('AnalyticsService');

interface CachedAnalytics {
  data: Analytics;
  cachedAt: string;
}

export interface AnalyticsResult {
  data: Analytics;
  cachedAt: string;
  isCache: boolean;
}

function cacheKey(vehicleId: number): string {
  return `analytics_${vehicleId}`;
}

async function readCache(vehicleId: number): Promise<CachedAnalytics | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(vehicleId));
    return raw ? (JSON.parse(raw) as CachedAnalytics) : null;
  } catch (err) {
    logger.warn('Failed to read analytics cache', err);
    return null;
  }
}

async function writeCache(vehicleId: number, data: Analytics): Promise<string> {
  const cachedAt = new Date().toISOString();
  const entry: CachedAnalytics = { data, cachedAt };
  await AsyncStorage.setItem(cacheKey(vehicleId), JSON.stringify(entry));
  return cachedAt;
}

async function computeLocalAnalytics(vehicleId: number): Promise<Analytics> {
  const [vehicle, costs, maintenance] = await Promise.all([
    VehicleService.getById(vehicleId),
    CostService.getByVehicle(vehicleId),
    MaintenanceService.getByVehicle(vehicleId),
  ]);

  const monthly_spending: Record<string, number> = {};
  const yearly_spending: Record<string, number> = {};
  const category_spending: Record<string, number> = {};
  let total_spent = 0;

  for (const cost of costs) {
    const amount = cost.amount ?? 0;
    total_spent += amount;
    if (cost.date) {
      const month = cost.date.substring(0, 7);
      monthly_spending[month] = (monthly_spending[month] ?? 0) + amount;
      const year = cost.date.substring(0, 4);
      yearly_spending[year] = (yearly_spending[year] ?? 0) + amount;
    }
    const cat = cost.category ?? 'other';
    category_spending[cat] = (category_spending[cat] ?? 0) + amount;
  }

  for (const m of maintenance) {
    const amount = m.cost ?? 0;
    if (amount === 0) continue;
    total_spent += amount;
    if (m.date) {
      const month = m.date.substring(0, 7);
      monthly_spending[month] = (monthly_spending[month] ?? 0) + amount;
      const year = m.date.substring(0, 4);
      yearly_spending[year] = (yearly_spending[year] ?? 0) + amount;
    }
    category_spending['maintenance'] = (category_spending['maintenance'] ?? 0) + amount;
  }

  return {
    monthly_spending,
    yearly_spending,
    category_spending,
    total_spent,
    service_intervals: {},
    last_service: {},
    current_mileage: vehicle?.mileage ?? 0,
  };
}

export const analyticsService = {
  async getAnalytics(vehicleId: number): Promise<AnalyticsResult> {
    try {
      logger.info(`Fetching analytics for vehicle ${vehicleId}`);
      const data = await apiService.analytics.get(vehicleId);
      const cachedAt = await writeCache(vehicleId, data);
      return { data, cachedAt, isCache: false };
    } catch (err) {
      logger.warn('Analytics API fetch failed, trying cache', err);
      const cached = await readCache(vehicleId);
      if (cached) {
        return { data: cached.data, cachedAt: cached.cachedAt, isCache: true };
      }
      logger.warn('Cache miss, computing from local SQLite', err);
      const data = await computeLocalAnalytics(vehicleId);
      return { data, cachedAt: new Date().toISOString(), isCache: true };
    }
  },

  async refreshAnalytics(vehicleId: number): Promise<AnalyticsResult> {
    logger.info(`Force-refreshing analytics for vehicle ${vehicleId}`);
    const data = await apiService.analytics.get(vehicleId);
    const cachedAt = await writeCache(vehicleId, data);
    return { data, cachedAt, isCache: false };
  },

  async invalidateCache(vehicleId: number): Promise<void> {
    await AsyncStorage.removeItem(cacheKey(vehicleId));
    logger.info(`Analytics cache invalidated for vehicle ${vehicleId}`);
  },
};
