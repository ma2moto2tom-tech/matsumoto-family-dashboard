import { useState, useMemo } from 'react';
import type { Transaction } from '../types';
import { filterTransactions, formatYen, getAvailableMonths } from '../utils';

interface Props { transactions: Transaction[]; }

export default function TransactionSearch({ transactions }: Props) {
  const [keyword, setKeyword] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  const months = getAvailableMonths(transactions);
  const allTxs = filterTransactions(transactions);
  const categories = useMemo(() => [...new Set(allTxs.map(t => t.category))].sort(), [allTxs]);
  const institutions = useMemo(() => [...new Set(allTxs.map(t => t.institution))].sort(), [allTxs]);

  const filtered = useMemo(() => {
    return allTxs.filter(t => {
      if (monthFilter) { const m = t.date.split('/').slice(0, 2).join('-'); if (m !== monthFilter) return false; }
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (institutionFilter && t.institution !== institutionFilter) return false;
      if (keyword) { const lk = keyword.toLowerCase(); if (!t.description.toLowerCase().includes(lk) && !t.memo.toLowerCase().includes(lk) && !t.subcategory.toLowerCase().includes(lk)) return false; }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [allTxs, monthFilter, categoryFilter, institutionFilter, keyword]);

  const totalIncome = filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const selectClass = "text-[13px] text-[#86868b] bg-[#f5f5f7] border-none rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#007AFF]/20";

  return (
    <div className="card">
      <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">トランザクション検索</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        <input type="text" placeholder="キーワード検索" className={`${selectClass} col-span-2 lg:col-span-1 text-[#1d1d1f] placeholder:text-[#c7c7cc]`} value={keyword} onChange={e => setKeyword(e.target.value)} />
        <select className={selectClass} value={monthFilter} onChange={e => setMonthFilter(e.target.value)}><option value="">全期間</option>{months.map(m => <option key={m} value={m}>{m.replace('-', '年') + '月'}</option>)}</select>
        <select className={selectClass} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="">全カテゴリ</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select className={`${selectClass} col-span-2 lg:col-span-1`} value={institutionFilter} onChange={e => setInstitutionFilter(e.target.value)}><option value="">全金融機関</option>{institutions.map(i => <option key={i} value={i}>{i}</option>)}</select>
      </div>
      <div className="flex gap-4 mb-4 text-[13px]">
        <span className="text-[#86868b]">{filtered.length}件</span>
        <span className="text-[#34C759] tabular-nums">収入 {formatYen(totalIncome)}</span>
        <span className="text-[#FF3B30] tabular-nums">支出 {formatYen(totalExpense)}</span>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto -mx-5 sm:mx-0">
        <table className="w-full text-[13px] min-w-[360px]">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-[#e5e5ea]">
              <th className="text-left py-2.5 px-3 text-[#86868b] font-medium">日付</th>
              <th className="text-left py-2.5 px-3 text-[#86868b] font-medium">内容</th>
              <th className="text-left py-2.5 px-3 text-[#86868b] font-medium hidden sm:table-cell">カテゴリ</th>
              <th className="text-right py-2.5 px-3 text-[#86868b] font-medium">金額</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map(t => (
              <tr key={t.id} className="border-b border-[#f5f5f7] hover:bg-[#f5f5f7] transition-colors">
                <td className="py-2 px-3 whitespace-nowrap text-[#86868b] tabular-nums">{t.date.slice(5)}</td>
                <td className="py-2 px-3 text-[#1d1d1f] truncate max-w-[160px] sm:max-w-none">{t.description}</td>
                <td className="py-2 px-3 whitespace-nowrap hidden sm:table-cell"><span className="text-[11px] bg-[#f5f5f7] text-[#86868b] rounded-md px-2 py-0.5">{t.category}</span></td>
                <td className={`py-2 px-3 text-right tabular-nums whitespace-nowrap font-medium ${t.amount < 0 ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}>{formatYen(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 200 && (<p className="text-center text-[12px] text-[#86868b] py-3">先頭200件を表示中（全{filtered.length}件）</p>)}
      </div>
    </div>
  );
}
