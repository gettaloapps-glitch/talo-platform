import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export type InsightMiniCardProps = {
  label: string;
  value: string;
};

export function InsightMiniCard({ label, value }: InsightMiniCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    minHeight: 84,
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: colors.textMain,
    fontWeight: '700',
  },
});
