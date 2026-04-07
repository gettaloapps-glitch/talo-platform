import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
  addExpense,
  deleteExpense,
  exportExpensesBackup,
  getExpenseById,
  getExpenses,
  importExpensesBackup,
  isValidExpensesBackup,
  updateExpense,
} from '../storage/expensesStorage';
import { Expense } from '../types/expense';

export async function getAllExpenses(): Promise<Expense[]> {
  return await getExpenses();
}

export async function getExpense(id: string): Promise<Expense | null> {
  return await getExpenseById(id);
}

export async function createExpense(expense: Expense): Promise<void> {
  await addExpense(expense);
}

export async function editExpense(expense: Expense): Promise<void> {
  await updateExpense(expense);
}

export async function removeExpense(id: string): Promise<void> {
  await deleteExpense(id);
}

export async function exportBackupFile(): Promise<void> {
  const backup = await exportExpensesBackup();
  const fileName = `talo-expense-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  const directory = FileSystem.documentDirectory;

  if (!directory) {
    throw new Error('Document directory is not available.');
  }

  const fileUri = `${directory}${fileName}`;

  await FileSystem.writeAsStringAsync(
    fileUri,
    JSON.stringify(backup, null, 2),
    {
      encoding: FileSystem.EncodingType.UTF8,
    }
  );

  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Export backup',
    UTI: 'public.json',
  });
}

export async function restoreBackupFile(): Promise<number> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return -1;
  }

  const asset = result.assets[0];
  const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let parsed: unknown;

  try {
    parsed = JSON.parse(fileContent);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!isValidExpensesBackup(parsed)) {
    throw new Error('The selected file is not a valid Expense Tracker backup.');
  }

  await importExpensesBackup(parsed);

  return parsed.expenses.length;
}