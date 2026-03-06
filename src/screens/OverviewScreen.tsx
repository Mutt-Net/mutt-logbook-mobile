import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { OverviewStackScreenProps } from '../navigation/types';
import {
  VehicleService,
  MaintenanceService,
  ModService,
  CostService,
  VCDSFaultService,
  VehiclePhotoService,
  FuelEntryService,
} from '../services/database';
import {
  Vehicle,
  Maintenance,
  Mod,
  Cost,
  VCDSFault,
  VehiclePhoto,
  FuelEntry,
} from '../types';
import { Card, Loading, EmptyState } from '../components/common';
import PhotosAccordion from '../components/overview/PhotosAccordion';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/formatUtils';

interface AccordionState {
  images: boolean;
  maintenance: boolean;
  mods: boolean;
  costs: boolean;
  vcds: boolean;
  fuel: boolean;
}

interface OverviewStats {
  totalSpent: number;
  recordsCount: number;
  modsCount: number;
  faultsCount: number;
}

export default function OverviewScreen() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [mods, setMods] = useState<Mod[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [faults, setFaults] = useState<VCDSFault[]>([]);
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [stats, setStats] = useState<OverviewStats>({
    totalSpent: 0,
    recordsCount: 0,
    modsCount: 0,
    faultsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<AccordionState>({
    images: false,
    maintenance: false,
    mods: false,
    costs: false,
    vcds: false,
    fuel: false,
  });

  const loadData = useCallback(async () => {
    const vehicles = await VehicleService.getAll();
    if (vehicles.length === 0) {
      setVehicle(null);
      setLoading(false);
      return;
    }

    const currentVehicle = vehicles[0];
    setVehicle(currentVehicle);

    const [maintenanceData, modsData, costsData, faultsData, photosData, fuelData] =
      await Promise.all([
        MaintenanceService.getByVehicle(currentVehicle.id),
        ModService.getByVehicle(currentVehicle.id),
        CostService.getByVehicle(currentVehicle.id),
        VCDSFaultService.getByVehicle(currentVehicle.id),
        VehiclePhotoService.getByVehicle(currentVehicle.id),
        FuelEntryService.getByVehicle(currentVehicle.id),
      ]);

    setMaintenance(maintenanceData);
    setMods(modsData);
    setCosts(costsData);
    setFaults(faultsData);
    setPhotos(photosData);
    setFuelEntries(fuelData);

    const totalSpent =
      maintenanceData.reduce((sum: number, m: Maintenance) => sum + (m.cost || 0), 0) +
      modsData.reduce((sum: number, m: Mod) => sum + (m.cost || 0), 0) +
      costsData.reduce((sum: number, c: Cost) => sum + (c.amount || 0), 0);

    setStats({
      totalSpent,
      recordsCount: maintenanceData.length + costsData.length + fuelData.length,
      modsCount: modsData.filter((m: Mod) => m.status !== 'completed').length,
      faultsCount: faultsData.filter((f: VCDSFault) => f.status === 'active').length,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadData().then(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const toggleAccordion = (key: keyof AccordionState) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const navigation = useNavigation<OverviewStackScreenProps<'OverviewHome'>['navigation']>();
  const navigateToScreen = (screen: string) => {
    if (!vehicle) return;
    navigation.navigate(screen as any, { vehicleId: vehicle.id });
  };

  const renderAccordionHeader = (
    key: keyof AccordionState,
    icon: string,
    title: string,
    count: number
  ) => (
    <TouchableOpacity
      style={styles.accordionHeader}
      onPress={() => toggleAccordion(key)}
      activeOpacity={0.7}
    >
      <View style={styles.accordionHeaderLeft}>
        <Text style={styles.accordionIcon}>{icon}</Text>
        <Text style={styles.accordionTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </View>
      </View>
      <Text style={styles.accordionChevron}>{expanded[key] ? '▼' : '▶'}</Text>
    </TouchableOpacity>
  );

  if (loading) return <Loading />;

  if (!vehicle) {
    return (
      <View style={styles.container}>
        <EmptyState message="No Vehicle" submessage="Add a vehicle to see the overview" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
      }
    >
      <Card style={styles.vehicleHeader}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{vehicle.name}</Text>
          <Text style={styles.vehicleDetails}>
            {vehicle.year} {vehicle.make} {vehicle.model}
            {vehicle.reg ? ` • ${vehicle.reg}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('Vehicle', { vehicleId: vehicle.id })}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </Card>

      <View style={styles.statsRow}>
        {[
          { value: formatCurrency(stats.totalSpent), label: 'Total Spent', danger: false },
          { value: stats.recordsCount, label: 'Records', danger: false },
          { value: stats.modsCount, label: 'Mods', danger: false },
          { value: stats.faultsCount, label: 'Faults', danger: stats.faultsCount > 0 },
        ].map((stat, i, arr) => (
          <React.Fragment key={stat.label}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, stat.danger && styles.faultValue]}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.statDivider} />}
          </React.Fragment>
        ))}
      </View>

      <View style={styles.accordionGrid}>
        <View style={styles.accordionRow}>
          <Card style={styles.accordionCard}>
            <PhotosAccordion
              vehicle={vehicle}
              photos={photos}
              expanded={expanded.images}
              onToggle={() => toggleAccordion('images')}
              onReload={loadData}
            />
          </Card>

          <Card style={styles.accordionCard}>
            {renderAccordionHeader('maintenance', '📋', 'Maintenance', maintenance.length)}
            {expanded.maintenance && (
              <View style={styles.accordionContent}>
                {maintenance.length > 0 ? (
                  <>
                    {maintenance.slice(0, 3).map(item => (
                      <View key={item.id} style={styles.listItem}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>
                          {item.description || item.category || 'Maintenance'}
                        </Text>
                        <Text style={styles.listItemSubtitle}>
                          {formatDate(item.date)} • {item.cost ? formatCurrency(item.cost) : '-'}
                        </Text>
                      </View>
                    ))}
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => navigateToScreen('Maintenance')}
                    >
                      <Text style={styles.viewAllButtonText}>View All</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.emptyAccordionText}>No maintenance records</Text>
                )}
              </View>
            )}
          </Card>
        </View>

        <View style={styles.accordionRow}>
          <Card style={styles.accordionCard}>
            {renderAccordionHeader('mods', '🔧', 'Mods', mods.length)}
            {expanded.mods && (
              <View style={styles.accordionContent}>
                {mods.length > 0 ? (
                  <>
                    {mods.slice(0, 3).map(item => (
                      <View key={item.id} style={styles.listItem}>
                        <View style={styles.listItemHeader}>
                          <Text style={styles.listItemTitle} numberOfLines={1}>
                            {item.description || item.category || 'Mod'}
                          </Text>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(item.status) + '20' }
                          ]}>
                            <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
                              {getStatusLabel(item.status)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.listItemSubtitle}>
                          {formatDate(item.date)} • {item.cost ? formatCurrency(item.cost) : '-'}
                        </Text>
                      </View>
                    ))}
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => navigateToScreen('Mods')}
                    >
                      <Text style={styles.viewAllButtonText}>View All</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.emptyAccordionText}>No mods</Text>
                )}
              </View>
            )}
          </Card>

          <Card style={styles.accordionCard}>
            {renderAccordionHeader('costs', '💳', 'Costs', costs.length)}
            {expanded.costs && (
              <View style={styles.accordionContent}>
                {costs.length > 0 ? (
                  <>
                    {costs.slice(0, 3).map(item => (
                      <View key={item.id} style={styles.listItem}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>
                          {item.description || item.category || 'Cost'}
                        </Text>
                        <Text style={styles.listItemSubtitle}>
                          {formatDate(item.date)} • {item.amount ? formatCurrency(item.amount) : '-'}
                        </Text>
                      </View>
                    ))}
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => navigateToScreen('Costs')}
                    >
                      <Text style={styles.viewAllButtonText}>View All</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.emptyAccordionText}>No costs</Text>
                )}
              </View>
            )}
          </Card>
        </View>

        <View style={styles.accordionRow}>
          <Card style={styles.accordionCard}>
            {renderAccordionHeader('vcds', '⚠️', 'VCDS', faults.length)}
            {expanded.vcds && (
              <View style={styles.accordionContent}>
                {faults.length > 0 ? (
                  <>
                    {faults.slice(0, 3).map(item => (
                      <View key={item.id} style={styles.listItem}>
                        <View style={styles.listItemHeader}>
                          <Text style={styles.listItemTitle} numberOfLines={1}>
                            {item.fault_code || item.component || 'Fault'}
                          </Text>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(item.status) + '20' }
                          ]}>
                            <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>
                              {getStatusLabel(item.status)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.listItemSubtitle} numberOfLines={1}>
                          {item.description || 'No description'}
                        </Text>
                      </View>
                    ))}
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => navigateToScreen('VCDS')}
                    >
                      <Text style={styles.viewAllButtonText}>View All</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.emptyAccordionText}>No faults</Text>
                )}
              </View>
            )}
          </Card>

          <Card style={styles.accordionCard}>
            {renderAccordionHeader('fuel', '⛽', 'Fuel', fuelEntries.length)}
            {expanded.fuel && (
              <View style={styles.accordionContent}>
                {fuelEntries.length > 0 ? (
                  <>
                    {fuelEntries.slice(0, 3).map(item => (
                      <View key={item.id} style={styles.listItem}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>
                          {item.gallons ? `${item.gallons.toFixed(2)} gal` : 'Fuel Entry'}
                        </Text>
                        <Text style={styles.listItemSubtitle}>
                          {formatDate(item.date)} • {item.total_cost ? formatCurrency(item.total_cost) : '-'}
                        </Text>
                      </View>
                    ))}
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => navigateToScreen('Fuel')}
                    >
                      <Text style={styles.viewAllButtonText}>View All</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.emptyAccordionText}>No fuel entries</Text>
                )}
              </View>
            )}
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  contentContainer: { padding: 16, paddingBottom: 32 },
  vehicleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  vehicleDetails: { fontSize: 14, color: '#8E8E93' },
  editButton: { backgroundColor: '#2C2C2E', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  editButtonText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: 12, padding: 16, marginBottom: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#8E8E93' },
  faultValue: { color: '#FF453A' },
  statDivider: { width: 1, backgroundColor: '#2C2C2E', marginHorizontal: 8 },
  accordionGrid: { marginBottom: 16 },
  accordionRow: { flexDirection: 'row', marginBottom: 12 },
  accordionCard: { flex: 1, marginHorizontal: 4 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  accordionIcon: { fontSize: 16, marginRight: 8 },
  accordionTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  countBadge: { backgroundColor: '#2C2C2E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  countBadgeText: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  accordionChevron: { fontSize: 10, color: '#8E8E93' },
  accordionContent: { marginTop: 12 },
  listItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  listItemTitle: { fontSize: 14, color: '#FFFFFF', flex: 1, marginRight: 8 },
  listItemSubtitle: { fontSize: 12, color: '#8E8E93' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },
  viewAllButton: { marginTop: 12, alignItems: 'center' },
  viewAllButtonText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
  emptyAccordionText: { fontSize: 14, color: '#8E8E93' },
});
