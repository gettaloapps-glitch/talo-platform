import { Expense } from '../types/expense';

export type DashboardPeriod = 'month' | 'all';

export type CategoryBreakdownItem = {
  category: string;
  total: number;
  percentage: number;
};

export type DashboardAnalytics = {
  totalSpent: number;
  exceptionalTotal: number;
  expenseCount: number;
  categoryBreakdown: CategoryBreakdownItem[];
  topCategory: CategoryBreakdownItem | null;
  dailyAverage: number;
  projectedMonthTotal: number | null;
};

function isSameMonth(dateString: string, now: Date) {
  const date = new Date(dateString);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export function filterExpensesByPeriod(
  expenses: Expense[],
  period: DashboardPeriod
): Expense[] {
  if (period === 'all') {
    return expenses;
  }

  const now = new Date();
  return expenses.filter((expense) => isSameMonth(expense.date, now));
}

export function calculateCategoryBreakdown(
  expenses: Expense[]
): CategoryBreakdownItem[] {
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  if (totalSpent === 0) {
    return [];
  }

  const grouped = expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([category, total]) => ({
      category,
      total,
      percentage: totalSpent > 0 ? (total / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function calculateDailyAverage(
  expenses: Expense[],
  period: DashboardPeriod
): number {
  if (expenses.length === 0) {
    return 0;
  }

  if (period === 'all') {
    const sortedDates = expenses
      .map((expense) => new Date(expense.date).getTime())
      .sort((a, b) => a - b);

    const firstDate = new Date(sortedDates[0]);
    const lastDate = new Date(sortedDates[sortedDates.length - 1]);

    const diffInMs = lastDate.getTime() - firstDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24)) + 1;

    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    return diffInDays > 0 ? totalSpent / diffInDays : totalSpent;
  }

  const now = new Date();
  const currentDayOfMonth = now.getDate();

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return currentDayOfMonth > 0 ? totalSpent / currentDayOfMonth : totalSpent;
}

export function calculateMonthlyProjection(
  expenses: Expense[],
  period: DashboardPeriod
): number | null {
  if (period !== 'month' || expenses.length === 0) {
    return null;
  }

  const now = new Date();
  const currentDayOfMonth = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  if (currentDayOfMonth === 0) {
    return totalSpent;
  }

  const dailyAverage = totalSpent / currentDayOfMonth;
  return dailyAverage * daysInMonth;
}

export function calculateDashboardAnalytics(
  allExpenses: Expense[],
  period: DashboardPeriod
): DashboardAnalytics {
  const expenses = filterExpensesByPeriod(allExpenses, period);

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const exceptionalTotal = expenses
    .filter((expense) => expense.exceptional)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const categoryBreakdown = calculateCategoryBreakdown(expenses);
  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;
  const dailyAverage = calculateDailyAverage(expenses, period);
  const projectedMonthTotal = calculateMonthlyProjection(expenses, period);

  return {
    totalSpent,
    exceptionalTotal,
    expenseCount: expenses.length,
    categoryBreakdown,
    topCategory,
    dailyAverage,
    projectedMonthTotal,
  };
}