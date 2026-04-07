import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, formatCompactCurrency, useTranslation } from '@talo/core';
import type { CurrencyCode } from '@talo/core';
import type { DashboardPeriod } from '../../types/expense';

type TopCategory = {
  category: string;
  amount: number;
  share: number;
};

type Props = {
  totalSpent: number;
  exceptionalTotal: number;
  topCategory?: TopCategory;
  selectedPeriod: DashboardPeriod;
  currency?: CurrencyCode;
};

export function DashboardInsights({
  totalSpent,
  exceptionalTotal,
  topCategory,
  selectedPeriod,
  currency = 'USD',
}: Props) {
  const { t, locale } = useTranslation();

  const insights = useMemo(() => {
    const items: string[] = [];

    if (topCategory && topCategory.share > 0) {
      items.push(
        selectedPeriod === 'thisMonth'
          ? t('dashboard.topCategoryInsightThisMonth', {
              category: topCategory.category,
              share: topCategory.share.toFixed(0),
            })
          : t('dashboard.topCategoryInsight', {
              category: topCategory.category,
              share: topCategory.share.toFixed(0),
            })
      );
    }

    if (totalSpent > 0 && exceptionalTotal > 0) {
      const exceptionalShare = (exceptionalTotal / totalSpent) * 100;

      items.push(
        t('dashboard.exceptionalInsight', {
          share: exceptionalShare.toFixed(0),
          amount: formatCompactCurrency(exceptionalTotal, currency),
        })
      );
    }

    return items.slice(0, 2);
  }, [
    currency,
    exceptionalTotal,
    selectedPeriod,
    t,
    locale,
    topCategory,
    totalSpent,
  ]);

  if (!insights.length) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('dashboard.insightsTitle')}</Text>

      <View style={styles.list}>
        {insights.map((insight, index) => (
          <View key={`${insight}-${index}`} style={styles.item}>
            <View style={styles.dot} />
            <Text style={styles.text}>{insight}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});