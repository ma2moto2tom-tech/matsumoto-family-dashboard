import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction } from '../types';
import { getCategoryBreakdown, formatYen, CATEGORY_COLORS, getAvailableMonths } from '../utils';

interface Props {
  transactions: Transaction[];
}

export default function CategoryBreakdown({ transactions }: Props) {
  const months = getAvailableMonths(transactions);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const breakdown = getCategoryBreakdown(transactions, selectedMonth || undefined);
  const total = breakdown.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">カテゴリ別支出</h3>
        <select className="text-[13px] text-[#86868b] bg-[#f5f5f7] border-none rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#007AFF]/20" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          <option value="">全期間</option>
          {months.map(m => (<option key={m} value={m}>{m.replace('-', '年') + '月'}</option>))}
        </select>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/2">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={breakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                label={(props: any) => props.percent > 0.05 ? `${props.category}` : ''} labelLine={false} style={{ fontSize: 10 }}>
                {breakdown.map((entry) => (<Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />))}
              </Pie>
              <Tooltip formatter={(value) => formatYen(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full lg:w-1/2 max-h-[350px] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-[#e5e5ea]"><th className="text-left py-2 text-[#86868b] font-medium">カテゴリ</th><th className="text-right py-2 text-[#86868b] font-medium">金額</th><th className="text-right py-2 text-[#86868b] font-medium">割合</th></tr></thead>
            <tbody>
              {breakdown.map(b => (<>
                <tr key={b.category} className="border-b border-[#f5f5f7] cursor-pointer hover:bg-[#f5f5f7] transition-colors" onClick={() => setExpandedCategory(expandedCategory === b.category ? null : b.category)}>
                  <td className="py-2.5 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[b.category] || '#94a3b8' }} /><span className="text-[#1d1d1f]">{b.category}</span></td>
                  <td className="text-right py-2.5 tabular-nums text-[#1d1d1f]">{formatYen(b.amount)}</td>
                  <td className="text-right py-2.5 text-[#86868b]">{((b.amount / total) * 100).toFixed(1)}%</td>
                </tr>
                {expandedCategory === b.category && b.subcategories.map(sub => (
                  <tr key={`${b.category}-${sub.name}`} className="bg-[#f5f5f7]/50">
                    <td className="py-1.5 pl-7 text-[12px] text-[#86868b]">{sub.name}</td>
                    <td className="text-right py-1.5 text-[12px] tabular-nums text-[#86868b]">{formatYen(sub.amount)}</td>
                    <td className="text-right py-1.5 text-[12px] text-[#86868b]">{((sub.amount / b.amount) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </>))}
              <tr className="font-semibold border-t-2 border-[#d2d2d7]"><td className="py-2.5 text-[#1d1d1f]">合計</td><td className="text-right py-2.5 tabular-nums text-[#1d1d1f]">{formatYen(total)}</td><td className="text-right py-2.5 text-[#86868b]">100%</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
