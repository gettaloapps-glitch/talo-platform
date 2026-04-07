import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BudgetCard } from '../../src/components/dashboard/BudgetCard';
import { CategoryBarChart } from '../../src/components/dashboard/CategoryBarChart';
import { DashboardInsights } from '../../src/components/dashboard/DashboardInsights';
import {
  PeriodSelector,
  colors,
  formatCompactCurrency,
  getSettings,
  useTranslation,
} from '@talo/core';
import type { CurrencyCode } from '@talo/core';
import { RecentExpenseItem } from '../../src/components/dashboard/RecentExpenseItem';
import { SummaryCard } from '../../src/components/dashboard/SummaryCard';
import type { MonthlyBudgetSummary } from '../../src/services/budgetService';
import {
  getMonthlyBudgetSummary,
  removeMonthlyBudget,
  saveMonthlyBudget,
} from '../../src/services/budgetService';
import { getDashboardData } from '../../src/services/dashboardService';
import { getAllExpenses } from '../../src/services/expensesService';
import type {
  DashboardExpenseFilter,
  DashboardPeriod,
  Expense,
} from '../../src/types/expense';
import {
  getCategoryAmountMap,
  getCategoryTrend,
  getPreviousPeriodExpenses,
} from '../../src/utils/categoryInsights';
import { formatDisplayDate } from '../../src/utils/date';
import type { ExpenseCategory } from '../../src/constants/categories';

function formatAmountInput(value: string, locale?: string) {
  const digitsOnly = value.replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  return Number(digitsOnly).toLocaleString(locale);
}

function normalizeExpenseCategory(category?: string | null): ExpenseCategory {
  const normalized = (category ?? '').toLowerCase();

  const legacyMap: Record<string, ExpenseCategory> = {
    food: 'food',
    transport: 'transport',
    home: 'home',
    health: 'health',
    entertainment: 'entertainment',
    other: 'other',
  };

  return legacyMap[normalized] ?? 'other';
}

function getComparisonTrend(
  difference: number,
  t: (key: string) => string
): {
  trend: string;
  tone: 'neutral' | 'positive' | 'negative';
} {
  if (difference < 0) {
    return {
      trend: t('dashboard.vsLastMonthDown'),
      tone: 'positive',
    };
  }

  if (difference > 0) {
    return {
      trend: t('dashboard.vsLastMonthUp'),
      tone: 'negative',
    };
  }

  return {
    trend: t('dashboard.inLine'),
    tone: 'neutral',
  };
}

function getProjectedTrend(
  projectedTotal: number,
  budgetAmount: number | null,
  t: (key: string) => string
): {
  trend?: string;
  tone?: 'neutral' | 'positive' | 'negative';
} {
  if (!budgetAmount || budgetAmount <= 0) {
    return {};
  }

  if (projectedTotal > budgetAmount) {
    return {
      trend: t('dashboard.aboveBudget'),
      tone: 'negative',
    };
  }

  return {
    trend: t('dashboard.withinBudget'),
    tone: 'positive',
  };
}

