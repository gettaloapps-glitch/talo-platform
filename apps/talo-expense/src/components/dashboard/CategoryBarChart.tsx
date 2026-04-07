import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  colors,
  formatCompactCurrency,
  useTranslation,
} from '@talo/core';
import type { CurrencyCode } from '@talo/core';
import { CategoryBreakdownItem } from '../../utils/analytics';

type Props = {
  data: CategoryBreakdownItem[];
  currency?: CurrencyCode;
};

export function CategoryBarChart({ data, currency = 'USD' }: Props) {
  const { t } = useTranslation();

  if (!data.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('dashboard.noCategoryDataYet')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {data.slice(0, 5).map((item) => (
        <View key={item.category} style={styles.row}>
          <View style={styles.labelRow}>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.amount}>
              {formatCompactCurrency(item.total, currency)}
            </Text>
          </View>

          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.max(item.percentage, 6)}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.percentage}>
            {item.percentage.toFixed(0)}%
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  row: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMain,
  },
  amount: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  track: {
    width: '100%',
    height: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  percentage: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});