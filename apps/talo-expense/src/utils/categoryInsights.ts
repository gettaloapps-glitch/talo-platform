import type {
  DashboardExpenseFilter,
  DashboardPeriod,
  Expense,
} from '../types/expense';

export type TopCategoryTrendTone = 'positive' | 'negative' | 'neutral';

export type TopCategoryTrend = {
  label: string;
  tone: TopCategoryTrendTone;
};

function parseExpenseDate(dateString: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/').map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(dateString);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function isDateBetween(date: Date, startDate: Date, endDate: Date): boolean {
  const normalizedDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const normalizedStart = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const normalizedEnd = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );

  return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
}

export function getPreviousPeriodExpenses(
  expenses: Expense[],
  period: DashboardPeriod,
  expenseFilter: DashboardExpenseFilter = 'all'
): Expense[] {
  const filteredExpenses = filterExpensesByDashboardFilter(expenses, expenseFilter);
  const today = new Date();

  if (period === 'thisMonth') {
    const previousMonthDate = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );
    const previousMonthDays = getDaysInMonth(
      previousMonthDate.getFullYear(),
      previousMonthDate.getMonth()
    );
    const comparableDay = Math.min(today.getDate(), previousMonthDays);
    const startOfPreviousMonth = new Date(
      previousMonthDate.getFullYear(),
      previousMonthDate.getMonth(),
      1
    );
    const endOfComparablePeriod = new Date(
      previousMonthDate.getFullYear(),
      previousMonthDate.getMonth(),
      comparableDay
    );

    return filteredExpenses.filter((expense) => {
      const date = parseExpenseDate(expense.date);

      return date
        ? isDateBetween(date, startOfPreviousMonth, endOfComparablePeriod)
        : false;
    });
  }

  const previousFullMonthDate = new Date(
    today.getFullYear(),
    today.getMonth() - 2,
    1
  );

  return filteredExpenses.filter((expense) => {
    const date = parseExpenseDate(expense.date);

    if (!date) {
      return false;
    }

    return (
      date.getFullYear() === previousFullMonthDate.getFullYear() &&
      date.getMonth() === previousFullMonthDate.getMonth()
    );
  });
}

export function filterExpensesByDashboardFilter(
  expenses: Expense[],
  expenseFilter: DashboardExpenseFilter = 'all'
): Expense[] {
  if (expenseFilter === 'withoutExceptional') {
    return expenses.filter((expense) => !expense.exceptional);
  }

  return expenses;
}

export function getCategoryAmountMap(
  expenses: Expense[]
): Record<string, number> {
  return expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
    return acc;
  }, {});
}

export function getCategoryTrend(
  currentAmount: number,
  previousAmount: number,
  newLabel: string
): TopCategoryTrend {
  if (currentAmount > 0 && previousAmount <= 0) {
    return {
      label: newLabel,
      tone: 'neutral',
    };
  }

  if (previousAmount <= 0) {
    return {
      label: '—',
      tone: 'neutral',
    };
  }

  const percentageChange = ((currentAmount - previousAmount) / previousAmount) * 100;
  const roundedPercentageChange = Math.round(percentageChange);

  if (roundedPercentageChange === 0) {
    return {
      label: '—',
      tone: 'neutral',
    };
  }

  if (roundedPercentageChange > 0) {
    return {
      label: `↑ +${roundedPercentageChange}%`,
      tone: 'negative',
    };
  }

  return {
    label: `↓ ${roundedPercentageChange}%`,
    tone: 'positive',
  };
}