export default function HomeScreen() {
  const { t, locale } = useTranslation();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedPeriod, setSelectedPeriod] =
    useState<DashboardPeriod>('thisMonth');
  const [selectedExpenseFilter, setSelectedExpenseFilter] =
    useState<DashboardExpenseFilter>('all');
  const [budgetSummary, setBudgetSummary] = useState<MonthlyBudgetSummary | null>(
    null
  );
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const loadExpenses = useCallback(async () => {
    const [savedExpenses, settings] = await Promise.all([
      getAllExpenses(),
      getSettings(),
    ]);

    setExpenses(savedExpenses);
    setCurrency(settings.currency);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  useEffect(() => {
    let isActive = true;

    const loadBudgetSummary = async () => {
      const currentMonthSpent = getDashboardData(
        expenses,
        'thisMonth',
        selectedExpenseFilter
      ).totalSpent;
      const summary = await getMonthlyBudgetSummary(currentMonthSpent);

      if (isActive) {
        setBudgetSummary(summary);
      }
    };

    void loadBudgetSummary();

    return () => {
      isActive = false;
    };
  }, [expenses, selectedExpenseFilter]);

  const dashboardData = useMemo(() => {
    return getDashboardData(expenses, selectedPeriod, selectedExpenseFilter);
  }, [expenses, selectedPeriod, selectedExpenseFilter]);

  const translatedTopCategory = useMemo(() => {
    const rawTopCategory = dashboardData.categoryBreakdown[0];

    if (!rawTopCategory) {
      return undefined;
    }

    return {
      ...rawTopCategory,
      category: t(
        `expense.categories.${normalizeExpenseCategory(rawTopCategory.category)}`
      ),
    };
  }, [dashboardData.categoryBreakdown, t, locale]);

  const chartData = useMemo(() => {
    return dashboardData.categoryBreakdown.map((item) => ({
      category: t(
        `expense.categories.${normalizeExpenseCategory(item.category)}`
      ),
      total: item.amount,
      percentage: item.share,
    }));
  }, [dashboardData.categoryBreakdown, t, locale]);

  const previousPeriodCategoryTotals = useMemo(() => {
    return getCategoryAmountMap(
      getPreviousPeriodExpenses(
        expenses,
        selectedPeriod,
        selectedExpenseFilter
      )
    );
  }, [expenses, selectedPeriod, selectedExpenseFilter]);

  const topCategories = useMemo(() => {
    return [...dashboardData.categoryBreakdown]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map((category) => {
        const translatedCategory = t(
          `expense.categories.${normalizeExpenseCategory(category.category)}`
        );
        const previousAmount = previousPeriodCategoryTotals[category.category] ?? 0;

        return {
          category: translatedCategory,
          total: category.amount,
          percentage: category.share,
          trend: getCategoryTrend(
            category.amount,
            previousAmount,
            t('dashboard.newCategoryTrend')
          ),
        };
      });
  }, [dashboardData.categoryBreakdown, previousPeriodCategoryTotals, t, locale]);

  const validRecentExpenses = useMemo(() => {
    return dashboardData.recentExpenses.filter(
      (expense) =>
        expense &&
        typeof expense.id === 'string' &&
        expense.id.length > 0 &&
        typeof expense.category === 'string' &&
        expense.category.length > 0 &&
        typeof expense.date === 'string' &&
        expense.date.length > 0 &&
        typeof expense.amount === 'number' &&
        Number.isFinite(expense.amount)
    );
  }, [dashboardData.recentExpenses]);

  const averageExpenseTrend = getComparisonTrend(
    dashboardData.differenceVsPreviousMonth,
    t
  );

  const dailyAverageTrend =
    selectedPeriod === 'thisMonth'
      ? getComparisonTrend(dashboardData.differenceVsPreviousMonth, t)
      : {
        trend: t('dashboard.fullMonth'),
        tone: 'neutral' as const,
      };

  const projectedTrend = getProjectedTrend(
    dashboardData.projectedTotal,
    budgetSummary?.budgetAmount ?? null,
    t
  );

  const comparisonText =
    dashboardData.differenceVsPreviousMonth > 0
      ? t('dashboard.comparisonTextUp')
      : dashboardData.differenceVsPreviousMonth < 0
        ? t('dashboard.comparisonTextDown')
        : t('dashboard.comparisonTextSame');

  const handleQuickAdd = () => {
    router.push('/add');
  };

  const handleOpenBudgetModal = () => {
    const currentValue =
      budgetSummary?.budgetAmount ?? budgetSummary?.suggestedAmount ?? 0;

    setBudgetInput(currentValue ? currentValue.toLocaleString(locale) : '');
    setBudgetModalVisible(true);
  };

  const handleSaveBudget = async () => {
    const numericValue = Number(
      budgetInput.replace(/\./g, '').replace(/,/g, '')
    );

    if (!numericValue || numericValue <= 0) {
      Alert.alert(
        t('dashboard.invalidBudgetTitle'),
        t('dashboard.invalidBudgetMessage')
      );
      return;
    }

    await saveMonthlyBudget(numericValue);
    setBudgetModalVisible(false);
    await loadExpenses();
  };

  const handleRemoveBudget = async () => {
    Alert.alert(
      t('dashboard.removeBudgetTitle'),
      t('dashboard.removeBudgetMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await removeMonthlyBudget();
            setBudgetModalVisible(false);
            setBudgetInput('');
            await loadExpenses();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View key={`dashboard-locale-${locale}`}>
            {expenses.length === 0 ? (
              <View style={styles.welcomeWrapper}>
                <View style={styles.heroCard}>
                  <View style={styles.heroIllustration}>
                    <View style={styles.heroCircle} />
                    <View style={styles.heroCardBack} />
                    <View style={styles.heroCardFront}>
                      <View style={styles.heroBarLarge} />
                      <View style={styles.heroBarMedium} />
                      <View style={styles.heroBarSmall} />
                      <View style={styles.heroTag} />
                    </View>
                  </View>

                  <View style={styles.brandPill}>
                    <Text style={styles.brandPillText}>Talo</Text>
                  </View>

                  <Text style={styles.welcomeTitle}>
                    {t('dashboard.welcomeTitle')}
                  </Text>

                  <Text style={styles.welcomeText}>
                    {t('dashboard.welcomeText')}
                  </Text>

                  <View style={styles.featureList}>
                    <View style={styles.featureItem}>
                      <View style={styles.featureDot} />
                      <Text style={styles.featureText}>
                        {t('dashboard.quickEntry')}
                      </Text>
                    </View>

                    <View style={styles.featureItem}>
                      <View style={styles.featureDot} />
                      <Text style={styles.featureText}>
                        {t('dashboard.monthlyOverview')}
                      </Text>
                    </View>

                    <View style={styles.featureItem}>
                      <View style={styles.featureDot} />
                      <Text style={styles.featureText}>
                        {t('dashboard.csvExport')}
                      </Text>
                    </View>
                  </View>

                  <Pressable style={styles.primaryButton} onPress={handleQuickAdd}>
                    <Text style={styles.primaryButtonText}>
                      {t('dashboard.addFirstExpense')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.title}>{t('dashboard.overview')}</Text>

                <PeriodSelector
                  selectedPeriod={selectedPeriod}
                  onChangePeriod={setSelectedPeriod}
                  thisMonthLabel={t('dashboard.thisMonth')}
                  lastMonthLabel={t('dashboard.lastMonth')}
                />

                <View style={styles.filterChipsRow}>
                  <Pressable
                    style={[
                      styles.filterChip,
                      selectedExpenseFilter === 'all' && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedExpenseFilter('all')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedExpenseFilter === 'all' &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {t('expenses.all')}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.filterChip,
                      selectedExpenseFilter === 'withoutExceptional' &&
                        styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedExpenseFilter('withoutExceptional')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedExpenseFilter === 'withoutExceptional' &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {t('dashboard.withoutExceptional')}
                    </Text>
                  </Pressable>
                </View>

                {budgetSummary && selectedPeriod === 'thisMonth' && (
                  <BudgetCard
                    key={`budget-card-${locale}`}
                    budget={budgetSummary}
                    currency={currency}
                    onPressEdit={handleOpenBudgetModal}
                  />
                )}

                <View style={styles.summaryRow}>
                  <SummaryCard
                    key={`summary-total-${locale}`}
                    label={t('dashboard.totalSpent')}
                    value={dashboardData.totalSpent}
                    type="currency"
                    currency={currency}
                  />

                  <SummaryCard
                    key={`summary-exceptional-${locale}`}
                    label={t('dashboard.exceptional')}
                    value={dashboardData.exceptionalTotal}
                    type="currency"
                    currency={currency}
                  />

                  <SummaryCard
                    key={`summary-count-${locale}`}
                    label={t('dashboard.expenseCount')}
                    value={dashboardData.expenseCount}
                    type="number"
                  />
                </View>

                <View
                  key={`summary-row-last-${locale}-${selectedPeriod}`}
                  style={[styles.summaryRow, styles.summaryRowLast]}
                >
                  <SummaryCard
                    key={`summary-average-${locale}-${selectedPeriod}`}
                    label={t('dashboard.averageExpense')}
                    value={dashboardData.averageExpense}
                    type="currency"
                    currency={currency}
                    trend={averageExpenseTrend.trend}
                    trendTone={averageExpenseTrend.tone}
                  />

                  <SummaryCard
                    key={`summary-daily-${locale}-${selectedPeriod}`}
                    label={t('dashboard.dailyAverage')}
                    value={dashboardData.dailyAverage}
                    type="currency"
                    currency={currency}
                    trend={dailyAverageTrend.trend}
                    trendTone={dailyAverageTrend.tone}
                  />

                  <SummaryCard
                    key={`summary-projected-${locale}-${selectedPeriod}`}
                    label={
                      selectedPeriod === 'thisMonth'
                        ? t('dashboard.projectedTotal')
                        : t('dashboard.monthTotal')
                    }
                    value={dashboardData.projectedTotal}
                    type="currency"
                    currency={currency}
                    trend={projectedTrend.trend}
                    trendTone={projectedTrend.tone ?? 'neutral'}
                  />
                </View>


                <DashboardInsights
                  totalSpent={dashboardData.totalSpent}
                  exceptionalTotal={dashboardData.exceptionalTotal}
                  topCategory={translatedTopCategory}
                  selectedPeriod={selectedPeriod}
                  currency={currency}
                />

                <View style={styles.topCategoryCard}>
                  <Text style={styles.topCategoryLabel}>
                    {t('dashboard.topCategories')}
                  </Text>

                  {topCategories.length === 0 ? (
                    <View style={styles.topCategoryEmptyState}>
                      <Text style={styles.topCategoryEmptyText}>
                        {t('dashboard.noCategoryDataYet')}
                      </Text>
                    </View>
                  ) : (
                    topCategories.map((category) => (
                      <View
                        key={category.category}
                        style={styles.topCategoryRow}
                      >
                        <View style={styles.topCategoryRowHeader}>
                          <Text style={styles.topCategoryName}>
                            {category.category}
                          </Text>
                          <View style={styles.topCategoryValueGroup}>
                            <Text style={styles.topCategoryValue}>
                              {formatCompactCurrency(category.total, currency)} ·{' '}
                              {category.percentage.toFixed(0)}%
                            </Text>
                            <Text
                              style={[
                                styles.topCategoryTrend,
                                category.trend.tone === 'positive' &&
                                  styles.topCategoryTrendPositive,
                                category.trend.tone === 'negative' &&
                                  styles.topCategoryTrendNegative,
                              ]}
                            >
                              {category.trend.label}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.topCategoryTrack}>
                          <View
                            style={[
                              styles.topCategoryFill,
                              {
                                width: `${Math.max(category.percentage, 6)}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {t('dashboard.spendingByCategory')}
                  </Text>
                  <CategoryBarChart data={chartData} currency={currency} />
                </View>

                {selectedPeriod === 'thisMonth' && (
                  <View
                    key={`comparison-card-${locale}-${dashboardData.differenceVsPreviousMonth}`}
                    style={styles.comparisonCard}
                  >
                    <Text style={styles.comparisonTitle}>
                      {t('dashboard.vsLastMonth')}
                    </Text>
                    <Text style={styles.comparisonNote}>
                      {t('dashboard.comparisonNote')}
                    </Text>

                    <Text style={styles.comparisonMain}>
                      {dashboardData.differenceVsPreviousMonth >= 0 ? '+' : '-'}
                      {formatCompactCurrency(
                        Math.abs(dashboardData.differenceVsPreviousMonth),
                        currency
                      )}
                    </Text>

                    <Text style={styles.comparisonText}>{comparisonText}</Text>
                  </View>
                )}

                {dashboardData.biggestExpense && (
                  <View style={styles.biggestCard}>
                    <Text style={styles.biggestLabel}>
                      {t('dashboard.largestPurchase')}
                    </Text>

                    <Text style={styles.biggestCategory}>
                      {t(
                        `expense.categories.${normalizeExpenseCategory(
                          dashboardData.biggestExpense.category
                        )}`
                      )}
                    </Text>

                    {!!dashboardData.biggestExpense.description && (
                      <Text style={styles.biggestDescription}>
                        {dashboardData.biggestExpense.description}
                      </Text>
                    )}

                    <Text style={styles.biggestAmount}>
                      {formatCompactCurrency(
                        dashboardData.biggestExpense.amount,
                        currency
                      )}
                    </Text>

                    <View style={styles.biggestDatePill}>
                      <Text style={styles.biggestDate}>
                        {formatDisplayDate(dashboardData.biggestExpense.date)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {t('dashboard.lastExpenses')}
                  </Text>

                  {validRecentExpenses.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyTitle}>
                        {t('dashboard.noRecentExpenses')}
                      </Text>
                      <Text style={styles.emptyText}>
                        {t('dashboard.noRecentExpensesSubtitle')}
                      </Text>
                    </View>
                  ) : (
                    validRecentExpenses.map((expense) => (
                      <RecentExpenseItem
                        key={expense.id}
                        category={t(
                          `expense.categories.${normalizeExpenseCategory(
                            expense.category
                          )}`
                        )}
                        date={formatDisplayDate(expense.date)}
                        amount={formatCompactCurrency(expense.amount, currency)}
                        description={expense.description}
                        exceptional={expense.exceptional}
                      />
                    ))
                  )}
                </View>
              </>
            )}

            <Modal
              transparent
              animationType="fade"
              visible={budgetModalVisible}
              onRequestClose={() => setBudgetModalVisible(false)}
            >
              <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>
                    {t('dashboard.monthlyBudget')}
                  </Text>

                  <Text style={styles.modalText}>
                    {budgetSummary?.suggestedAmount && !budgetSummary?.budgetAmount
                      ? t('dashboard.budgetPrefill')
                      : t('dashboard.budgetCurrentMonth')}
                  </Text>

                  <TextInput
                    value={budgetInput}
                    onChangeText={(text) =>
                      setBudgetInput(formatAmountInput(text, locale))
                    }
                    keyboardType="numeric"
                    placeholder={t('dashboard.enterBudget')}
                    placeholderTextColor={colors.placeholder}
                    style={styles.modalInput}
                  />

                  <View style={styles.modalActions}>
                    <Pressable
                      style={styles.modalSecondaryButton}
                      onPress={() => setBudgetModalVisible(false)}
                    >
                      <Text style={styles.modalSecondaryButtonText}>
                        {t('common.cancel')}
                      </Text>
                    </Pressable>

                    {!!budgetSummary?.budgetAmount && (
                      <Pressable
                        style={styles.modalDangerButton}
                        onPress={handleRemoveBudget}
                      >
                        <Text style={styles.modalDangerButtonText}>
                          {t('common.delete')}
                        </Text>
                      </Pressable>
                    )}

                    <Pressable
                      style={styles.modalPrimaryButton}
                      onPress={handleSaveBudget}
                    >
                      <Text style={styles.modalPrimaryButtonText}>
                        {t('common.save')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    position: 'relative',
  },
  container: {
    padding: 24,
    paddingBottom: 120,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 18,
    marginTop: 4,
  },
  welcomeWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,

    elevation: 4,
  },
  heroIllustration: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  heroCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primarySoft,
  },
  heroCardBack: {
    position: 'absolute',
    width: 150,
    height: 110,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    transform: [{ rotate: '-8deg' }, { translateX: -10 }, { translateY: 8 }],
  },
  heroCardFront: {
    width: 170,
    height: 120,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    justifyContent: 'center',
  },
  heroBarLarge: {
    height: 14,
    width: '72%',
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginBottom: 10,
  },
  heroBarMedium: {
    height: 10,
    width: '55%',
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    marginBottom: 8,
  },
  heroBarSmall: {
    height: 10,
    width: '40%',
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  heroTag: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textMain,
  },
  brandPill: {
    alignSelf: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    marginBottom: 18,
  },
  brandPillText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  welcomeTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.textMain,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  featureList: {
    marginBottom: 24,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 10,
  },
  featureText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,

    elevation: 6,
  },
  primaryButtonText: {
    color: colors.card,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textMain,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryRowLast: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 14,
  },
  sectionEmptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emptyState: {
    paddingVertical: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMain,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  comparisonCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 6,
  },
  comparisonNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  comparisonMain: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 4,
  },
  comparisonText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMain,
  },
  topCategoryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  topCategoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  topCategoryEmptyState: {
    paddingVertical: 4,
  },
  topCategoryEmptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  topCategoryRow: {
    gap: 8,
    marginBottom: 14,
  },
  topCategoryRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topCategoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMain,
  },
  topCategoryValueGroup: {
    alignItems: 'flex-end',
    gap: 2,
  },
  topCategoryValue: {
    minWidth: 84,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'right',
  },
  topCategoryTrend: {
    minWidth: 84,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'right',
  },
  topCategoryTrendPositive: {
    color: colors.successText,
  },
  topCategoryTrendNegative: {
    color: colors.danger,
  },
  topCategoryTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    overflow: 'hidden',
  },
  topCategoryFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  biggestCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  biggestLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  biggestCategory: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  biggestDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  biggestAmount: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 8,
  },
  biggestDatePill: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  biggestDate: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  modalInput: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.textMain,
    backgroundColor: colors.card,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalSecondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  modalSecondaryButtonText: {
    color: colors.textMain,
    fontSize: 15,
    fontWeight: '700',
  },
  modalDangerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  modalDangerButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  modalPrimaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  modalPrimaryButtonText: {
    color: colors.card,
    fontSize: 15,
    fontWeight: '700',
  },
});
