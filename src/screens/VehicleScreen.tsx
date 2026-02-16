import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { VehicleService } from '../services/database';
import { Vehicle } from '../types';
import { Button, Input, Loading, Card } from '../components/common';

interface VehicleFormData {
  name: string;
  make: string;
  model: string;
  reg: string;
  vin: string;
  year: string;
  engine: string;
  transmission: string;
  mileage: string;
}

interface VehicleScreenProps {
  vehicleId?: number;
}

export default function VehicleScreen({ vehicleId: propVehicleId }: VehicleScreenProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(propVehicleId || null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<VehicleFormData>({
    name: '',
    make: '',
    model: '',
    reg: '',
    vin: '',
    year: '',
    engine: '',
    transmission: '',
    mileage: '',
  });

  const loadVehicles = useCallback(async () => {
    const allVehicles = await VehicleService.getAll();
    setVehicles(allVehicles);
    if (allVehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(allVehicles[0].id);
    }
  }, [selectedVehicleId]);

  const loadVehicle = useCallback(async () => {
    if (!selectedVehicleId) {
      setVehicle(null);
      setLoading(false);
      return;
    }
    const vehicleData = await VehicleService.getById(selectedVehicleId);
    setVehicle(vehicleData);
    if (vehicleData) {
      setFormData({
        name: vehicleData.name || '',
        make: vehicleData.make || '',
        model: vehicleData.model || '',
        reg: vehicleData.reg || '',
        vin: vehicleData.vin || '',
        year: vehicleData.year?.toString() || '',
        engine: vehicleData.engine || '',
        transmission: vehicleData.transmission || '',
        mileage: vehicleData.mileage?.toString() || '0',
      });
    }
  }, [selectedVehicleId]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    if (vehicles.length > 0 || selectedVehicleId) {
      loadVehicle();
    }
  }, [vehicles, selectedVehicleId, loadVehicle]);

  useEffect(() => {
    if (!loading) {
      loadVehicle();
    }
  }, [selectedVehicleId]);

  const handleSave = async () => {
    if (!selectedVehicleId) {
      Alert.alert('Error', 'No vehicle selected');
      return;
    }

    if (!formData.make || !formData.model) {
      Alert.alert('Error', 'Make and Model are required');
      return;
    }

    setSaving(true);
    try {
      await VehicleService.update(selectedVehicleId, {
        name: formData.name || undefined,
        make: formData.make,
        model: formData.model,
        reg: formData.reg || null,
        vin: formData.vin || null,
        year: formData.year ? parseInt(formData.year, 10) : null,
        engine: formData.engine || null,
        transmission: formData.transmission || null,
        mileage: formData.mileage ? parseInt(formData.mileage, 10) : 0,
      });
      Alert.alert('Success', 'Vehicle updated successfully');
      await loadVehicle();
    } catch (error) {
      Alert.alert('Error', 'Failed to update vehicle');
    } finally {
      setSaving(false);
    }
  };

  const updateFormField = (field: keyof VehicleFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <Loading />;
  }

  if (vehicles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No vehicles found</Text>
          <Text style={styles.emptySubtext}>Add a vehicle from the Dashboard to get started</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{vehicle?.name || 'Vehicle Details'}</Text>
          {vehicle && (
            <Text style={styles.headerSubtitle}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </Text>
          )}
        </View>

        <Card>
          <Input
            label="Vehicle Name"
            value={formData.name}
            onChangeText={(text) => updateFormField('name', text)}
            placeholder="e.g., My Daily Driver"
          />

          <Input
            label="Make *"
            value={formData.make}
            onChangeText={(text) => updateFormField('make', text)}
            placeholder="e.g., BMW"
          />

          <Input
            label="Model *"
            value={formData.model}
            onChangeText={(text) => updateFormField('model', text)}
            placeholder="e.g., M3"
          />

          <Input
            label="Registration"
            value={formData.reg}
            onChangeText={(text) => updateFormField('reg', text)}
            placeholder="License plate"
            autoCapitalize="characters"
          />

          <Input
            label="VIN"
            value={formData.vin}
            onChangeText={(text) => updateFormField('vin', text)}
            placeholder="Vehicle Identification Number"
            autoCapitalize="characters"
            maxLength={17}
          />

          <Input
            label="Year"
            value={formData.year}
            onChangeText={(text) => updateFormField('year', text)}
            placeholder="e.g., 2020"
            keyboardType="numeric"
            maxLength={4}
          />

          <Input
            label="Engine"
            value={formData.engine}
            onChangeText={(text) => updateFormField('engine', text)}
            placeholder="e.g., 3.0L Twin-Turbo"
          />

          <Input
            label="Transmission"
            value={formData.transmission}
            onChangeText={(text) => updateFormField('transmission', text)}
            placeholder="e.g., 6-Speed Manual"
          />

          <Input
            label="Mileage"
            value={formData.mileage}
            onChangeText={(text) => updateFormField('mileage', text)}
            placeholder="Current odometer reading"
            keyboardType="numeric"
          />
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
          />
        </View>
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
    marginBottom: 20,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 8,
  },
});
