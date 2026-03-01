import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import {
  VehicleService,
  MaintenanceService,
  ModService,
  CostService,
  VCDSFaultService,
} from '../services/database';
import { Vehicle, Maintenance, Mod, Cost, VCDSFault } from '../types';
import { Card, Loading, EmptyState, SyncStatusBadge } from '../components/common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DashboardStackScreenProps } from '../navigation/types';

interface DashboardStats {
  maintenanceCount: number;
  activeModsCount: number;
  costsCount: number;
  activeFaultsCount: number;
  totalSpent: number;
}

export default function DashboardScreen({ navigation }: DashboardStackScreenProps<'DashboardHome'>) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [recentMaintenance, setRecentMaintenance] = useState<Maintenance[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    maintenanceCount: 0,
    activeModsCount: 0,
    costsCount: 0,
    activeFaultsCount: 0,
    totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsPreview, setAnalyticsPreview] = useState<string | null>(null);

  const loadVehicles = useCallback(async () => {
    const allVehicles = await VehicleService.getAll();
    setVehicles(allVehicles);
    if (allVehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(allVehicles[0].id);
    }
  }, [selectedVehicleId]);

  const loadDashboardData = useCallback(async () => {
    if (!selectedVehicleId) return;

    const [
      maintenance,
      mods,
      costs,
      faults,
    ] = await Promise.all([
      MaintenanceService.getByVehicle(selectedVehicleId),
      ModService.getByVehicle(selectedVehicleId),
      CostService.getByVehicle(selectedVehicleId),
      VCDSFaultService.getByVehicle(selectedVehicleId),
    ]);

    const activeMods = mods.filter((m: Mod) => m.status !== 'completed');
    const activeFaults = faults.filter((f: VCDSFault) => f.status === 'active');

    const maintenanceCost = maintenance.reduce(
      (sum: number, m: Maintenance) => sum + (m.cost || 0),
      0
    );
    const modsCost = mods.reduce(
      (sum: number, m: Mod) => sum + (m.cost || 0),
      0
    );
    const otherCosts = costs.reduce(
      (sum: number, c: Cost) => sum + (c.amount || 0),
      0
    );
    const totalSpent = maintenanceCost + modsCost + otherCosts;

    setStats({
      maintenanceCount: maintenance.length,
      activeModsCount: activeMods.length,
      costsCount: costs.length,
      activeFaultsCount: activeFaults.length,
      totalSpent,
    });

    setRecentMaintenance(maintenance.slice(0, 5));
  }, [selectedVehicleId]);

  const loadAnalyticsPreview = useCallback(async (vehicleId: number) => {
    try {
      const raw = await AsyncStorage.getItem(`analytics_${vehicleId}`);
      if (!raw) return;
      const cached = JSON.parse(raw);
      const intervals: Record<string, { miles: number; months: number }> = cached.data?.service_intervals ?? {};
      const lastService: Record<string, { date: string | null; mileage: number | null }> = cached.data?.last_service ?? {};
      const currentMileage: number = cached.data?.current_mileage ?? 0;
      let overdue = 0;
      let dueSoon = 0;
      for (const [name, interval] of Object.entries(intervals)) {
        const last = lastService[name] ?? { date: null, mileage: null };
        const milesSince = last.mileage != null ? currentMileage - last.mileage : Infinity;
        const monthsSince = last.date
          ? (new Date().getFullYear() - new Date(last.date).getFullYear()) * 12 +
            (new Date().getMonth() - new Date(last.date).getMonth())
          : Infinity;
        if (milesSince > interval.miles || monthsSince > interval.months) overdue++;
        else if (milesSince > interval.miles - 500 || monthsSince > interval.months - 1) dueSoon++;
      }
      const parts: string[] = [];
      if (overdue > 0) parts.push(`${overdue} overdue`);
      if (dueSoon > 0) parts.push(`${dueSoon} due soon`);
      setAnalyticsPreview(parts.length > 0 ? parts.join(' · ') : 'All services OK');
    } catch {
      // silently ignore — preview is best-effort
    }
  }, []);

  const loadData = useCallback(async () => {
    await loadVehicles();
    await loadDashboardData();
    setLoading(false);
  }, [loadVehicles, loadDashboardData]);

  useEffect(() => {
    let cancelled = false;
    
    const fetchData = async () => {
      await loadData();
      if (!cancelled) {
        setLoading(false);
      }
    };
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;
    
    const fetchDashboardData = async () => {
      if (selectedVehicleId) {
        await loadDashboardData();
        await loadAnalyticsPreview(selectedVehicleId);
      }
    };

    fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [selectedVehicleId, loadDashboardData, loadAnalyticsPreview]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleVehicleSelect = useCallback((vehicleId: number) => {
    setSelectedVehicleId(vehicleId);
  }, []);

  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return <Loading />;
  }

  if (vehicles.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          message="No Vehicles"
          submessage="Add a vehicle to start tracking your maintenance and costs"
        />
      </View>
    );
  }

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#007AFF"
        />
      }
    >
      {vehicles.length > 1 && (
        <Card style={styles.vehicleSelector}>
          <Text style={styles.vehicleSelectorLabel}>Selected Vehicle</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {vehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.vehicleChip,
                  selectedVehicleId === vehicle.id && styles.vehicleChipSelected,
                ]}
                onPress={() => handleVehicleSelect(vehicle.id)}
              >
                <Text
                  style={[
                    styles.vehicleChipText,
                    selectedVehicleId === vehicle.id && styles.vehicleChipTextSelected,
                  ]}
                >
                  {vehicle.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>
      )}

      <Card style={styles.totalSpentCard}>
        <Text style={styles.totalSpentLabel}>Total Spent</Text>
        <Text style={styles.totalSpentAmount}>{formatCurrency(stats.totalSpent)}</Text>
        {selectedVehicle && (
          <Text style={styles.vehicleName}>
            {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
          </Text>
        )}
      </Card>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.maintenanceCount}</Text>
          <Text style={styles.statLabel}>Maintenance</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.activeModsCount}</Text>
          <Text style={styles.statLabel}>Active Mods</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.costsCount}</Text>
          <Text style={styles.statLabel}>Costs</Text>
        </Card>
        <Card style={StyleSheet.flatten([styles.statCard, stats.activeFaultsCount > 0 && styles.faultCard])}>
          <Text style={[styles.statValue, stats.activeFaultsCount > 0 && styles.faultValue]}>
            {stats.activeFaultsCount}
          </Text>
          <Text style={styles.statLabel}>Active Faults</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Recent Maintenance</Text>
        {recentMaintenance.length === 0 ? (
          <Text style={styles.emptyText}>No maintenance records yet</Text>
        ) : (
          recentMaintenance.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.maintenanceItem,
                index < recentMaintenance.length - 1 && styles.maintenanceItemBorder,
              ]}
            >
              <View style={styles.maintenanceInfo}>
                <Text style={styles.maintenanceCategory}>{item.category || 'Maintenance'}</Text>
                <Text style={styles.maintenanceDescription} numberOfLines={1}>
                  {item.description || 'No description'}
                </Text>
              </View>
              <View style={styles.maintenanceRight}>
                <Text style={styles.maintenanceCost}>
                  {item.cost ? formatCurrency(item.cost) : '-'}
                </Text>
                <Text style={styles.maintenanceDate}>{formatDate(item.date)}</Text>
              </View>
            </View>
          ))
        )}
      </Card>

      {selectedVehicleId && (
        <Card
          onPress={() => navigation.navigate('Analytics', { vehicleId: selectedVehicleId })}
          style={styles.analyticsCard}
        >
          <View style={styles.analyticsCardContent}>
            <View>
              <Text style={styles.analyticsCardTitle}>Analytics</Text>
              <Text style={styles.analyticsCardSub}>
                {analyticsPreview ?? 'Service intervals · Spending trends'}
              </Text>
            </View>
            <Text style={styles.analyticsCardChevron}>›</Text>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  vehicleSelector: {
    marginBottom: 16,
  },
  vehicleSelectorLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  vehicleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    marginRight: 8,
  },
  vehicleChipSelected: {
    backgroundColor: '#007AFF',
  },
  vehicleChipText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  vehicleChipTextSelected: {
    fontWeight: '600',
  },
  totalSpentCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  totalSpentLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  totalSpentAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  vehicleName: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 12,
    alignItems: 'center',
    paddingVertical: 16,
  },
  faultCard: {
    borderColor: '#FF453A',
    borderWidth: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  faultValue: {
    color: '#FF453A',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  maintenanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  maintenanceItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  maintenanceInfo: {
    flex: 1,
    marginRight: 12,
  },
  maintenanceCategory: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  maintenanceDescription: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  maintenanceRight: {
    alignItems: 'flex-end',
  },
  maintenanceCost: {
    fontSize: 14,
    color: '#30D158',
    fontWeight: '600',
    marginBottom: 2,
  },
  maintenanceDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 16,
  },
  analyticsCard: { marginTop: 4 },
  analyticsCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  analyticsCardTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  analyticsCardSub: { fontSize: 13, color: '#8E8E93' },
  analyticsCardChevron: { fontSize: 24, color: '#8E8E93' },
});

