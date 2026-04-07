import {
  deleteBudgetForMonth,
  getBudgetByMonth,
  getPreviousMonthBudget,
  upsertBudgetForMonth,
} from '../storage/budgetStorage';

export type BudgetStatus = 'healthy' | 'warning' | 'danger';

export type MonthlyBudgetSummary = {
  month: string;
  budgetAmount: number | null;
  suggestedAmount: number | null;
  spent: number;
  remaining: number | null;
  usagePercentage: number | null;
  status: BudgetStatus;
};

export function getCurrentMonthKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

export async function getMonthlyBudgetSummary(
  spent: number,
  month = getCurrentMonthKey()
): Promise<MonthlyBudgetSummary> {
  const currentBudget = await getBudgetByMonth(month);
  const previousBudget = await getPreviousMonthBudget(month);

  const budgetAmount = currentBudget?.amount ?? null;
  const suggestedAmount =
    budgetAmount === null ? previousBudget?.amount ?? null : null;

  if (budgetAmount === null) {
    return {
      month,
      budgetAmount: null,
      suggestedAmount,
      spent,
      remaining: null,
      usagePercentage: null,
      status: 'healthy',
    };
  }

  const usagePercentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
  const remaining = budgetAmount - spent;

  let status: BudgetStatus = 'healthy';

  if (usagePercentage > 100) {
    status = 'danger';
  } else if (usagePercentage >= 80) {
    status = 'warning';
  }

  return {
    month,
    budgetAmount,
    suggestedAmount,
    spent,
    remaining,
    usagePercentage,
    status,
  };
}

export async function saveMonthlyBudget(
  amount: number,
  month = getCurrentMonthKey()
): Promise<void> {
  await upsertBudgetForMonth(month, amount);
}

export async function removeMonthlyBudget(
  month = getCurrentMonthKey()
): Promise<void> {
  await deleteBudgetForMonth(month);
}