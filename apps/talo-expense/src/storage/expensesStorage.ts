import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense } from '../types/expense';

const STORAGE_KEY = 'expenses';

export async function getExpenses(): Promise<Expense[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);

    if (data !== null) {
      return JSON.parse(data) as Expense[];
    }

    return [];
  } catch (error) {
    console.log('Error reading expenses', error);
    return [];
  }
}

export async function saveExpenses(expenses: Expense[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (error) {
    console.log('Error saving expenses', error);
  }
}

export async function addExpense(newExpense: Expense): Promise<void> {
  try {
    const currentExpenses = await getExpenses();
    const updatedExpenses = [newExpense, ...currentExpenses];

    await saveExpenses(updatedExpenses);
  } catch (error) {
    console.log('Error adding expense', error);
  }
}

export async function deleteExpense(id: string): Promise<void> {
  try {
    const currentExpenses = await getExpenses();
    const updatedExpenses = currentExpenses.filter(
      (expense) => expense.id !== id
    );

    await saveExpenses(updatedExpenses);
  } catch (error) {
    console.log('Error deleting expense', error);
  }
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  try {
    const currentExpenses = await getExpenses();
    const expense = currentExpenses.find((item) => item.id === id);

    return expense ?? null;
  } catch (error) {
    console.log('Error getting expense by id', error);
    return null;
  }
}

export async function updateExpense(updatedExpense: Expense): Promise<void> {
  try {
    const currentExpenses = await getExpenses();

    const updatedExpenses = currentExpenses.map((expense) =>
      expense.id === updatedExpense.id ? updatedExpense : expense
    );

    await saveExpenses(updatedExpenses);
  } catch (error) {
    console.log('Error updating expense', error);
  }
}

export type ExpensesBackup = {
  version: 1;
  exportedAt: string;
  expenses: Expense[];
};

export async function exportExpensesBackup(): Promise<ExpensesBackup> {
  const expenses = await getExpenses();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    expenses,
  };
}

export async function importExpensesBackup(
  backup: ExpensesBackup
): Promise<void> {
  await saveExpenses(backup.expenses);
}

export function isValidExpensesBackup(data: unknown): data is ExpensesBackup {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<ExpensesBackup>;

  return (
    candidate.version === 1 &&
    typeof candidate.exportedAt === 'string' &&
    Array.isArray(candidate.expenses)
  );
}