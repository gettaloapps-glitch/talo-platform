import { ExpenseCategory } from '../constants/categories';

export type Expense = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string;
  exceptional: boolean;
};

export type DashboardPeriod = 'thisMonth' | 'lastMonth';