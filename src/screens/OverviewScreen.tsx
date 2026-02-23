import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  FlatList,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { OverviewStackScreenProps } from '../navigation/types';
import * as ImagePicker from 'expo-image-picker';
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
import { Card, Button, Loading, EmptyState } from '../components/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2;

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
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<VehiclePhoto | null>(null);

  const loadData = useCallback(async () => {
    const vehicles = await VehicleService.getAll();
    if (vehicles.length === 0) {
      setVehicle(null);
      setLoading(false);
      return;
    }

    const currentVehicle = vehicles[0];
    setVehicle(currentVehicle);

    const [
      maintenanceData,
      modsData,
      costsData,
      faultsData,
      photosData,
      fuelData,
    ] = await Promise.all([
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

    const activeFaults = faultsData.filter((f: VCDSFault) => f.status === 'active');
    const activeMods = modsData.filter((m: Mod) => m.status !== 'completed');
    
    const maintenanceCost = maintenanceData.reduce(
      (sum: number, m: Maintenance) => sum + (m.cost || 0),
      0
    );
    const modsCost = modsData.reduce(
      (sum: number, m: Mod) => sum + (m.cost || 0),
      0
    );
    const otherCosts = costsData.reduce(
      (sum: number, c: Cost) => sum + (c.amount || 0),
      0
    );
    const totalSpent = maintenanceCost + modsCost + otherCosts;

    setStats({
      totalSpent,
      recordsCount: maintenanceData.length + costsData.length + fuelData.length,
      modsCount: activeMods.length,
      faultsCount: activeFaults.length,
    });
  }, []);

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
    
    const fetchData = async () => {
      if (!loading) {
        await loadData();
      }
    };
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, [loading, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const toggleAccordion = (key: keyof AccordionState) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return '#30D158';
      case 'in_progress':
        return '#FF9500';
      case 'planned':
        return '#8E8E93';
      case 'active':
        return '#FF453A';
      case 'cleared':
        return '#30D158';
      default:
        return '#8E8E93';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'planned':
        return 'Planned';
      case 'active':
        return 'Active';
      case 'cleared':
        return 'Cleared';
      default:
        return status;
    }
  };

  const pickImage = async () => {
    if (!vehicle) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isFirstPhoto = photos.length === 0;
      
      await VehiclePhotoService.create({
        vehicle_id: vehicle.id,
        filename: asset.uri,
        caption: null,
        is_primary: isFirstPhoto,
      });
      
      await loadData();
    }
  };

  const handleSetPrimary = async (photo: VehiclePhoto) => {
    if (!vehicle) return;
    
    await VehiclePhotoService.setPrimary(vehicle.id, photo.id);
    await loadData();
    setImageModalVisible(false);
  };

  const handleDeletePhoto = async (photo: VehiclePhoto) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await VehiclePhotoService.delete(photo.id);
            await loadData();
            setImageModalVisible(false);
          },
        },
      ]
    );
  };

  const handlePhotoLongPress = (photo: VehiclePhoto) => {
    setSelectedPhoto(photo);
    setImageModalVisible(true);
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
      <Text style={styles.accordionChevron}>
        {expanded[key] ? '▼' : '▶'}
      </Text>
    </TouchableOpacity>
  );

  const renderAccordionContent = (content: React.ReactNode) => (
    <View style={styles.accordionContent}>
      {content}
    </View>
  );

  if (loading) {
    return <Loading />;
  }

  if (!vehicle) {
    return (
      <View style={styles.container}>
        <EmptyState
          message="No Vehicle"
          submessage="Add a vehicle to see the overview"
        />
      </View>
    );
  }

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
      <Card style={styles.vehicleHeader}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{vehicle.name}</Text>
          <Text style={styles.vehicleDetails}>
            {vehicle.year} {vehicle.make} {vehicle.model}
            {vehicle.reg ? ` • ${vehicle.reg}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </Card>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatCurrency(stats.totalSpent)}</Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.recordsCount}</Text>
          <Text style={styles.statLabel}>Records</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.modsCount}</Text>
          <Text style={styles.statLabel}>Mods</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, stats.faultsCount > 0 && styles.faultValue]}>
            {stats.faultsCount}
          </Text>
          <Text style={styles.statLabel}>Faults</Text>
        </View>
      </View>

      <View style={styles.accordionGrid}>
        <View style={styles.accordionRow}>
          <Card style={styles.accordionCard}>
            {renderAccordionHeader('images', '📷', 'Images', photos.length)}
            {expanded.images && renderAccordionContent(
              photos.length > 0 ? (
                <View style={styles.photoGrid}>
                  {photos.slice(0, 4).map((photo, index) => (
                    <TouchableOpacity
                      key={photo.id}
                      style={[
                        styles.photoThumbnail,
                        photo.is_primary && styles.photoPrimary,
                      ]}
                      onLongPress={() => handlePhotoLongPress(photo)}
                    >
                      <View style={styles.photoPlaceholder}>
                        <Text style={styles.photoPlaceholderText}>📷</Text>
                      </View>
                      {photo.is_primary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>★</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                    <Text style={styles.addPhotoButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyAccordion}>
                  <Text style={styles.emptyAccordionText}>No photos yet</Text>
                  <Button title="Add Photo" onPress={pickImage} variant="secondary" />
                </View>
              )
            )}
          </Card>

          <Card style={styles.accordionCard}>
            {renderAccordionHeader('maintenance', '📋', 'Maintenance', maintenance.length)}
            {expanded.maintenance && renderAccordionContent(
              maintenance.length > 0 ? (
                <>
                  {maintenance.slice(0, 3).map((item, index) => (
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
              )
            )}
          </Card>
        </View>

        <View style={styles.accordionRow}>
          <Card style={styles.accordionCard}>
            {renderAccordionHeader('mods', '🔧', 'Mods', mods.length)}
            {expanded.mods && renderAccordionContent(
              mods.length > 0 ? (
                <>
                  {mods.slice(0, 3).map((item) => (
                    <View key={item.id} style={styles.listItem}>
                      <View style={styles.listItemHeader}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>
                          {item.description || item.category || 'Mod'}
                        </Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(item.status) + '20' }
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            { color: getStatusColor(item.status) }
                          ]}>
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
              )
            )}
          </Card>

          <Card style={styles.accordionCard}>
            {renderAccordionHeader('costs', '💳', 'Costs', costs.length)}
            {expanded.costs && renderAccordionContent(
              costs.length > 0 ? (
                <>
                  {costs.slice(0, 3).map((item) => (
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
              )
            )}
          </Card>
        </View>

        <View style={styles.accordionRow}>
          <Card style={styles.accordionCard}>
            {renderAccordionHeader('vcds', '⚠️', 'VCDS', faults.length)}
            {expanded.vcds && renderAccordionContent(
              faults.length > 0 ? (
                <>
                  {faults.slice(0, 3).map((item) => (
                    <View key={item.id} style={styles.listItem}>
                      <View style={styles.listItemHeader}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>
                          {item.fault_code || item.component || 'Fault'}
                        </Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(item.status) + '20' }
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            { color: getStatusColor(item.status) }
                          ]}>
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
              )
            )}
          </Card>

          <Card style={styles.accordionCard}>
            {renderAccordionHeader('fuel', '⛽', 'Fuel', fuelEntries.length)}
            {expanded.fuel && renderAccordionContent(
              fuelEntries.length > 0 ? (
                <>
                  {fuelEntries.slice(0, 3).map((item) => (
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
              )
            )}
          </Card>
        </View>
      </View>

      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setImageModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Photo Options</Text>
            {selectedPhoto && !selectedPhoto.is_primary && (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleSetPrimary(selectedPhoto)}
              >
                <Text style={styles.modalButtonText}>Set as Primary</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonDanger]}
              onPress={() => selectedPhoto && handleDeletePhoto(selectedPhoto)}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonTextDanger]}>
                Delete Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setImageModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#8E8E93',
  },
  editButton: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  faultValue: {
    color: '#FF453A',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 8,
  },
  accordionGrid: {
    marginBottom: 16,
  },
  accordionRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  accordionCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  accordionChevron: {
    fontSize: 10,
    color: '#8E8E93',
  },
  accordionContent: {
    marginTop: 12,
  },
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listItemTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  listItemSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  viewAllButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyAccordion: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyAccordionText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  photoThumbnail: {
    width: GRID_ITEM_WIDTH - 8,
    height: GRID_ITEM_WIDTH - 8,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPrimary: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 32,
  },
  primaryBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#007AFF',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: GRID_ITEM_WIDTH - 8,
    height: GRID_ITEM_WIDTH - 8,
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3A3A3C',
    borderStyle: 'dashed',
  },
  addPhotoButtonText: {
    fontSize: 32,
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalButtonDanger: {
    borderBottomWidth: 0,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
  },
  modalButtonTextDanger: {
    color: '#FF453A',
  },
});
