import { useFocusEffect } from '@react-navigation/native';
import {
  colors,
  formatCurrency,
  getSettings,
  radius,
  spacing,
  typography,
} from '@talo/core';
import type { CurrencyCode } from '@talo/core';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCategoryMeta } from '../../src/metadata/subscriptionMeta';
import { getSubscriptions } from '../../src/storage/subscriptionsStorage';
import type {
  Subscription,
  SubscriptionCategory,
} from '../../src/types/subscription';

type OverviewMode = 'subscriptions' | 'categories' | 'opportunities';

const MODE_OPTIONS: { label: string; value: OverviewMode }[] = [
  { label: 'Subscriptions', value: 'subscriptions' },
  { label: 'Categories', value: 'categories' },
  { label: 'Opportunities', value: 'opportunities' },
];

function getMonthlyCost(subscription: Subscription) {
  return subscription.billingCycle === 'yearly'
    ? subscription.amount / 12
    : subscription.amount;
}

function getSubscriptionCategory(subscription: Subscription) {
  return subscription.category ?? 'other';
}

function calculateSubscriptionTotals(subscriptions: Subscription[]) {
  return subscriptions.reduce(
    (totals, subscription) => {
      if (subscription.billingCycle === 'yearly') {
        return {
          monthly: totals.monthly + subscription.amount / 12,
          yearly: totals.yearly + subscription.amount,
        };
      }

      return {
        monthly: totals.monthly + subscription.amount,
        yearly: totals.yearly + subscription.amount * 12,
      };
    },
    { monthly: 0, yearly: 0 }
  );
}

function calculateCategoryTotals(subscriptions: Subscription[]) {
  const spendByCategory = subscriptions.reduce(
    (totals, subscription) => {
      const category = getSubscriptionCategory(subscription);

      return {
        ...totals,
        [category]: totals[category] + getMonthlyCost(subscription),
      };
    },
    {
      streaming: 0,
      music: 0,
      software: 0,
      fitness: 0,
      cloud: 0,
      news: 0,
      gaming: 0,
      other: 0,
    } satisfies Record<SubscriptionCategory, number>
  );

  return Object.entries(spendByCategory)
    .map(([category, amount]) => ({
      category: category as SubscriptionCategory,
      amount,
    }))
    .filter((item) => item.amount > 0)
    .sort((left, right) => right.amount - left.amount);
}

function calculateSeatsSummary(subscriptions: Subscription[]) {
  return subscriptions.reduce(
    (summary, subscription) => {
      if (subscription.seatsIncluded === undefined) {
        return summary;
      }

      const seatsUsed = subscription.seatsUsed ?? 0;
      const freeSlots = Math.max(subscription.seatsIncluded - seatsUsed, 0);

      return {
        freeSlots: summary.freeSlots + freeSlots,
        fullPlans:
          seatsUsed >= subscription.seatsIncluded
            ? summary.fullPlans + 1
            : summary.fullPlans,
        hasSeats: true,
      };
    },
    { freeSlots: 0, fullPlans: 0, hasSeats: false }
  );
}

function formatSeatStatus(subscription: Subscription) {
  if (subscription.seatsIncluded === undefined) {
    return null;
  }

  const seatsUsed = subscription.seatsUsed ?? 0;
  const freeSlots = Math.max(subscription.seatsIncluded - seatsUsed, 0);

  if (freeSlots === 0) {
    return `${subscription.name}: Full`;
  }

  return `${subscription.name}: ${freeSlots} free`;
}

function formatFullPlansLabel(fullPlans: number) {
  return fullPlans === 1 ? '1 full plan' : `${fullPlans} full plans`;
}

function getRelativeWidth(value: number, maxValue: number): `${number}%` {
  if (maxValue <= 0) {
    return '0%';
  }

  return `${Math.max(Math.round((value / maxValue) * 100), 4)}%`;
}

function getFreeSlots(subscription: Subscription) {
  if (subscription.seatsIncluded === undefined) {
    return 0;
  }

  return Math.max(subscription.seatsIncluded - (subscription.seatsUsed ?? 0), 0);
}

