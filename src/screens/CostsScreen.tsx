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
  Dimensions,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { CostService, VehicleService } from '../services/database';
import { Cost, Vehicle, WithSyncStatus } from '../types';
import { isUnsynced } from '../lib/syncUtils';
import { Card, Input, Loading, EmptyState, SyncStatusBadge } from '../components/common';

const CHART_WIDTH = Dimensions.get('window').width - 64;

const COST_CATEGORIES = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'mods', label: 'Mods' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'tax', label: 'Tax' },
  { value: 'other', label: 'Other' },
];

interface CostFormData {
  date: string;
  category: string;
  amount: string;
  description: string;
}

const initialFormData: CostFormData = {
  date: new Date().toISOString().split('T')[0],
  category: '',
  amount: '',
  description: '',
};

interface CostsScreenProps {
  vehicleId: number;
}

export default function CostsScreen({ vehicleId }: CostsScreenProps) {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState<CostFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const [vehicleData, costsData] = await Promise.all([
      VehicleService.getById(vehicleId),
      CostService.getByVehicle(vehicleId),
    ]);
    setVehicle(vehicleData);
    setCosts(costsData);
  }, [vehicleId]);

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
  }, [vehicleId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleAddPress = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setModalVisible(true);
  };

  const handleEditPress = (item: Cost) => {
    setFormData({
      date: item.date || '',
      category: item.category || '',
      amount: item.amount?.toString() || '',
      description: item.description || '',
    });
    setEditingId(item.id);
    setModalVisible(true);
  };

  const handleDeletePress = (item: Cost) => {
    Alert.alert(
      'Delete Cost Record',
      `Are you sure you want to delete "${item.description || 'Cost'}" from ${item.date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await CostService.delete(item.id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.date) {
      Alert.alert('Error', 'Date is required');
      return;
    }
    if (!formData.amount) {
      Alert.alert('Error', 'Amount is required');
      return;
    }

    setSaving(true);
    try {
      const costData = {
        vehicle_id: vehicleId,
        date: formData.date || null,
        category: formData.category || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        description: formData.description || null,
      };

      if (editingId !== null) {
        await CostService.update(editingId, costData);
      } else {
        await CostService.create(costData);
      }
      setModalVisible(false);
      await loadData();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Please try again';
      Alert.alert('Save Failed', `Could not save cost. ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) return '-';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getCategoryLabel = (category: string | null): string => {
    if (!category) return 'Cost';
    const found = COST_CATEGORIES.find(c => c.value === category);
    return found ? found.label : category;
  };

  const getCategoryColor = (category: string | null): string => {
    switch (category) {
      case 'maintenance':
        return '#FF9500';
      case 'mods':
        return '#AF52DE';
      case 'insurance':
        return '#007AFF';
      case 'fuel':
        return '#FF3B30';
      case 'tax':
        return '#34C759';
      case 'other':
        return '#8E8E93';
      default:
        return '#8E8E93';
    }
  };

  const calculateCategoryTotals = () => {
    const totals: Record<string, number> = {};
    COST_CATEGORIES.forEach(cat => {
      totals[cat.value] = 0;
    });
    costs.forEach(cost => {
      if (cost.category && totals[cost.category] !== undefined) {
        totals[cost.category] += cost.amount || 0;
      } else {
        totals['other'] += cost.amount || 0;
      }
    });
    return totals;
  };

  const categoryTotals = calculateCategoryTotals();
  const grandTotal = costs.reduce((sum, c) => sum + (c.amount || 0), 0);

  const buildBarData = () =>
    COST_CATEGORIES
      .filter(cat => categoryTotals[cat.value] > 0)
      .map(cat => ({
        value: parseFloat(categoryTotals[cat.value].toFixed(2)),
        label: cat.label.substring(0, 5),
        frontColor: getCategoryColor(cat.value),
      }));

  const barData = buildBarData();

  const renderSummaryCard = () => (
    <Card style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Spending by Category</Text>
      {barData.length > 0 ? (
        <BarChart
          data={barData}
          width={CHART_WIDTH}
          height={140}
          barWidth={Math.min(40, (CHART_WIDTH / barData.length) - 16)}
          spacing={16}
          noOfSections={4}
          barBorderRadius={4}
          yAxisTextStyle={{ color: '#8E8E93', fontSize: 10 }}
          xAxisLabelTextStyle={{ color: '#8E8E93', fontSize: 10 }}
          hideRules={false}
          rulesColor="#2C2C2E"
          isAnimated
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <View style={styles.summaryGrid}>
        {COST_CATEGORIES.filter(cat => categoryTotals[cat.value] > 0).map(cat => (
          <View key={cat.value} style={styles.summaryRow}>
            <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(cat.value) }]} />
            <Text style={styles.summaryLabel}>{cat.label}</Text>
            <Text style={styles.summaryValue}>{formatCurrency(categoryTotals[cat.value])}</Text>
          </View>
        ))}
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Grand Total</Text>
        <Text style={styles.totalValue}>{formatCurrency(grandTotal)}</Text>
      </View>
    </Card>
  );

  const renderItem = ({ item }: { item: Cost }) => (
    <Card>
      <View style={styles.itemHeader}>
        <SyncStatusBadge isSynced={!isUnsynced(item)} size="small" />
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
          <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
        </View>
        <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.itemDescription} numberOfLines={2}>
        {item.description || 'No description'}
      </Text>
      <View style={styles.itemFooter}>
        <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditPress(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePress(item)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{vehicle?.name || 'Costs'}</Text>
          <Text style={styles.headerSubtitle}>
            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {costs.length === 0 ? (
        <EmptyState
          message="No Costs"
          submessage="Add your first expense to start tracking your vehicle's costs"
        />
      ) : (
        <FlatList
          data={costs}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderSummaryCard}
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
            <Text style={styles.modalTitle}>
              {editingId !== null ? 'Edit Cost' : 'Add Cost'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label="Date *"
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
              placeholder="YYYY-MM-DD"
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                {COST_CATEGORIES.map((cat) => (
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
              label="Amount *"
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <Input
              label="Description"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="What was this expense for?"
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
  summaryCard: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  summaryGrid: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#30D158',
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
  itemDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  itemDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  itemAmount: {
    fontSize: 16,
    color: '#30D158',
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    height: 80,
    textAlignVertical: 'top',
  },
  modalSpacer: {
    height: 40,
  },
});

