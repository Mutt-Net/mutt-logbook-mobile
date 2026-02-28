// src/screens/AnalyticsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Card, Loading, EmptyState } from '../components/common';
import { analyticsService, AnalyticsResult } from '../services/analyticsService';
import { createLogger } from '../lib/logger';
import type { DashboardStackScreenProps } from '../navigation/types';

const logger = createLogger('AnalyticsScreen');

type ServiceStatus = 'overdue' | 'due_soon' | 'ok';

interface ServiceRow {
  name: string;
  lastDate: string | null;
  lastMileage: number | null;
  status: ServiceStatus;
  detail: string;
}

function monthsBetween(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const last = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth());
}

function computeServiceRows(
  intervals: Record<string, { miles: number; months: number }>,
  lastService: Record<string, { date: string | null; mileage: number | null }>,
  currentMileage: number
): ServiceRow[] {
  return Object.entries(intervals).map(([name, interval]) => {
    const last = lastService[name] ?? { date: null, mileage: null };
    const milesSince = last.mileage != null ? currentMileage - last.mileage : Infinity;
    const monthsSince = monthsBetween(last.date);

    let status: ServiceStatus = 'ok';
    if (milesSince > interval.miles || monthsSince > interval.months) {
      status = 'overdue';
    } else if (milesSince > interval.miles - 500 || monthsSince > interval.months - 1) {
      status = 'due_soon';
    }

    const lastDateStr = last.date
      ? new Date(last.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Never';
    const detail = last.mileage != null
      ? `${lastDateStr} · ${last.mileage.toLocaleString()} mi`
      : lastDateStr;

    return { name, lastDate: last.date, lastMileage: last.mileage, status, detail };
  });
}

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; bg: string }> = {
  overdue:  { label: 'Overdue',  color: '#FF453A', bg: 'rgba(255,69,58,0.15)' },
  due_soon: { label: 'Due Soon', color: '#FFD60A', bg: 'rgba(255,214,10,0.15)' },
  ok:       { label: 'OK',       color: '#30D158', bg: 'rgba(48,209,88,0.15)' },
};

type Props = DashboardStackScreenProps<'Analytics'>;

export default function AnalyticsScreen({ route }: Props) {
  const { vehicleId } = route.params;
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await analyticsService.getAnalytics(vehicleId);
      setResult(res);
    } catch (err: any) {
      logger.error('Failed to load analytics', err);
      setError(err.message ?? 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await analyticsService.refreshAnalytics(vehicleId);
      setResult(res);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Loading />;

  if (error && !result) {
    return (
      <View style={styles.container}>
        <EmptyState message="No Analytics Data" submessage={error} />
      </View>
    );
  }

  const data = result!.data;
  const serviceRows = computeServiceRows(
    data.service_intervals ?? {},
    data.last_service ?? {},
    data.current_mileage ?? 0
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
    >
      {result!.isCache && (
        <View style={styles.cacheBanner}>
          <Text style={styles.cacheBannerText}>
            Cached data · Last updated {new Date(result!.cachedAt).toLocaleString()}
          </Text>
        </View>
      )}

      {/* SERVICE INTERVALS */}
      <Card>
        <Text style={styles.sectionTitle}>Service Intervals</Text>
        {serviceRows.length === 0 ? (
          <Text style={styles.emptyText}>No service interval data</Text>
        ) : (
          serviceRows.map((row) => {
            const cfg = STATUS_CONFIG[row.status];
            return (
              <View key={row.name} style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{row.name}</Text>
                  <Text style={styles.serviceDetail}>{row.detail}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

      {/* MONTHLY SPENDING — Task 5 */}
      {/* CATEGORY BREAKDOWN — Task 6 */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { padding: 16, paddingBottom: 32 },
  cacheBanner: {
    backgroundColor: 'rgba(255,214,10,0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.3)',
  },
  cacheBannerText: { color: '#FFD60A', fontSize: 13, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  emptyText: { color: '#8E8E93', fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  serviceInfo: { flex: 1, marginRight: 12 },
  serviceName: { fontSize: 15, fontWeight: '500', color: '#FFFFFF', marginBottom: 2 },
  serviceDetail: { fontSize: 13, color: '#8E8E93' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 13, fontWeight: '600' },
});
