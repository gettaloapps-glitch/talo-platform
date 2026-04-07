import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DashboardPeriod } from '../../types/expense';

type PeriodSelectorProps = {
  selectedPeriod: DashboardPeriod;
  onChangePeriod: (period: DashboardPeriod) => void;
};

export function PeriodSelector({
  selectedPeriod,
  onChangePeriod,
}: PeriodSelectorProps) {
  return (
    <View style={styles.periodSelector}>
      <Pressable
        hitSlop={8}
        style={[
          styles.periodChip,
          selectedPeriod === 'thisMonth' && styles.periodChipSelected,
        ]}
        onPress={() => onChangePeriod('thisMonth')}
      >
        <Text
          style={[
            styles.periodChipText,
            selectedPeriod === 'thisMonth' && styles.periodChipTextSelected,
          ]}
        >
          This month
        </Text>
      </Pressable>

      <Pressable
        hitSlop={8}
        style={[
          styles.periodChip,
          selectedPeriod === 'lastMonth' && styles.periodChipSelected,
        ]}
        onPress={() => onChangePeriod('lastMonth')}
      >
        <Text
          style={[
            styles.periodChipText,
            selectedPeriod === 'lastMonth' && styles.periodChipTextSelected,
          ]}
        >
          Last month
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  periodSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },

  periodChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    minWidth: 110,
    alignItems: 'center',
  },

  periodChipSelected: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },

  periodChipText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },

  periodChipTextSelected: {
    color: '#FFFFFF',
  },
});