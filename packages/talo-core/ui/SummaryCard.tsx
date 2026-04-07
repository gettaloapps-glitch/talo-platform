import { StyleSheet, Text, View } from 'react-native';

import type { CurrencyCode } from '../types/currency';
import { colors } from '../theme/colors';
import { formatCompactCurrency } from '../utils/currency';

export type SummaryCardProps = {
  label: string;
  value: string | number;
  type?: 'currency' | 'number';
  currency?: CurrencyCode;
  trend?: string;
  trendTone?: 'neutral' | 'positive' | 'negative';
};

function formatCompactNumber(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }

  if (absoluteValue >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return `${Math.round(value)}`;
}

function formatDisplayValue(
  value: string | number,
  type: 'currency' | 'number',
  currency: CurrencyCode
) {
  if (typeof value === 'string') {
    return value;
  }

  if (type === 'currency') {
    return formatCompactCurrency(value, currency);
  }

  return formatCompactNumber(value);
}

function getTrendColor(trendTone: SummaryCardProps['trendTone']) {
  if (trendTone === 'positive') {
    return colors.primary;
  }

  if (trendTone === 'negative') {
    return colors.danger;
  }

  return colors.textSecondary;
}

export function SummaryCard({
  label,
  value,
  type = 'currency',
  currency = 'USD',
  trend,
  trendTone = 'neutral',
}: SummaryCardProps) {
  const formattedValue = formatDisplayValue(value, type, currency);

  return (
    <View style={styles.card}>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>

      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {formattedValue}
      </Text>

      {!!trend && (
        <Text
          style={[
            styles.trend,
            {
              color: getTrendColor(trendTone),
            },
          ]}
          numberOfLines={1}
        >
          {trend}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 104,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-between',
  },

  label: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textMain,
  },

  trend: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
});