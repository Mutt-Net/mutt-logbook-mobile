// src/screens/AnalyticsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DashboardStackScreenProps } from '../navigation/types';

type Props = DashboardStackScreenProps<'Analytics'>;

export default function AnalyticsScreen({ route }: Props) {
  const { vehicleId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Analytics coming soon (vehicle {vehicleId})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: '#8E8E93', fontSize: 16 },
});
