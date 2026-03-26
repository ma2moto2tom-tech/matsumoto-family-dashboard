import type { Transaction, MonthlySummary, MonthlyGoal } from './types';

export const DEFAULT_GOALS: MonthlyGoal[] = [
  { category: '食費', target: 80000 },
  { category: '日用品', target: 15000 },
  { category: '通信費', target: 25000 },
  { category: '交通費', target: 20000 },
  { category: '教養・教育', target: 10000 },
  { category: '趣味・娯楽', target: 20000 },
  { category: '衣服・美容', target: 15000 },
  { category: '健康・医療', target: 30000 },
  { category: '水道・光熱費', target: 25000 },
  { category: '保険', target: 15000 },
];

export function formatYen(n: number): string {
  return (n < 0 ? '-' : '') + '¥' + Math.abs(n).toLocaleString('ja-JP');
}

export function formatMan(n: number): string {
  const man = Math.round(n / 10000);
  return (n < 0 ? '-' : '') + Math.abs(man).toLocaleString('ja-JP') + '万円';
}

export function filterTransactions(txs: Transaction[]): Transaction[] {
  return txs.filter(t => t.transfer === 0);
}

export function getMonthKey(dateStr: string): string {
  // date format: "2025/01/31"
  const parts = dateStr.split('/');
  return `${parts[0]}-${parts[1]}`;
}

export function getMonthlySummaries(txs: Transaction[]): MonthlySummary[] {
  const map = new Map<string, { income: number; expense: number }>();

  for (const t of filterTransactions(txs)) {
    const month = getMonthKey(t.date);
    if (!map.has(month)) map.set(month, { income: 0, expense: 0 });
    const entry = map.get(month)!;
    if (t.amount > 0) {
      entry.income += t.amount;
    } else {
      entry.expense += Math.abs(t.amount);
    }
  }

  return Array.from(map.entries())
    .map(([month, { income, expense }]) => ({
      month,
      income,
      expense,
      balance: income - expense,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function getCategoryBreakdown(
  txs: Transaction[],
  month?: string
): { category: string; amount: number; subcategories: { name: string; amount: number }[] }[] {
  const filtered = filterTransactions(txs).filter(t => {
    if (month && getMonthKey(t.date) !== month) return false;
    return t.amount < 0; // expenses only
  });

  const catMap = new Map<string, { total: number; subs: Map<string, number> }>();

  for (const t of filtered) {
    if (!catMap.has(t.category)) {
      catMap.set(t.category, { total: 0, subs: new Map() });
    }
    const entry = catMap.get(t.category)!;
    const amt = Math.abs(t.amount);
    entry.total += amt;
    entry.subs.set(t.subcategory, (entry.subs.get(t.subcategory) || 0) + amt);
  }

  return Array.from(catMap.entries())
    .map(([category, { total, subs }]) => ({
      category,
      amount: total,
      subcategories: Array.from(subs.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getMonthlyTrend(
  txs: Transaction[],
  category: string
): { month: string; amount: number }[] {
  const filtered = filterTransactions(txs).filter(
    t => t.amount < 0 && t.category === category
  );
  const map = new Map<string, number>();
  for (const t of filtered) {
    const month = getMonthKey(t.date);
    map.set(month, (map.get(month) || 0) + Math.abs(t.amount));
  }
  return Array.from(map.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function getInstitutionBreakdown(
  txs: Transaction[],
  month?: string
): { institution: string; amount: number }[] {
  const filtered = filterTransactions(txs).filter(t => {
    if (month && getMonthKey(t.date) !== month) return false;
    return t.amount < 0;
  });

  const map = new Map<string, number>();
  for (const t of filtered) {
    map.set(t.institution, (map.get(t.institution) || 0) + Math.abs(t.amount));
  }
  return Array.from(map.entries())
    .map(([institution, amount]) => ({ institution, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export const CATEGORY_COLORS: Record<string, string> = {
  '食費': '#ef4444',
  '日用品': '#f97316',
  '通信費': '#eab308',
  '交通費': '#22c55e',
  '教養・教育': '#14b8a6',
  '趣味・娯楽': '#3b82f6',
  '衣服・美容': '#8b5cf6',
  '健康・医療': '#ec4899',
  '住宅': '#6366f1',
  '水道・光熱費': '#06b6d4',
  '保険': '#84cc16',
  '税・社会保障': '#a855f7',
  '自動車': '#f43f5e',
  '交際費': '#d946ef',
  '特別な支出': '#64748b',
  '現金・カード': '#78716c',
  'その他': '#94a3b8',
  '未分類': '#cbd5e1',
  '収入': '#10b981',
};

export function getAvailableMonths(txs: Transaction[]): string[] {
  const months = new Set<string>();
  for (const t of txs) {
    months.add(getMonthKey(t.date));
  }
  return Array.from(months).sort();
}
