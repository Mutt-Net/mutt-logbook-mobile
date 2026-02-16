import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { ReminderService, VehicleService } from '../services/database';
import { Reminder, Vehicle } from '../types';
import { Card, Input, Loading, EmptyState } from '../components/common';

const REMINDER_TYPES = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'brakes', label: 'Brakes' },
  { value: 'tire_rotation', label: 'Tire Rotation' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'air_filter', label: 'Air Filter' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'coolant', label: 'Coolant' },
  { value: 'spark_plugs', label: 'Spark Plugs' },
  { value: 'battery', label: 'Battery' },
  { value: 'other', label: 'Other' },
];

interface ReminderFormData {
  type: string;
  interval_miles: string;
  interval_months: string;
  last_service_date: string;
  last_service_mileage: string;
  next_due_date: string;
  next_due_mileage: string;
  notes: string;
}

const initialFormData: ReminderFormData = {
  type: '',
  interval_miles: '',
  interval_months: '',
  last_service_date: new Date().toISOString().split('T')[0],
  last_service_mileage: '',
  next_due_date: '',
  next_due_mileage: '',
  notes: '',
};

interface RemindersScreenProps {
  vehicleId: number;
}

export default function RemindersScreen({ vehicleId }: RemindersScreenProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState<ReminderFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const [vehicleData, remindersData] = await Promise.all([
      VehicleService.getById(vehicleId),
      ReminderService.getByVehicle(vehicleId),
    ]);
    setVehicle(vehicleData);
    setReminders(remindersData);
  }, [vehicleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) {
      loadData();
    }
  }, [vehicleId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleAddPress = () => {
    setFormData(initialFormData);
    setModalVisible(true);
  };

  const calculateNextDue = () => {
    let nextDate = formData.last_service_date;
    let nextMileage = formData.last_service_mileage;

    if (formData.interval_months && formData.last_service_date) {
      const lastDate = new Date(formData.last_service_date);
      const months = parseInt(formData.interval_months, 10);
      const newDate = new Date(lastDate);
      newDate.setMonth(newDate.getMonth() + months);
      nextDate = newDate.toISOString().split('T')[0];
    }

    if (formData.interval_miles && formData.last_service_mileage) {
      const lastMileage = parseInt(formData.last_service_mileage, 10);
      const intervalMiles = parseInt(formData.interval_miles, 10);
      nextMileage = (lastMileage + intervalMiles).toString();
    }

    setFormData(prev => ({
      ...prev,
      next_due_date: nextDate,
      next_due_mileage: nextMileage,
    }));
  };

  const handleSave = async () => {
    if (!formData.type) {
      Alert.alert('Error', 'Please select a reminder type');
      return;
    }

    setSaving(true);
    try {
      await ReminderService.create({
        vehicle_id: vehicleId,
        type: formData.type,
        interval_miles: formData.interval_miles ? parseInt(formData.interval_miles, 10) : null,
        interval_months: formData.interval_months ? parseInt(formData.interval_months, 10) : null,
        last_service_date: formData.last_service_date || null,
        last_service_mileage: formData.last_service_mileage ? parseInt(formData.last_service_mileage, 10) : null,
        next_due_date: formData.next_due_date || null,
        next_due_mileage: formData.next_due_mileage ? parseInt(formData.next_due_mileage, 10) : null,
        notes: formData.notes || null,
      });
      setModalVisible(false);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save reminder');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTypeLabel = (type: string): string => {
    const found = REMINDER_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'oil_change':
        return '#FF9500';
      case 'brakes':
        return '#FF3B30';
      case 'tire_rotation':
        return '#34C759';
      case 'inspection':
        return '#007AFF';
      case 'air_filter':
        return '#AF52DE';
      case 'transmission':
        return '#00C7BE';
      case 'coolant':
        return '#5AC8FA';
      case 'spark_plugs':
        return '#FF2D55';
      case 'battery':
        return '#FFD60A';
      default:
        return '#8E8E93';
    }
  };

  const getIntervalText = (reminder: Reminder): string => {
    const parts = [];
    if (reminder.interval_miles) {
      parts.push(`${reminder.interval_miles.toLocaleString()} mi`);
    }
    if (reminder.interval_months) {
      parts.push(`${reminder.interval_months} mo`);
    }
    return parts.length > 0 ? parts.join(' / ') : 'No interval';
  };

  const renderItem = ({ item }: { item: Reminder }) => (
    <Card>
      <View style={styles.itemHeader}>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
          <Text style={styles.typeText}>{getTypeLabel(item.type)}</Text>
        </View>
        <Text style={styles.intervalText}>{getIntervalText(item)}</Text>
      </View>
      <View style={styles.dueRow}>
        <View style={styles.dueItem}>
          <Text style={styles.dueLabel}>Next Due Date</Text>
          <Text style={styles.dueValue}>{formatDate(item.next_due_date)}</Text>
        </View>
        <View style={styles.dueItem}>
          <Text style={styles.dueLabel}>Next Due Mileage</Text>
          <Text style={styles.dueValue}>
            {item.next_due_mileage ? `${item.next_due_mileage.toLocaleString()} mi` : 'N/A'}
          </Text>
        </View>
      </View>
      {item.notes && (
        <Text style={styles.itemNotes} numberOfLines={2}>
          {item.notes}
        </Text>
      )}
    </Card>
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{vehicle?.name || 'Reminders'}</Text>
          <Text style={styles.headerSubtitle}>
            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {reminders.length === 0 ? (
        <EmptyState
          message="No Service Reminders"
          submessage="Add reminders to track your vehicle's maintenance schedule"
        />
      ) : (
        <FlatList
          data={reminders}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          }
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Reminder</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typePicker}>
                {REMINDER_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeChip,
                      formData.type === type.value && styles.typeChipSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, type: type.value })}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        formData.type === type.value && styles.typeChipTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label="Interval (miles)"
                  value={formData.interval_miles}
                  onChangeText={(text) => setFormData({ ...formData, interval_miles: text })}
                  placeholder="e.g. 5000"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Input
                  label="Interval (months)"
                  value={formData.interval_months}
                  onChangeText={(text) => setFormData({ ...formData, interval_months: text })}
                  placeholder="e.g. 6"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Last Service</Text>

            <Input
              label="Last Service Date"
              value={formData.last_service_date}
              onChangeText={(text) => setFormData({ ...formData, last_service_date: text })}
              placeholder="YYYY-MM-DD"
            />

            <Input
              label="Last Service Mileage"
              value={formData.last_service_mileage}
              onChangeText={(text) => setFormData({ ...formData, last_service_mileage: text })}
              placeholder="Current odometer reading"
              keyboardType="numeric"
            />

            <TouchableOpacity style={styles.calculateButton} onPress={calculateNextDue}>
              <Text style={styles.calculateButtonText}>Calculate Next Due</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Next Due</Text>

            <Input
              label="Next Due Date"
              value={formData.next_due_date}
              onChangeText={(text) => setFormData({ ...formData, next_due_date: text })}
              placeholder="YYYY-MM-DD"
            />

            <Input
              label="Next Due Mileage"
              value={formData.next_due_mileage}
              onChangeText={(text) => setFormData({ ...formData, next_due_mileage: text })}
              placeholder="Calculated or manual"
              keyboardType="numeric"
            />

            <Input
              label="Notes"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Any additional notes..."
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />

            <View style={styles.modalSpacer} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  intervalText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  dueRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dueItem: {
    flex: 1,
  },
  dueLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  dueValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  itemNotes: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalCancel: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalSaveDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  typePicker: {
    flexDirection: 'row',
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    marginRight: 8,
    marginBottom: 8,
  },
  typeChipSelected: {
    backgroundColor: '#007AFF',
  },
  typeChipText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  typeChipTextSelected: {
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  halfField: {
    flex: 1,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 12,
  },
  calculateButton: {
    backgroundColor: '#2C2C2E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  calculateButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalSpacer: {
    height: 40,
  },
});
