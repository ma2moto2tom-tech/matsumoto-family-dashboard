export interface Transaction {
  calculationTarget: number;
  date: string;
  description: string;
  amount: number;
  institution: string;
  category: string;
  subcategory: string;
  memo: string;
  transfer: number;
  id: string;
}

export interface MonthlyGoal {
  category: string;
  target: number;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
  balance: number;
}
