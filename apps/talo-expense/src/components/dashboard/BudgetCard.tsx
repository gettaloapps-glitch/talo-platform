import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  formatCompactCurrency,
  useTranslation,
} from '@talo/core';
import type { CurrencyCode } from '@talo/core';
import type { MonthlyBudgetSummary } from '../../services/budgetService';

type Props = {
  budget: MonthlyBudgetSummary;
  currency?: CurrencyCode;
  onPressEdit: () => void;
};

function getStatusColors(status: MonthlyBudgetSummary['status']) {
  if (status === 'danger') {
    return {
      surface: colors.dangerSoft,
      border: colors.danger,
      fill: colors.danger,
      text: colors.textMain,
    };
  }

  if (status === 'warning') {
    return {
      surface: colors.warningSoft,
      border: colors.warningBorder,
      fill: colors.warningBorder,
      text: colors.textMain,
    };
  }

  return {
    surface: colors.primarySoft,
    border: colors.border,
    fill: colors.primary,
    text: colors.textMain,
  };
}

export function BudgetCard({
  budget,
  currency = 'USD',
  onPressEdit,
}: Props) {
  const { t } = useTranslation();
  const palette = getStatusColors(budget.status);

  const getStatusMessage = () => {
    if (budget.status === 'danger') {
      return t('dashboard.budget.overBudget');
    }

    if (budget.status === 'warning') {
      return t('dashboard.budget.approaching');
    }

    return t('dashboard.budget.onTrack');
  };

  if (budget.budgetAmount === null) {
    return (
      <View
        style={[
          styles.card,
          styles.emptyCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={styles.title}>{t('dashboard.budget.title')}</Text>

        <Text style={styles.emptyTitle}>{t('dashboard.budget.noBudgetSet')}</Text>

        <Text style={styles.emptyText}>
          {budget.suggestedAmount !== null
            ? t('dashboard.budget.suggestedAmountText', {
                amount: formatCompactCurrency(budget.suggestedAmount, currency),
              })
            : t('dashboard.budget.setMonthlyBudgetText')}
        </Text>

        <Pressable style={styles.primaryButton} onPress={onPressEdit}>
          <Text style={styles.primaryButtonText}>
            {budget.suggestedAmount !== null
              ? t('dashboard.budget.useEditSuggestion')
              : t('dashboard.budget.setBudget')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const usagePercentage = budget.usagePercentage ?? 0;
  const progress = Math.min(Math.max(usagePercentage, 0), 100);
  const statusMessage = getStatusMessage();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('dashboard.budget.title')}</Text>

        <Pressable onPress={onPressEdit} hitSlop={8}>
          <Text style={styles.editText}>{t('dashboard.budget.edit')}</Text>
        </Pressable>
      </View>

      <Text style={[styles.mainValue, { color: palette.text }]}>
        {t('dashboard.budget.spentOfBudget', {
          spent: formatCompactCurrency(budget.spent, currency),
          budget: formatCompactCurrency(budget.budgetAmount, currency),
        })}
      </Text>

      <Text style={styles.statusText}>{statusMessage}</Text>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.max(progress, 4)}%`,
              backgroundColor: palette.fill,
            },
          ]}
        />
      </View>

      <Text style={styles.progressLabel}>
        {t('dashboard.budget.progressUsed', {
          progress: progress.toFixed(0),
        })}
      </Text>

      <View style={styles.metricsRow}>
        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>{t('dashboard.budget.spentLabel')}</Text>
          <Text style={styles.metricValue}>
            {formatCompactCurrency(budget.spent, currency)}
          </Text>
        </View>

        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>
            {budget.remaining !== null && budget.remaining >= 0
              ? t('dashboard.budget.remainingLabel')
              : t('dashboard.budget.overBudgetLabel')}
          </Text>
          <Text style={styles.metricValue}>
            {formatCompactCurrency(Math.abs(budget.remaining ?? 0), currency)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: colors.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  editText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  mainValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    marginBottom: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metricBlock: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.card,
    fontSize: 15,
    fontWeight: '700',
  },
});