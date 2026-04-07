import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'monthly_budgets';

export type MonthlyBudget = {
  month: string; // YYYY-MM
  amount: number;
};

export async function getMonthlyBudgets(): Promise<MonthlyBudget[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);

    if (!data) {
      return [];
    }

    return JSON.parse(data) as MonthlyBudget[];
  } catch (error) {
    console.log('Error reading budgets', error);
    return [];
  }
}

export async function saveMonthlyBudgets(
  budgets: MonthlyBudget[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
  } catch (error) {
    console.log('Error saving budgets', error);
  }
}

export async function getBudgetByMonth(
  month: string
): Promise<MonthlyBudget | null> {
  const budgets = await getMonthlyBudgets();
  return budgets.find((item) => item.month === month) ?? null;
}

export async function upsertBudgetForMonth(
  month: string,
  amount: number
): Promise<void> {
  const budgets = await getMonthlyBudgets();
  const existingIndex = budgets.findIndex((item) => item.month === month);

  if (existingIndex >= 0) {
    budgets[existingIndex] = { month, amount };
  } else {
    budgets.push({ month, amount });
  }

  budgets.sort((a, b) => a.month.localeCompare(b.month));

  await saveMonthlyBudgets(budgets);
}

export async function deleteBudgetForMonth(month: string): Promise<void> {
  const budgets = await getMonthlyBudgets();
  const updatedBudgets = budgets.filter((item) => item.month !== month);
  await saveMonthlyBudgets(updatedBudgets);
}

export async function getPreviousMonthBudget(
  month: string
): Promise<MonthlyBudget | null> {
  const budgets = await getMonthlyBudgets();
  const previous = budgets
    .filter((item) => item.month < month)
    .sort((a, b) => b.month.localeCompare(a.month))[0];

  return previous ?? null;
}