export const EXPENSE_CATEGORIES = [
  'food',
  'transport',
  'home',
  'health',
  'entertainment',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
