import { useState } from 'react';
import type { Transaction, MonthlyGoal } from '../types';
import { DEFAULT_GOALS, filterTransactions, getMonthKey, formatYen, getAvailableMonths, CATEGORY_COLORS } from '../utils';

interface Props { transactions: Transaction[]; }

export default function GoalTracker({ transactions }: Props) {
  const [goals, setGoals] = useState<MonthlyGoal[]>(DEFAULT_GOALS);
  const [editing, setEditing] = useState(false);
  const months = getAvailableMonths(transactions);
  const [selectedMonth, setSelectedMonth] = useState<string>(months[months.length - 1] || '');

  const filtered = filterTransactions(transactions).filter(t => t.amount < 0 && getMonthKey(t.date) === selectedMonth);
  const catTotals = new Map<string, number>();
  for (const t of filtered) catTotals.set(t.category, (catTotals.get(t.category) || 0) + Math.abs(t.amount));
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const totalActual = goals.reduce((s, g) => s + (catTotals.get(g.category) || 0), 0);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">月間目標管理</h3>
        <div className="flex gap-2">
          <select className="text-[13px] text-[#86868b] bg-[#f5f5f7] border-none rounded-lg px-3 py-1.5 outline-none" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {months.map(m => (<option key={m} value={m}>{m.replace('-', '年') + '月'}</option>))}
          </select>
          <button className="text-[13px] text-[#007AFF] hover:text-[#0056b3] font-medium transition-colors" onClick={() => setEditing(!editing)}>{editing ? '完了' : '編集'}</button>
        </div>
      </div>
      <div className="space-y-3">
        {goals.map((goal, i) => {
          const actual = catTotals.get(goal.category) || 0;
          const pct = goal.target > 0 ? Math.min((actual / goal.target) * 100, 150) : 0;
          const over = actual > goal.target;
          const color = CATEGORY_COLORS[goal.category] || '#94a3b8';
          return (
            <div key={goal.category} className="flex items-center gap-3">
              <div className="w-20 sm:w-24 text-[13px] text-[#86868b] text-right flex-shrink-0">{goal.category}</div>
              <div className="flex-1"><div className="h-2 bg-[#f5f5f7] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: over ? '#FF3B30' : color }} /></div></div>
              <div className="w-32 sm:w-40 text-right text-[13px] tabular-nums flex-shrink-0">
                <span className={over ? 'text-[#FF3B30] font-semibold' : 'text-[#1d1d1f]'}>{formatYen(actual)}</span>
                <span className="text-[#c7c7cc] mx-1">/</span>
                {editing ? (<input type="number" className="w-16 bg-[#f5f5f7] rounded-md px-1.5 py-0.5 text-right text-[13px] outline-none" value={goal.target} onChange={e => { const g = [...goals]; g[i] = { ...goal, target: parseInt(e.target.value) || 0 }; setGoals(g); }} />) : (<span className="text-[#86868b]">{formatYen(goal.target)}</span>)}
              </div>
              <div className={`w-12 text-right text-[12px] font-semibold flex-shrink-0 ${over ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}>{pct.toFixed(0)}%</div>
            </div>
          );
        })}
        <div className="flex items-center gap-3 border-t border-[#d2d2d7] pt-3 mt-4">
          <div className="w-20 sm:w-24 text-[13px] font-semibold text-[#1d1d1f] text-right flex-shrink-0">合計</div>
          <div className="flex-1" />
          <div className="w-32 sm:w-40 text-right text-[13px] tabular-nums font-semibold flex-shrink-0">
            <span className={totalActual > totalTarget ? 'text-[#FF3B30]' : 'text-[#1d1d1f]'}>{formatYen(totalActual)}</span>
            <span className="text-[#c7c7cc] mx-1">/</span>
            <span className="text-[#86868b]">{formatYen(totalTarget)}</span>
          </div>
          <div className={`w-12 text-right text-[12px] font-semibold flex-shrink-0 ${totalActual > totalTarget ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}>{totalTarget > 0 ? ((totalActual / totalTarget) * 100).toFixed(0) : 0}%</div>
        </div>
      </div>
    </div>
  );
}
