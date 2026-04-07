import { EXPENSE_CATEGORIES } from '../constants/categories';
import {
  DashboardExpenseFilter,
  DashboardPeriod,
  Expense,
} from '../types/expense';
import { filterExpensesByDashboardFilter } from '../utils/categoryInsights';

type CategoryBreakdownItem = {
  category: string;
  amount: number;
  share: number;
};

type DashboardData = {
  periodLabel: string;
  totalSpent: number;
  exceptionalTotal: number;
  expenseCount: number;
  averageExpense: number;
  dailyAverage: number;
  projectedTotal: number;
  previousMonthTotal: number;
  differenceVsPreviousMonth: number;
  percentageVsPreviousMonth: number | null;
  biggestExpense: Expense | null;
  categoryBreakdown: CategoryBreakdownItem[];
  recentExpenses: Expense[];
  comparisonLabel: string;
  comparisonText: string;
  hasMeaningfulPercentageComparison: boolean;
};

function getPeriodLabel(period: DashboardPeriod): string {
  return period === 'thisMonth' ? 'This month' : 'Last month';
}

function parseExpenseDate(dateString: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(dateString);

  if (Number.isNaN(parsed.getTime())) {
    return new Date(0);
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function isSameMonth(date: Date, targetDate: Date): boolean {
  return (
    date.getFullYear() === targetDate.getFullYear() &&
    date.getMonth() === targetDate.getMonth()
  );
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

function sortExpensesByDateDesc(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => {
    return parseExpenseDate(b.date).getTime() - parseExpenseDate(a.date).getTime();
  });
}

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function filterExpensesByMonth(expenses: Expense[], targetDate: Date): Expense[] {
  return expenses.filter((expense) =>
    isSameMonth(parseExpenseDate(expense.date), targetDate)
  );
}

function filterExpensesByDateRange(
  expenses: Expense[],
  startDate: Date,
  endDate: Date
): Expense[] {
  return expenses.filter((expense) =>
    isDateBetween(parseExpenseDate(expense.date), startDate, endDate)
  );
}

function getCategoryBreakdown(expenses: Expense[]): CategoryBreakdownItem[] {
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return EXPENSE_CATEGORIES.map((category) => {
    const amount = expenses
      .filter((expense) => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0);

    const share = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;

    return {
      category,
      amount,
      share,
    };
  })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

function getBiggestExpense(expenses: Expense[]): Expense | null {
  if (expenses.length === 0) {
    return null;
  }

  return expenses.reduce((biggest, current) =>
    current.amount > biggest.amount ? current : biggest
  );
}

function getThisMonthPeriodExpenses(expenses: Expense[], today: Date): Expense[] {
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return filterExpensesByDateRange(expenses, startOfMonth, today);
}

function getComparablePreviousPeriodExpenses(
  expenses: Expense[],
  today: Date
): Expense[] {
  const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthYear = previousMonthDate.getFullYear();
  const previousMonthIndex = previousMonthDate.getMonth();
  const previousMonthDays = getDaysInMonth(previousMonthYear, previousMonthIndex);

  const comparableDay = Math.min(today.getDate(), previousMonthDays);

  const startOfPreviousMonth = new Date(previousMonthYear, previousMonthIndex, 1);
  const endOfComparablePeriod = new Date(
    previousMonthYear,
    previousMonthIndex,
    comparableDay
  );

  return filterExpensesByDateRange(
    expenses,
    startOfPreviousMonth,
    endOfComparablePeriod
  );
}

function getLastMonthPeriodExpenses(expenses: Expense[], today: Date): Expense[] {
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  return filterExpensesByMonth(expenses, lastMonthDate);
}

function getPreviousFullMonthExpenses(expenses: Expense[], today: Date): Expense[] {
  const previousFullMonthDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);

  return filterExpensesByMonth(expenses, previousFullMonthDate);
}

function buildComparisonText(
  differenceVsPreviousMonth: number,
  percentageVsPreviousMonth: number | null,
  previousMonthTotal: number
) {
  if (previousMonthTotal <= 0 || percentageVsPreviousMonth === null) {
    return {
      comparisonText: 'No meaningful comparison yet',
      hasMeaningfulPercentageComparison: false,
    };
  }

  const absPercentage = Math.abs(percentageVsPreviousMonth);

  if (absPercentage > 999) {
    return {
      comparisonText:
        differenceVsPreviousMonth >= 0
          ? 'Spending is much higher than last month'
          : 'Spending is much lower than last month',
      hasMeaningfulPercentageComparison: false,
    };
  }

  if (differenceVsPreviousMonth > 0) {
    return {
      comparisonText: `+${percentageVsPreviousMonth.toFixed(
        0
      )}% compared to last month`,
      hasMeaningfulPercentageComparison: true,
    };
  }

  if (differenceVsPreviousMonth < 0) {
    return {
      comparisonText: `${percentageVsPreviousMonth.toFixed(
        0
      )}% compared to last month`,
      hasMeaningfulPercentageComparison: true,
    };
  }

  return {
    comparisonText: 'In line with last month',
    hasMeaningfulPercentageComparison: false,
  };
}

export function getDashboardData(
  expenses: Expense[],
  period: DashboardPeriod,
  expenseFilter: DashboardExpenseFilter = 'all'
): DashboardData {
  const today = new Date();

  const rawPeriodExpenses =
    period === 'thisMonth'
      ? getThisMonthPeriodExpenses(expenses, today)
      : getLastMonthPeriodExpenses(expenses, today);

  const rawPreviousMonthExpenses =
    period === 'thisMonth'
      ? getComparablePreviousPeriodExpenses(expenses, today)
      : getPreviousFullMonthExpenses(expenses, today);

  const periodExpenses = filterExpensesByDashboardFilter(
    rawPeriodExpenses,
    expenseFilter
  );
  const previousMonthExpenses = filterExpensesByDashboardFilter(
    rawPreviousMonthExpenses,
    expenseFilter
  );

  const sortedPeriodExpenses = sortExpensesByDateDesc(periodExpenses);

  const totalSpent = periodExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const exceptionalTotal = periodExpenses
    .filter((expense) => expense.exceptional)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const expenseCount = periodExpenses.length;

  const averageExpense = expenseCount > 0 ? totalSpent / expenseCount : 0;

  let daysElapsed = 0;
  let totalDaysInMonth = 0;

  if (period === 'thisMonth') {
    daysElapsed = today.getDate();
    totalDaysInMonth = getDaysInMonth(today.getFullYear(), today.getMonth());
  } else {
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    daysElapsed = getDaysInMonth(
      lastMonthDate.getFullYear(),
      lastMonthDate.getMonth()
    );
    totalDaysInMonth = daysElapsed;
  }

  const dailyAverage = daysElapsed > 0 ? totalSpent / daysElapsed : 0;

  const projectedTotal =
    period === 'thisMonth' ? dailyAverage * totalDaysInMonth : totalSpent;

  const previousMonthTotal = previousMonthExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const differenceVsPreviousMonth = totalSpent - previousMonthTotal;

  const percentageVsPreviousMonth =
    previousMonthTotal > 0
      ? (differenceVsPreviousMonth / previousMonthTotal) * 100
      : null;

  const biggestExpense = getBiggestExpense(periodExpenses);

  const rawCategoryBreakdown = getCategoryBreakdown(periodExpenses);
  const topCategories = rawCategoryBreakdown.slice(0, 5);
  const otherCategories = rawCategoryBreakdown.slice(5);

  let categoryBreakdown = topCategories;

  if (otherCategories.length > 0) {
    const othersAmount = otherCategories.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const othersShare = totalSpent > 0 ? (othersAmount / totalSpent) * 100 : 0;

    categoryBreakdown = [
      ...topCategories,
      {
        category: 'Others',
        amount: othersAmount,
        share: othersShare,
      },
    ];
  }

  const recentExpenses = sortedPeriodExpenses.slice(0, 4);

  const comparisonLabel =
    period === 'thisMonth'
      ? 'Compared with the same days of last month'
      : 'Compared with the previous full month';

  const { comparisonText, hasMeaningfulPercentageComparison } =
    buildComparisonText(
      differenceVsPreviousMonth,
      percentageVsPreviousMonth,
      previousMonthTotal
    );

  return {
    periodLabel: getPeriodLabel(period),
    totalSpent,
    exceptionalTotal,
    expenseCount,
    averageExpense,
    dailyAverage,
    projectedTotal,
    previousMonthTotal,
    differenceVsPreviousMonth,
    percentageVsPreviousMonth,
    biggestExpense,
    categoryBreakdown,
    recentExpenses,
    comparisonLabel,
    comparisonText,
    hasMeaningfulPercentageComparison,
  };
}
