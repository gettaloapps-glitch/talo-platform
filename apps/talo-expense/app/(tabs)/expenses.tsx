import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import FilterDropdown from '../../src/components/FilterDropdown';
import {
  EXPENSE_CATEGORIES,
  ExpenseCategory,
} from '../../src/constants/categories';
import {
  getAllExpenses,
  removeExpense,
} from '../../src/services/expensesService';
import {
  colors,
  formatCurrency,
  getSettings,
  useTranslation,
} from '@talo/core';
import type { CurrencyCode } from '@talo/core';
import { Expense } from '../../src/types/expense';
import { exportExpensesToCSV } from '../../src/utils/exportCsv';

type MonthFilterOption = 'all' | string;
type OpenDropdown = 'month' | 'category' | null;
type SortOption = 'newest' | 'highest' | 'lowest';
type QuickFilterOption = 'all' | 'month' | 'exceptional';

function normalizeExpenseCategory(category: string): ExpenseCategory {
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

function getDateLocale(locale: string) {
  switch (locale) {
    case 'es':
      return 'es-AR';
    case 'pt':
      return 'pt-BR';
    default:
      return 'en-US';
  }
}

type LocalizedDateFormatter = {
  formatDisplayDate: (dateString: string) => string;
  getMonthLabel: (dateString: string) => string;
  formatMonthKeyLabel: (monthKey: string) => string;
};

function buildDateFormatters(locale: string): LocalizedDateFormatter {
  const dateLocale = getDateLocale(locale);

  return {
    formatDisplayDate: (dateString: string) => {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      const monthLabel = new Intl.DateTimeFormat(dateLocale, {
        month: 'short',
      }).format(date);

      return `${day} ${monthLabel} ${year}`;
    },

    getMonthLabel: (dateString: string) => {
      const [year, month] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, 1);

      const monthLabel = new Intl.DateTimeFormat(dateLocale, {
        month: 'long',
      }).format(date);

      return `${monthLabel} ${year}`;
    },

    formatMonthKeyLabel: (monthKey: string) => {
      const [year, month] = monthKey.split('-').map(Number);
      const date = new Date(year, month - 1, 1);

      const monthLabel = new Intl.DateTimeFormat(dateLocale, {
        month: 'long',
      }).format(date);

      return `${monthLabel} ${year}`;
    },
  };
}

