// src/services/analyticsService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Analytics } from '../types';
import apiService from './api';
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
      throw new Error('No analytics data available. Connect to your home network to load analytics.');
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
