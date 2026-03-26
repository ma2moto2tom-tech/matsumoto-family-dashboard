import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types';
import { getInstitutionBreakdown, formatYen, getAvailableMonths } from '../utils';

interface Props { transactions: Transaction[]; }

export default function InstitutionBreakdown({ transactions }: Props) {
  const months = getAvailableMonths(transactions);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const data = getInstitutionBreakdown(transactions, selectedMonth || undefined).slice(0, 8).map(d => ({ ...d, name: d.institution.length > 10 ? d.institution.slice(0, 10) + '...' : d.institution }));

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">金融機関別支出</h3>
        <select className="text-[13px] text-[#86868b] bg-[#f5f5f7] border-none rounded-lg px-3 py-1.5 outline-none" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          <option value="">全期間</option>
          {months.map(m => (<option key={m} value={m}>{m.replace('-', '年') + '月'}</option>))}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} />
          <Tooltip formatter={(value) => formatYen(value as number)} />
          <Bar dataKey="amount" name="支出額" fill="#007AFF" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
