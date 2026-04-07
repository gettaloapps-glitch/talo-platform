import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, useTranslation } from '@talo/core';

type Props = {
  category: string;
  date: string;
  amount: string;
  description?: string;
  exceptional?: boolean;
};

export function RecentExpenseItem({
  category,
  date,
  amount,
  description,
  exceptional,
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.leftBlock}>
          <Text style={styles.category} numberOfLines={1}>
            {category}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.date}>{date}</Text>

            {exceptional ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t('expenses.exceptional')}</Text>
              </View>
            ) : null}
          </View>

          {description ? (
            <Text style={styles.description} numberOfLines={1}>
              {description}
            </Text>
          ) : null}
        </View>

        <Text style={styles.amount}>{amount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  leftBlock: {
    flex: 1,
  },

  category: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 4,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },

  date: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  description: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },

  badge: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMain,
  },
});