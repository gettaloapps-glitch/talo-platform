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
import { router } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CATEGORY_OPTIONS,
  getCategoryMeta,
} from '../../src/metadata/subscriptionMeta';
import {
  getSubscriptions,
  saveSubscriptions,
} from '../../src/storage/subscriptionsStorage';
import type {
  Subscription,
  SubscriptionCategory,
} from '../../src/types/subscription';

type BillingCycleFilter = 'all' | Subscription['billingCycle'];
type CategoryFilter = 'all' | SubscriptionCategory;

const BILLING_FILTER_OPTIONS: { label: string; value: BillingCycleFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

const CATEGORY_FILTER_OPTIONS: { label: string; value: CategoryFilter }[] = [
  { label: 'All', value: 'all' },
  ...CATEGORY_OPTIONS.map((option) => ({
    label: option.meta.label,
    value: option.value,
  })),
];

function formatBillingCycle(billingCycle: Subscription['billingCycle']) {
  return billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
}

function getSubscriptionCategory(subscription: Subscription) {
  return subscription.category ?? 'other';
}

function formatSeatsBadge(subscription: Subscription) {
  if (subscription.seatsIncluded === undefined) {
    return null;
  }

  if (
    subscription.seatsUsed !== undefined &&
    subscription.seatsUsed >= subscription.seatsIncluded
  ) {
    return 'Full';
  }

  if (subscription.seatsUsed !== undefined) {
    return `${subscription.seatsUsed}/${subscription.seatsIncluded} used`;
  }

  return `${subscription.seatsIncluded} free`;
}

export default function SubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedBillingFilter, setSelectedBillingFilter] =
    useState<BillingCycleFilter>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<CategoryFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingSubscriptionId, setDeletingSubscriptionId] = useState<
    string | null
  >(null);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('USD');
  const filteredSubscriptions = useMemo(
    () =>
      subscriptions.filter((subscription) => {
        const matchesBillingCycle =
          selectedBillingFilter === 'all' ||
          subscription.billingCycle === selectedBillingFilter;
        const matchesCategory =
          selectedCategoryFilter === 'all' ||
          getSubscriptionCategory(subscription) === selectedCategoryFilter;

        return matchesBillingCycle && matchesCategory;
      }),
    [selectedBillingFilter, selectedCategoryFilter, subscriptions]
  );
  const orderedSubscriptions = useMemo(
    () =>
      [...filteredSubscriptions].sort((left, right) => right.amount - left.amount),
    [filteredSubscriptions]
  );

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

  const handleDeleteSubscription = useCallback((subscription: Subscription) => {
    if (deletingSubscriptionId !== null) {
      return;
    }

    Alert.alert(
      'Delete subscription?',
      `${subscription.name} will be removed from your list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingSubscriptionId(subscription.id);

              const currentSubscriptions = await getSubscriptions();
              const nextSubscriptions = currentSubscriptions.filter(
                (item) => item.id !== subscription.id
              );

              await saveSubscriptions(nextSubscriptions);
              setSubscriptions(nextSubscriptions);
            } finally {
              setDeletingSubscriptionId(null);
            }
          },
        },
      ]
    );
  }, [deletingSubscriptionId]);

  const handleEditSubscription = useCallback((subscription: Subscription) => {
    router.push({
      pathname: '/edit/[id]',
      params: { id: subscription.id },
    });
  }, []);

  const handleAddFirstSubscription = useCallback(() => {
    router.push('/add');
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Subscriptions</Text>
        <Text style={styles.title}>All recurring payments.</Text>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Billing cycle</Text>
          <View style={styles.filterBar}>
            {BILLING_FILTER_OPTIONS.map((option) => {
              const isSelected = option.value === selectedBillingFilter;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setSelectedBillingFilter(option.value)}
                  style={[
                    styles.filterChip,
                    isSelected ? styles.filterChipActive : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected ? styles.filterChipTextActive : undefined,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.filterBar}>
            {CATEGORY_FILTER_OPTIONS.map((option) => {
              const isSelected = option.value === selectedCategoryFilter;
              const categoryMeta =
                option.value === 'all' ? null : getCategoryMeta(option.value);

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setSelectedCategoryFilter(option.value)}
                  style={[
                    styles.filterChip,
                    isSelected ? styles.filterChipActive : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected ? styles.filterChipTextActive : undefined,
                    ]}
                  >
                    {categoryMeta ? (
                      <Text
                        style={[
                          styles.filterChipMarker,
                          { color: categoryMeta.color },
                          isSelected ? styles.filterChipTextActive : undefined,
                        ]}
                      >
                        {categoryMeta.marker}{' '}
                      </Text>
                    ) : null}
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading subscriptions...</Text>
          </View>
        ) : orderedSubscriptions.length === 0 ? (
          subscriptions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No subscriptions yet</Text>
              <Text style={styles.emptyText}>
                Add your first recurring payment to start building your list.
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
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No matches</Text>
              <Text style={styles.cardBody}>Try another filter.</Text>
            </View>
          )
        ) : (
          <View style={styles.list}>
            {orderedSubscriptions.map((subscription) => (
              <View key={subscription.id} style={styles.subscriptionCard}>
                <View style={styles.subscriptionHeader}>
                  <View style={styles.subscriptionTitleGroup}>
                    <Text numberOfLines={2} style={styles.subscriptionName}>
                      {subscription.name}
                    </Text>
                    <View style={styles.metaRow}>
                      {(() => {
                        const categoryMeta = getCategoryMeta(
                          getSubscriptionCategory(subscription)
                        );

                        return (
                          <View style={styles.categoryPill}>
                            <Text
                              style={[
                                styles.categoryMarker,
                                { color: categoryMeta.color },
                              ]}
                            >
                              {categoryMeta.marker}
                            </Text>
                            <Text style={styles.categoryText}>
                              {categoryMeta.label}
                            </Text>
                          </View>
                        );
                      })()}
                      <View style={styles.metaPill}>
                        <Text style={styles.subscriptionMeta}>
                          {subscription.nextPaymentDate}
                        </Text>
                      </View>
                      {(() => {
                        const seatsBadge = formatSeatsBadge(subscription);

                        return seatsBadge ? (
                          <View style={styles.seatsBadge}>
                            <Text style={styles.seatsBadgeText}>{seatsBadge}</Text>
                          </View>
                        ) : null;
                      })()}
                    </View>
                  </View>

                  <View style={styles.subscriptionAmountGroup}>
                    <Text style={styles.subscriptionAmount}>
                      {formatCurrency(subscription.amount, displayCurrency)}
                    </Text>
                    <View style={styles.billingCyclePill}>
                      <Text style={styles.billingCycleText}>
                        {formatBillingCycle(subscription.billingCycle)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.subscriptionActions}>
                  <Pressable
                    disabled={deletingSubscriptionId !== null}
                    onPress={() => handleEditSubscription(subscription)}
                    style={[
                      styles.secondaryAction,
                      deletingSubscriptionId !== null ? styles.disabledAction : undefined,
                    ]}
                  >
                    <Text style={styles.secondaryActionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    disabled={deletingSubscriptionId !== null}
                    onPress={() => handleDeleteSubscription(subscription)}
                    style={[
                      styles.dangerAction,
                      deletingSubscriptionId === subscription.id
                        ? styles.disabledAction
                        : undefined,
                    ]}
                  >
                    <Text style={styles.dangerActionText}>
                      {deletingSubscriptionId === subscription.id
                        ? 'Deleting...'
                        : 'Delete'}
                    </Text>
                  </Pressable>
                </View>
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
    gap: spacing.md,
    padding: spacing.xl,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textMain,
    fontSize: typography.title,
    fontWeight: '700',
    lineHeight: 32,
  },
  filterGroup: {
    gap: spacing.xs,
  },
  filterLabel: {
    color: colors.textMain,
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  filterChipMarker: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
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
    maxWidth: 280,
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
    gap: spacing.sm,
  },
  subscriptionCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  subscriptionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  subscriptionTitleGroup: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  subscriptionName: {
    color: colors.textMain,
    fontSize: typography.body,
    fontWeight: '600',
    lineHeight: 18,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  subscriptionAmountGroup: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    minWidth: 88,
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
    fontSize: typography.body,
    fontWeight: '700',
  },
  subscriptionMeta: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  metaPill: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryPill: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryMarker: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  categoryText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  seatsBadge: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  seatsBadgeText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  subscriptionActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  secondaryAction: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  secondaryActionText: {
    color: colors.textMain,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  dangerAction: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dangerActionText: {
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  disabledAction: {
    opacity: 0.6,
  },
});
