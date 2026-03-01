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
  Switch,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { GuideService, VehicleService } from '../services/database';
import { Guide, Vehicle } from '../types';
import { Card, Button, Input, Loading, EmptyState } from '../components/common';

const GUIDE_CATEGORIES = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'modification', label: 'Modification' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
];

interface GuideFormData {
  title: string;
  category: string;
  content: string;
  interval_miles: string;
  interval_months: string;
  is_template: boolean;
}

const initialFormData: GuideFormData = {
  title: '',
  category: '',
  content: '',
  interval_miles: '',
  interval_months: '',
  is_template: false,
};

type FilterType = 'all' | 'templates' | 'vehicle';

export default function GuidesScreen() {
  const route = useRoute<RouteProp<{ Screen: { vehicleId?: number } }, 'Screen'>>();
  const vehicleId = route.params?.vehicleId ?? 0;
  const [guides, setGuides] = useState<Guide[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState<GuideFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const loadData = useCallback(async () => {
    const [vehicleData, guidesData] = await Promise.all([
      vehicleId ? VehicleService.getById(vehicleId) : Promise.resolve(null),
      GuideService.getAll(),
    ]);
    setVehicle(vehicleData);
    setGuides(guidesData);
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

  const handleSave = async () => {
    if (!formData.title) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setSaving(true);
    try {
      await GuideService.create({
        vehicle_id: formData.is_template ? null : vehicleId,
        title: formData.title,
        category: formData.category || null,
        content: formData.content || null,
        interval_miles: formData.interval_miles ? parseInt(formData.interval_miles, 10) : null,
        interval_months: formData.interval_months ? parseInt(formData.interval_months, 10) : null,
        is_template: formData.is_template,
      });
      setModalVisible(false);
      await loadData();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Please try again';
      Alert.alert('Save Failed', `Could not save guide. ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const getFilteredGuides = (): Guide[] => {
    switch (filter) {
      case 'templates':
        return guides.filter(g => g.is_template);
      case 'vehicle':
        return guides.filter(g => !g.is_template && g.vehicle_id === vehicleId);
      default:
        return guides;
    }
  };

  const getCategoryLabel = (category: string | null): string => {
    if (!category) return 'Uncategorized';
    const found = GUIDE_CATEGORIES.find(c => c.value === category);
    return found ? found.label : category;
  };

  const getCategoryColor = (category: string | null): string => {
    switch (category) {
      case 'maintenance':
        return '#FF9500';
      case 'repair':
        return '#FF3B30';
      case 'modification':
        return '#AF52DE';
      case 'inspection':
        return '#5856D6';
      default:
        return '#8E8E93';
    }
  };

  const formatInterval = (miles: number | null, months: number | null): string => {
    const parts: string[] = [];
    if (miles) parts.push(`${miles.toLocaleString()} mi`);
    if (months) parts.push(`${months} mo`);
    return parts.length > 0 ? parts.join(' / ') : 'No interval';
  };

  const renderItem = ({ item }: { item: Guide }) => (
    <Card>
      <View style={styles.itemHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
          <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
        </View>
        {item.is_template && (
          <View style={styles.templateBadge}>
            <Text style={styles.templateText}>Template</Text>
          </View>
        )}
      </View>
      <Text style={styles.itemTitle}>{item.title}</Text>
      {item.content && (
        <Text style={styles.itemContent} numberOfLines={2}>
          {item.content}
        </Text>
      )}
      <View style={styles.itemFooter}>
        <Text style={styles.itemInterval}>
          {formatInterval(item.interval_miles, item.interval_months)}
        </Text>
      </View>
    </Card>
  );

  const renderFilterButton = (type: FilterType, label: string) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === type && styles.filterButtonActive]}
      onPress={() => setFilter(type)}
    >
      <Text style={[styles.filterButtonText, filter === type && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <Loading />;
  }

  const filteredGuides = getFilteredGuides();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Guides</Text>
          <Text style={styles.headerSubtitle}>
            {vehicle ? vehicle.name : 'All Vehicles'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('templates', 'Templates')}
        {renderFilterButton('vehicle', 'Vehicle')}
      </View>

      {filteredGuides.length === 0 ? (
        <EmptyState
          message="No Guides"
          submessage="Add maintenance guides and templates to help track service intervals"
        />
      ) : (
        <FlatList
          data={filteredGuides}
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
            <Text style={styles.modalTitle}>Add Guide</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label="Title *"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Guide title"
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                {GUIDE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      formData.category === cat.value && styles.categoryChipSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat.value })}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        formData.category === cat.value && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Input
              label="Content"
              value={formData.content}
              onChangeText={(text) => setFormData({ ...formData, content: text })}
              placeholder="Guide content/instructions..."
              multiline
              numberOfLines={4}
              style={styles.textArea}
            />

            <Input
              label="Interval (miles)"
              value={formData.interval_miles}
              onChangeText={(text) => setFormData({ ...formData, interval_miles: text })}
              placeholder="e.g., 5000"
              keyboardType="numeric"
            />

            <Input
              label="Interval (months)"
              value={formData.interval_months}
              onChangeText={(text) => setFormData({ ...formData, interval_months: text })}
              placeholder="e.g., 12"
              keyboardType="numeric"
            />

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Save as Template</Text>
              <Switch
                value={formData.is_template}
                onValueChange={(value) => setFormData({ ...formData, is_template: value })}
                trackColor={{ false: '#2C2C2E', true: '#007AFF' }}
                thumbColor="#FFFFFF"
              />
            </View>

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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  templateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#34C759',
  },
  templateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  itemContent: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInterval: {
    fontSize: 14,
    color: '#FF9500',
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
  categoryPicker: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  categoryChipTextSelected: {
    fontWeight: '600',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  switchLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalSpacer: {
    height: 40,
  },
});
