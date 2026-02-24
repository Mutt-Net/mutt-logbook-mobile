import React from 'react';
import { View, StyleSheet } from 'react-native';

interface SyncStatusBadgeProps {
  isSynced: boolean;
  size?: 'small' | 'medium';
}

/**
 * Displays a visual indicator showing whether a record has been synced.
 * Orange dot = unsynced (pending sync)
 * Green dot = synced
 */
export function SyncStatusBadge({ isSynced, size = 'small' }: SyncStatusBadgeProps) {
  const dimensions = size === 'small' ? 8 : 12;
  
  return (
    <View
      style={[
        styles.badge,
        {
          width: dimensions,
          height: dimensions,
          backgroundColor: isSynced ? '#30D158' : '#FF9500',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
  },
});
