import { useFocusEffect } from '@react-navigation/native';
import { colors, radius, spacing, typography } from '@talo/core';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getSubscriptions } from '../../src/storage/subscriptionsStorage';
import type { Subscription } from '../../src/types/subscription';

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatBillingCycle(billingCycle: Subscription['billingCycle']) {
  return billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
}

export default function HomeScreen() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSubscriptions = useCallback(async () => {
    setIsLoading(true);

    const storedSubscriptions = await getSubscriptions();

    setSubscriptions(storedSubscriptions);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSubscriptions();
    }, [loadSubscriptions])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Subscriptions</Text>
        <Text style={styles.title}>Track upcoming recurring payments in one place.</Text>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading subscriptions...</Text>
          </View>
        ) : subscriptions.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No subscriptions yet</Text>
            <Text style={styles.cardBody}>
              Add your first subscription to start tracking renewals and monthly
              totals.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {subscriptions.map((subscription) => (
              <View key={subscription.id} style={styles.subscriptionCard}>
                <View style={styles.subscriptionHeader}>
                  <Text style={styles.subscriptionName}>{subscription.name}</Text>
                  <View style={styles.billingCyclePill}>
                    <Text style={styles.billingCycleText}>
                      {formatBillingCycle(subscription.billingCycle)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.subscriptionAmount}>
                  {formatAmount(subscription.amount, subscription.currency)}
                </Text>

                <Text style={styles.subscriptionMeta}>
                  Next payment: {subscription.nextPaymentDate}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.textMain,
    fontSize: typography.title,
    fontWeight: '700',
    lineHeight: 32,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.textMain,
    fontSize: typography.section,
    fontWeight: '600',
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 20,
  },
  loadingState: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.body,
  },
  list: {
    gap: spacing.md,
  },
  subscriptionCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  subscriptionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  subscriptionName: {
    color: colors.textMain,
    flex: 1,
    fontSize: typography.section,
    fontWeight: '600',
  },
  billingCyclePill: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  billingCycleText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  subscriptionAmount: {
    color: colors.textMain,
    fontSize: typography.section,
    fontWeight: '700',
  },
  subscriptionMeta: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 20,
  },
});