export default function OverviewScreen() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('USD');
  const [selectedMode, setSelectedMode] =
    useState<OverviewMode>('subscriptions');
  const totals = useMemo(
    () => calculateSubscriptionTotals(subscriptions),
    [subscriptions]
  );
  const orderedSubscriptions = useMemo(
    () =>
      [...subscriptions].sort(
        (left, right) => getMonthlyCost(right) - getMonthlyCost(left)
      ),
    [subscriptions]
  );
  const topSubscriptions = orderedSubscriptions.slice(0, 5);
  const categoryTotals = useMemo(
    () => calculateCategoryTotals(subscriptions),
    [subscriptions]
  );
  const seatsSummary = useMemo(
    () => calculateSeatsSummary(subscriptions),
    [subscriptions]
  );
  const underusedSubscriptions = useMemo(
    () =>
      subscriptions.filter(
        (subscription) =>
          subscription.seatsIncluded !== undefined && getFreeSlots(subscription) > 0
      ),
    [subscriptions]
  );
  const potentialSavings = useMemo(
    () =>
      underusedSubscriptions.reduce(
        (total, subscription) => total + getMonthlyCost(subscription),
        0
      ),
    [underusedSubscriptions]
  );
  const highestSubscriptionCost = topSubscriptions[0]
    ? getMonthlyCost(topSubscriptions[0])
    : 0;
  const highestCategoryCost = categoryTotals[0]?.amount ?? 0;
  const loadSubscriptions = useCallback(async () => {
    setIsLoading(true);

    const [storedSubscriptions, settings] = await Promise.all([
      getSubscriptions(),
      getSettings(),
    ]);

    setSubscriptions(storedSubscriptions);
    setDisplayCurrency(settings.currency);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSubscriptions();
    }, [loadSubscriptions])
  );

  const handleShowSharedPlanDetails = useCallback(() => {
    const details = subscriptions
      .map(formatSeatStatus)
      .filter((detail): detail is string => detail !== null);

    Alert.alert(
      'Shared-plan slots',
      details.length > 0
        ? details.join('\n')
        : 'No shared-plan slots are tracked yet.'
    );
  }, [subscriptions]);

  const handleAddFirstSubscription = useCallback(() => {
    router.push('/add');
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Overview</Text>
        <Text style={styles.title}>Track recurring costs at a glance.</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTotals}>
            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>Monthly</Text>
              <Text style={styles.summaryAmountLarge}>
                {formatCurrency(totals.monthly, displayCurrency)}
              </Text>
            </View>
            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>Yearly</Text>
              <Text style={styles.summaryAmountLarge}>
                {formatCurrency(totals.yearly, displayCurrency)}
              </Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading subscriptions...</Text>
          </View>
        ) : subscriptions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Start with one subscription</Text>
            <Text style={styles.emptyText}>
              Track recurring payments, see your monthly and yearly cost, and
              spot savings opportunities as your list grows.
            </Text>
            <Pressable
              onPress={handleAddFirstSubscription}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                Add first subscription
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.dashboard}>
            <View style={styles.modeSelector}>
              {MODE_OPTIONS.map((option) => {
                const isSelected = option.value === selectedMode;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setSelectedMode(option.value)}
                    style={[
                      styles.modeButton,
                      isSelected ? styles.modeButtonActive : undefined,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        isSelected ? styles.modeButtonTextActive : undefined,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {selectedMode === 'subscriptions' ? (
              <View style={styles.modePanel}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Top subscriptions</Text>
                  <Text style={styles.sectionMeta}>By monthly cost</Text>
                </View>

                <View style={styles.metricList}>
                  {topSubscriptions.map((subscription) => {
                    const monthlyCost = getMonthlyCost(subscription);

                    return (
                      <View key={subscription.id} style={styles.metricRow}>
                        <View style={styles.metricRowHeader}>
                          <View style={styles.metricTitleGroup}>
                            <Text
                              style={styles.metricName}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {subscription.name}
                            </Text>
                            <Text style={styles.metricMeta}>
                              {
                                getCategoryMeta(
                                  getSubscriptionCategory(subscription)
                                ).label
                              }
                            </Text>
                          </View>
                          <Text style={styles.metricAmount}>
                            {formatCurrency(monthlyCost, displayCurrency)}
                          </Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: getRelativeWidth(
                                  monthlyCost,
                                  highestSubscriptionCost
                                ),
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {selectedMode === 'categories' ? (
              <View style={styles.modePanel}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Categories</Text>
                  <Text style={styles.sectionMeta}>Monthly share</Text>
                </View>

                <View style={styles.metricList}>
                  {categoryTotals.map((item) => {
                    const categoryMeta = getCategoryMeta(item.category);
                    const percentage =
                      totals.monthly > 0
                        ? Math.round((item.amount / totals.monthly) * 100)
                        : 0;

                    return (
                      <View key={item.category} style={styles.metricRow}>
                        <View style={styles.metricRowHeader}>
                          <View style={styles.categoryTitleGroup}>
                            <View
                              style={[
                                styles.categoryIndicator,
                                {
                                  borderColor: categoryMeta.color,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.categoryIndicatorText,
                                  { color: categoryMeta.color },
                                ]}
                              >
                                {categoryMeta.marker}
                              </Text>
                            </View>
                            <View style={styles.metricTitleGroup}>
                              <Text style={styles.metricName}>
                                {categoryMeta.label}
                              </Text>
                              <Text style={styles.metricMeta}>
                                {percentage}% of monthly total
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.metricAmount}>
                            {formatCurrency(item.amount, displayCurrency)}
                          </Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: getRelativeWidth(
                                  item.amount,
                                  highestCategoryCost
                                ),
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {selectedMode === 'opportunities' ? (
              <View style={styles.modePanel}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Opportunities</Text>
                  <Text style={styles.sectionMeta}>Actionable</Text>
                </View>

                <View style={styles.opportunityGrid}>
                  <Pressable
                    onPress={handleShowSharedPlanDetails}
                    style={styles.opportunityCard}
                  >
                    <Text style={styles.opportunityLabel}>Free slots</Text>
                    <Text style={styles.opportunityValue}>
                      {seatsSummary.freeSlots}
                    </Text>
                    <Text style={styles.opportunityMeta}>
                      {seatsSummary.hasSeats
                        ? `You have ${seatsSummary.freeSlots} free spots across plans`
                        : 'No shared plans tracked yet'}
                    </Text>
                  </Pressable>

                  <View style={styles.opportunityCard}>
                    <Text style={styles.opportunityLabel}>Potential savings</Text>
                    <Text style={styles.opportunityValue}>
                      {formatCurrency(potentialSavings, displayCurrency)}
                    </Text>
                    <Text style={styles.opportunityMeta}>
                      Monthly cost of underused plans
                    </Text>
                  </View>

                  {seatsSummary.fullPlans > 0 ? (
                    <View style={styles.opportunityCard}>
                      <Text style={styles.opportunityLabel}>Full plans</Text>
                      <Text style={styles.opportunityValue}>
                        {formatFullPlansLabel(seatsSummary.fullPlans)}
                      </Text>
                      <Text style={styles.opportunityMeta}>
                        No seats left on these plans
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Underused</Text>
                  <Text style={styles.sectionMeta}>
                    {underusedSubscriptions.length} plans
                  </Text>
                </View>

                {underusedSubscriptions.length === 0 ? (
                  <View style={styles.emptyMiniCard}>
                    <Text style={styles.cardBody}>
                      No underused shared plans found.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.metricList}>
                    {underusedSubscriptions.map((subscription) => (
                      <View key={subscription.id} style={styles.metricRow}>
                        <View style={styles.metricRowHeader}>
                          <View style={styles.metricTitleGroup}>
                            <Text
                              style={styles.metricName}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {subscription.name}
                            </Text>
                            <Text style={styles.metricMeta}>
                              {getFreeSlots(subscription)} free slots
                            </Text>
                          </View>
                          <Text style={styles.metricAmount}>
                            {formatCurrency(
                              getMonthlyCost(subscription),
                              displayCurrency
                            )}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}
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
    padding: spacing.xl,
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
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.textMain,
    fontSize: typography.section,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 20,
    maxWidth: 320,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
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
  summaryCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  summaryHeader: {
    gap: spacing.xs,
  },
  summaryInsight: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 20,
  },
  summaryTotals: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryTotal: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  summaryLabel: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryTotalLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryAmountLarge: {
    color: colors.textMain,
    fontSize: typography.title,
    fontWeight: '700',
    lineHeight: 32,
  },
  summaryAmount: {
    color: colors.textMain,
    fontSize: typography.body,
    fontWeight: '700',
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
  dashboard: {
    gap: spacing.md,
  },
  modeSelector: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  modeButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  modeButtonText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  modeButtonTextActive: {
    color: colors.primary,
  },
  modePanel: {
    gap: spacing.sm,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.textMain,
    fontSize: typography.section,
    fontWeight: '700',
  },
  sectionMeta: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  opportunityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  opportunityCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 140,
    padding: spacing.lg,
  },
  opportunityLabel: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  opportunityValue: {
    color: colors.textMain,
    fontSize: typography.section,
    fontWeight: '700',
    lineHeight: 24,
  },
  opportunityMeta: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 20,
  },
  metricList: {
    gap: spacing.sm,
  },
  metricRow: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  metricRowHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  metricTitleGroup: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  metricName: {
    color: colors.textMain,
    fontSize: typography.body,
    fontWeight: '700',
  },
  metricMeta: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  metricAmount: {
    color: colors.textMain,
    fontSize: typography.body,
    fontWeight: '700',
  },
  barTrack: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: spacing.sm,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: '100%',
  },
  categoryTitleGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  categoryIndicator: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  categoryIndicatorText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  emptyMiniCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  subscriptionCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  subscriptionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  subscriptionTitleGroup: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  subscriptionName: {
    color: colors.textMain,
    fontSize: typography.section,
    fontWeight: '600',
  },
  subscriptionAmountGroup: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  billingCyclePill: {
    backgroundColor: colors.successSurface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  billingCycleText: {
    color: colors.successText,
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
