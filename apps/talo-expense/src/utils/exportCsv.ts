import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Expense } from '../types/expense';

function getMonthKey(date: string) {
  const [year, month] = date.split('-');
  return `${year}-${month}`;
}

function getMonthFileName(monthKey: string) {
  const [year, month] = monthKey.split('-');

  const monthNames = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];

  const monthName = monthNames[Number(month) - 1];

  return `expenses_${monthName}_${year}.csv`;
}

function getExportFileName(expenses: Expense[]) {
  if (expenses.length === 0) {
    return `expenses_export.csv`;
  }

  const uniqueMonthKeys = Array.from(
    new Set(expenses.map((expense) => getMonthKey(expense.date)))
  );

  if (uniqueMonthKeys.length === 1) {
    return getMonthFileName(uniqueMonthKeys[0]);
  }

  return 'expenses_all.csv';
}

export async function exportExpensesToCSV(expenses: Expense[]) {
  if (!expenses.length) {
    throw new Error('No expenses to export');
  }

  const escapeCsvValue = (value: string | number | boolean) => {
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  };

  const header = [
    'id',
    'date',
    'category',
    'description',
    'amount',
    'exceptional',
  ].join(',');

  const rows = expenses.map((expense) =>
    [
      escapeCsvValue(expense.id),
      escapeCsvValue(expense.date),
      escapeCsvValue(expense.category),
      escapeCsvValue(expense.description ?? ''),
      escapeCsvValue(expense.amount),
      escapeCsvValue(expense.exceptional ? 'yes' : 'no'),
    ].join(',')
  );

  const csvContent = [header, ...rows].join('\n');

  const fileName = getExportFileName(expenses);

  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(csvContent);

  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (!isSharingAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export expenses CSV',
    UTI: 'public.comma-separated-values-text',
  });
}