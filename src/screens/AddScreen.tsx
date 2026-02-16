import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { VehicleService } from '../services/database';
import { Vehicle } from '../types';
import { Card, Loading } from '../components/common';

interface AddButtonProps {
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
}

function AddButton({ title, icon, color, onPress }: AddButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.buttonIcon}>{icon}</Text>
      <Text style={styles.buttonTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const ADD_OPTIONS = [
  { id: 'maintenance', title: 'Maintenance', icon: '🔧', color: '#007AFF' },
  { id: 'mod', title: 'Mod', icon: '⚙️', color: '#AF52DE' },
  { id: 'cost', title: 'Cost', icon: '💰', color: '#30D158' },
  { id: 'fuel', title: 'Fuel', icon: '⛽', color: '#FF9500' },
  { id: 'note', title: 'Note', icon: '📝', color: '#5856D6' },
  { id: 'vcds', title: 'VCDS Fault', icon: '🔍', color: '#FF3B30' },
  { id: 'reminder', title: 'Reminder', icon: '🔔', color: '#FF2D55' },
];

export default function AddScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadVehicles = useCallback(async () => {
    const allVehicles = await VehicleService.getAll();
    setVehicles(allVehicles);
    if (allVehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(allVehicles[0].id);
    }
    setLoading(false);
  }, [selectedVehicleId]);

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [loadVehicles])
  );

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const handleAddPress = (type: string) => {
    if (!selectedVehicleId) {
      Alert.alert('No Vehicle', 'Please add a vehicle from the Dashboard first.');
      return;
    }

    switch (type) {
      case 'maintenance':
        navigation.navigate('Maintenance', { vehicleId: selectedVehicleId });
        break;
      case 'mod':
        navigation.navigate('Mods', { vehicleId: selectedVehicleId });
        break;
      case 'cost':
        navigation.navigate('Costs', { vehicleId: selectedVehicleId });
        break;
      case 'fuel':
        navigation.navigate('Fuel', { vehicleId: selectedVehicleId });
        break;
      case 'note':
        navigation.navigate('Notes', { vehicleId: selectedVehicleId });
        break;
      case 'vcds':
        navigation.navigate('VCDS', { vehicleId: selectedVehicleId });
        break;
      case 'reminder':
        navigation.navigate('Reminders', { vehicleId: selectedVehicleId });
        break;
      default:
        break;
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Record</Text>
          <Text style={styles.headerSubtitle}>
            {selectedVehicle
              ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`
              : 'No vehicle selected'}
          </Text>
        </View>

        {vehicles.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Vehicles</Text>
              <Text style={styles.emptyText}>
                Add a vehicle from the Dashboard first to start adding records.
              </Text>
            </View>
          </Card>
        ) : (
          <>
            <View style={styles.grid}>
              {ADD_OPTIONS.map((option) => (
                <AddButton
                  key={option.id}
                  title={option.title}
                  icon={option.icon}
                  color={option.color}
                  onPress={() => handleAddPress(option.id)}
                />
              ))}
            </View>

            <Card style={styles.infoCard}>
              <Text style={styles.infoTitle}>Selected Vehicle</Text>
              <Text style={styles.infoText}>
                {selectedVehicle?.name || selectedVehicle?.make + ' ' + selectedVehicle?.model}
              </Text>
              <Text style={styles.infoSubtext}>
                {selectedVehicle?.year} {selectedVehicle?.make} {selectedVehicle?.model}
              </Text>
              {selectedVehicle?.mileage !== undefined && (
                <Text style={styles.infoMileage}>
                  {selectedVehicle.mileage.toLocaleString()} miles
                </Text>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    width: '48%',
    aspectRatio: 1.2,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  buttonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  infoCard: {
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoMileage: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
