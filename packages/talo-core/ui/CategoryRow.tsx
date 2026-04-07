import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export type CategoryRowProps = {
  category: string;
  amount: string;
  share: string;
};

export function CategoryRow({
  category,
  amount,
  share,
}: CategoryRowProps) {
  const shareNumber = parseFloat(share.replace('%', ''));

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.topRow}>
          <Text style={styles.category} numberOfLines={1}>
            {category}
          </Text>
          <Text style={styles.share}>{share}</Text>
        </View>

        <View style={styles.barBackground}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(shareNumber, 100)}%` },
            ]}
          />
        </View>
      </View>

      <Text style={styles.amount}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  left: {
    flex: 1,
    marginRight: 10,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  category: {
    flex: 1,
    marginRight: 10,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMain,
  },

  share: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },

  barBackground: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },

  barFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
});