export default function ExpensesScreen() {
  const { t, locale } = useTranslation();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthFilterOption>('all');
  const [selectedCategory, setSelectedCategory] = useState<
    ExpenseCategory | 'all'
  >('all');
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [quickFilter, setQuickFilter] = useState<QuickFilterOption>('all');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  const { formatDisplayDate, getMonthLabel, formatMonthKeyLabel } = useMemo(
    () => buildDateFormatters(locale),
    [locale]
  );

  const QUICK_FILTERS: { label: string; value: QuickFilterOption }[] = useMemo(
    () => [
      { label: t('expenses.all'), value: 'all' },
      { label: t('expenses.currentMonth'), value: 'month' },
      { label: t('expenses.exceptional'), value: 'exceptional' },
    ],
    [t, locale]
  );

  const SORT_OPTIONS: { label: string; value: SortOption }[] = useMemo(
    () => [
      { label: t('expenses.newest'), value: 'newest' },
      { label: t('expenses.highest'), value: 'highest' },
      { label: t('expenses.lowest'), value: 'lowest' },
    ],
    [t, locale]
  );

  const getCurrentMonthKey = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  };

  const loadExpenses = useCallback(async () => {
    const [savedExpenses, settings] = await Promise.all([
      getAllExpenses(),
      getSettings(),
    ]);

    setExpenses(savedExpenses);
    setCurrency(settings.currency);
  }, []);

  const closeSwipeable = (id: string) => {
    swipeableRefs.current[id]?.close();
  };

  const closeAllSwipeables = (exceptId?: string) => {
    Object.entries(swipeableRefs.current).forEach(([id, ref]) => {
      if (id !== exceptId) {
        ref?.close();
      }
    });
  };

  const handleDeleteExpense = (id: string) => {
    closeSwipeable(id);

    Alert.alert(t('expenses.deleteTitle'), t('expenses.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await removeExpense(id);
          await loadExpenses();
        },
      },
    ]);
  };

  const handleEditExpense = (id: string) => {
    closeSwipeable(id);

    router.push({
      pathname: '/add',
      params: { expenseId: id },
    });
  };

  const handleClearFilters = () => {
    setSelectedMonth('all');
    setSelectedCategory('all');
    setQuickFilter('all');
    setSearchQuery('');
    setSortBy('newest');
    setOpenDropdown(null);
  };

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  const monthOptions = useMemo(() => {
    const uniqueMonthKeys = Array.from(
      new Set(expenses.map((expense) => expense.date.slice(0, 7)))
    ).sort((a, b) => b.localeCompare(a));

    return [
      { label: t('expenses.all'), value: 'all' },
      ...uniqueMonthKeys.map((monthKey) => ({
        label: formatMonthKeyLabel(monthKey),
        value: monthKey,
      })),
    ];
  }, [expenses, t, formatMonthKeyLabel, locale]);

  const categoryOptions = useMemo(
    () => [
      { label: t('expenses.all'), value: 'all' },
      ...EXPENSE_CATEGORIES.map((category) => ({
        label: t(`expense.categories.${category}`),
        value: category,
      })),
    ],
    [t, locale]
  );

  const filteredExpenses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const currentMonthKey = getCurrentMonthKey();

    return expenses.filter((expense) => {
      const normalizedCategory = normalizeExpenseCategory(expense.category);
      const translatedCategory = t(
        `expense.categories.${normalizedCategory}`
      ).toLowerCase();

      const matchesMonth =
        selectedMonth === 'all' || expense.date.slice(0, 7) === selectedMonth;

      const matchesCategory =
        selectedCategory === 'all' || normalizedCategory === selectedCategory;

      const matchesExceptional =
        quickFilter !== 'exceptional' || expense.exceptional;

      const matchesQuickMonth =
        quickFilter !== 'month' || expense.date.slice(0, 7) === currentMonthKey;

      const matchesSearch =
        normalizedQuery.length === 0 ||
        translatedCategory.includes(normalizedQuery) ||
        (expense.description ?? '').toLowerCase().includes(normalizedQuery) ||
        (expense.category ?? '').toLowerCase().includes(normalizedQuery);

      return (
        matchesMonth &&
        matchesCategory &&
        matchesExceptional &&
        matchesQuickMonth &&
        matchesSearch
      );
    });
  }, [
    expenses,
    selectedMonth,
    selectedCategory,
    quickFilter,
    searchQuery,
    t,
    locale,
  ]);

  const filteredTotal = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const handleExport = async () => {
    try {
      await exportExpensesToCSV(filteredExpenses);
    } catch {
      Alert.alert(
        t('expenses.exportErrorTitle'),
        t('expenses.exportErrorMessage')
      );
    }
  };

  const sortedExpenses = useMemo(() => {
    const items = [...filteredExpenses];

    if (sortBy === 'highest') {
      return items.sort((a, b) => b.amount - a.amount);
    }

    if (sortBy === 'lowest') {
      return items.sort((a, b) => a.amount - b.amount);
    }

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredExpenses, sortBy]);

  const groupedExpenses = useMemo(() => {
    return sortedExpenses.reduce<Record<string, Expense[]>>((acc, expense) => {
      const monthLabel = getMonthLabel(expense.date);

      if (!acc[monthLabel]) {
        acc[monthLabel] = [];
      }

      acc[monthLabel].push(expense);
      return acc;
    }, {});
  }, [sortedExpenses, getMonthLabel]);

  const groupedExpensesArray = useMemo(
    () => Object.entries(groupedExpenses),
    [groupedExpenses]
  );

  const toggleDropdown = (dropdown: OpenDropdown) => {
    setOpenDropdown((current) => (current === dropdown ? null : dropdown));
  };

  const hasActiveSearch = searchQuery.trim().length > 0;

  const hasActiveFilters =
    selectedMonth !== 'all' ||
    selectedCategory !== 'all' ||
    quickFilter !== 'all' ||
    hasActiveSearch ||
    sortBy !== 'newest';

  const isGroupedView = sortBy === 'newest';
  const isAnyDropdownOpen = openDropdown !== null;

  const renderLeftActions = (expenseId: string) => (
    <Pressable
      style={styles.leftAction}
      onPress={() => handleEditExpense(expenseId)}
    >
      <Text style={styles.actionText}>{t('common.edit')}</Text>
    </Pressable>
  );

  const renderRightActions = (expenseId: string) => (
    <Pressable
      style={styles.rightAction}
      onPress={() => handleDeleteExpense(expenseId)}
    >
      <Text style={styles.actionText}>{t('common.delete')}</Text>
    </Pressable>
  );

  const renderExpenseCard = (expense: Expense) => {
    const normalizedCategory = normalizeExpenseCategory(expense.category);

    return (
      <Swipeable
        key={expense.id}
        ref={(ref) => {
          swipeableRefs.current[expense.id] = ref;
        }}
        onSwipeableOpen={() => closeAllSwipeables(expense.id)}
        renderLeftActions={() => renderLeftActions(expense.id)}
        renderRightActions={() => renderRightActions(expense.id)}
        overshootLeft={false}
        overshootRight={false}
      >
        <View style={styles.expenseCardWrapper}>
          <View style={styles.expenseCard}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardTopLeft}>
                <Text style={styles.category} numberOfLines={1}>
                  {t(`expense.categories.${normalizedCategory}`)}
                </Text>

                {!!expense.description && (
                  <Text style={styles.description} numberOfLines={1}>
                    {expense.description}
                  </Text>
                )}
              </View>

              <Text style={styles.date}>{formatDisplayDate(expense.date)}</Text>
            </View>

            <View style={styles.cardBottomRow}>
              <Text style={styles.amount}>
                {formatCurrency(expense.amount, currency)}
              </Text>

              {expense.exceptional ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {t('expenses.exceptional')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Swipeable>
    );
  };

  const renderListHeader = () => (
    <View style={styles.screenContent}>
      <Text style={styles.title}>{t('expenses.title')}</Text>

      <View style={styles.topActionsRow}>
        <Pressable
          style={[
            styles.exportButton,
            sortedExpenses.length === 0 && { opacity: 0.5 },
          ]}
          onPress={handleExport}
          disabled={sortedExpenses.length === 0}
        >
          <Text style={styles.exportButtonText}>{t('expenses.exportCsv')}</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrapper}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('expenses.searchPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filtersSection}>
        <View style={styles.filtersRow}>
          <View style={styles.filterHalf}>
            <FilterDropdown
              label={t('expenses.month')}
              options={monthOptions}
              selectedValue={selectedMonth}
              isOpen={openDropdown === 'month'}
              onToggle={() => {
                Keyboard.dismiss();
                toggleDropdown('month');
              }}
              onSelect={(value: string) => {
                setSelectedMonth(value);
                setOpenDropdown(null);
              }}
            />
          </View>

          <View style={styles.filterHalf}>
            <FilterDropdown
              label={t('expenses.category')}
              options={categoryOptions}
              selectedValue={selectedCategory}
              isOpen={openDropdown === 'category'}
              onToggle={() => {
                Keyboard.dismiss();
                toggleDropdown('category');
              }}
              onSelect={(value: string) => {
                setSelectedCategory(value as ExpenseCategory | 'all');
                setOpenDropdown(null);
              }}
            />
          </View>
        </View>

        {!isAnyDropdownOpen ? (
          <>
            <View style={styles.filterBlock}>
              <Text style={styles.blockLabel}>{t('expenses.quickFilters')}</Text>

              <View style={styles.quickFiltersRow}>
                {QUICK_FILTERS.map((filter) => {
                  const isActive = quickFilter === filter.value;

                  return (
                    <Pressable
                      key={filter.value}
                      style={[
                        styles.quickChip,
                        {
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          minHeight: 32,
                        },
                        isActive && styles.quickChipActive,
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setQuickFilter(filter.value);
                      }}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          { fontSize: 12 },
                          isActive && styles.quickChipTextActive,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterBlock}>
              <Text style={styles.blockLabel}>{t('expenses.sortBy')}</Text>

              <View style={styles.sortRow}>
                {SORT_OPTIONS.map((option) => {
                  const isActive = sortBy === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.sortChip,
                        {
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          minHeight: 32,
                        },
                        isActive && styles.sortChipActive,
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setSortBy(option.value);
                      }}
                    >
                      <Text
                        style={[
                          styles.sortChipText,
                          { fontSize: 12 },
                          isActive && styles.sortChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.filteredSummary}>
        <View>
          <Text style={styles.filteredLabel}>{t('expenses.filteredTotal')}</Text>
          <Text style={styles.filteredTotal}>
            {formatCurrency(filteredTotal, currency)}
          </Text>
        </View>

        <View style={styles.summaryRight}>
          <Text style={styles.filteredCount}>
            {filteredExpenses.length}{' '}
            {filteredExpenses.length === 1
              ? t('expenses.expenseSingular')
              : t('expenses.expensePlural')}
          </Text>

          {hasActiveFilters ? (
            <Pressable onPress={handleClearFilters} hitSlop={8}>
              <Text style={styles.clearText}>{t('expenses.clearFilters')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {sortedExpenses.length > 1 ? (
        <Text style={styles.listHint}>{t('expenses.swipeHint')}</Text>
      ) : null}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>{t('expenses.noExpensesFound')}</Text>
      <Text style={styles.emptyStateText}>
        {hasActiveSearch || hasActiveFilters
          ? t('expenses.noExpensesFiltered')
          : t('expenses.noExpensesInitial')}
      </Text>

      {hasActiveFilters ? (
        <Pressable onPress={handleClearFilters} style={{ marginTop: 12 }}>
          <Text style={styles.clearText}>{t('expenses.clearFilters')}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const renderGroupedList = () => (
    <FlatList
      data={groupedExpensesArray}
      keyExtractor={(item) => item[0]}
      ListHeaderComponent={renderListHeader}
      ListEmptyComponent={renderEmptyState}
      renderItem={({ item }) => {
        const [month, monthExpenses] = item;

        return (
          <View style={styles.monthSection}>
            <Text style={styles.monthTitle}>{month}</Text>
            {monthExpenses.map((expense) => renderExpenseCard(expense))}
          </View>
        );
      }}
      style={{ flex: 1 }}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={false}
    />
  );

  const renderFlatList = () => (
    <FlatList
      data={sortedExpenses}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderListHeader}
      ListEmptyComponent={renderEmptyState}
      renderItem={({ item }) => renderExpenseCard(item)}
      style={{ flex: 1 }}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={false}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {isGroupedView ? renderGroupedList() : renderFlatList()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  screenContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 16,
  },

  topActionsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },

  exportButton: {
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },

  exportButtonText: {
    color: colors.textMain,
    fontWeight: '700',
    fontSize: 14,
  },

  searchWrapper: {
    marginBottom: 12,
  },

  searchInput: {
    height: 48,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.textMain,
  },

  filtersSection: {
    marginBottom: 14,
  },

  filtersRow: {
    flexDirection: 'row',
    gap: 10,
  },

  filterHalf: {
    flex: 1,
  },

  filterBlock: {
    marginTop: 12,
  },

  blockLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },

  quickFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  quickChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },

  quickChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },

  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  quickChipTextActive: {
    color: colors.primary,
  },

  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  sortChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },

  sortChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },

  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  sortChipTextActive: {
    color: colors.primary,
  },

  filteredSummary: {
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  filteredLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },

  filteredTotal: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMain,
  },

  summaryRight: {
    alignItems: 'flex-end',
  },

  filteredCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },

  clearText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  listHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 14,
  },

  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  monthSection: {
    marginBottom: 22,
  },

  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: colors.textMain,
    textTransform: 'capitalize',
  },

  expenseCardWrapper: {
    marginBottom: 8,
  },

  expenseCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },

  cardTopLeft: {
    flex: 1,
  },

  category: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 4,
    textTransform: 'capitalize',
  },

  date: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  description: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },

  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  amount: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMain,
  },

  badge: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMain,
  },

  leftAction: {
    flex: 1,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  rightAction: {
    flex: 1,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
  },

  actionText: {
    color: colors.card,
    fontWeight: '700',
    fontSize: 14,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },

  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 8,
  },

  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
});
