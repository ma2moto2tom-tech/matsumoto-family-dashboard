import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Transaction } from '../types';
import { getMonthlyTrend, DEFAULT_GOALS, formatYen, CATEGORY_COLORS, getAvailableMonths } from '../utils';

interface Props { transactions: Transaction[]; }

const TREND_CATEGORIES = ['食費', '日用品', '通信費', '交通費', '健康・医療', '趣味・娯楽', '衣服・美容', '水道・光熱費'];

export default function TrendChart({ transactions }: Props) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['食費']);
  const months = getAvailableMonths(transactions);
  const chartData = months.map(month => {
    const row: Record<string, string | number> = { month: month.replace(/^\d{4}-/, '').replace(/^0/, '') + '月' };
    for (const cat of selectedCategories) { const trend = getMonthlyTrend(transactions, cat); const found = trend.find(t => t.month === month); row[cat] = found ? found.amount : 0; }
    return row;
  });
  const toggleCategory = (cat: string) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  return (
    <div className="card">
      <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">カテゴリ別推移</h3>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {TREND_CATEGORIES.map(cat => (
          <button key={cat} className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${selectedCategories.includes(cat) ? 'text-white' : 'text-[#86868b] bg-[#f5f5f7] hover:bg-[#e8e8ed]'}`} style={selectedCategories.includes(cat) ? { backgroundColor: CATEGORY_COLORS[cat] } : {}} onClick={() => toggleCategory(cat)}>{cat}</button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ left: -10, right: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={40} />
          <YAxis tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`} tick={{ fontSize: 10 }} width={40} />
          <Tooltip formatter={(value) => formatYen(value as number)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {selectedCategories.map(cat => (<Line key={cat} type="monotone" dataKey={cat} stroke={CATEGORY_COLORS[cat]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />))}
          {selectedCategories.map(cat => { const goal = DEFAULT_GOALS.find(g => g.category === cat); return goal ? (<ReferenceLine key={`goal-${cat}`} y={goal.target} stroke={CATEGORY_COLORS[cat]} strokeDasharray="5 5" label={{ value: `${cat}目標`, fontSize: 9, fill: CATEGORY_COLORS[cat] }} />) : null; })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
