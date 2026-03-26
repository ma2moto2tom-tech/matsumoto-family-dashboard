import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { MonthlySummary } from '../types';
import { formatYen, formatMan } from '../utils';

interface Props {
  data: MonthlySummary[];
}

export default function MonthlySummaryChart({ data }: Props) {
  const totalIncome = data.reduce((s, d) => s + d.income, 0);
  const totalExpense = data.reduce((s, d) => s + d.expense, 0);
  const totalBalance = totalIncome - totalExpense;

  const chartData = data.map(d => ({
    ...d,
    label: d.month.replace(/^\d{4}-/, '').replace(/^0/, '') + '月',
  }));

  return (
    <div className="card">
      <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-5">月別収支サマリー</h3>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center py-3 px-2 bg-[#f5f5f7] rounded-xl">
          <div className="text-[11px] text-[#86868b] mb-1">年間収入</div>
          <div className="text-[15px] font-semibold text-[#34C759] sm:hidden">{formatMan(totalIncome)}</div>
          <div className="hidden sm:block text-[17px] font-semibold text-[#34C759]">{formatYen(totalIncome)}</div>
        </div>
        <div className="text-center py-3 px-2 bg-[#f5f5f7] rounded-xl">
          <div className="text-[11px] text-[#86868b] mb-1">年間支出</div>
          <div className="text-[15px] font-semibold text-[#FF3B30] sm:hidden">{formatMan(totalExpense)}</div>
          <div className="hidden sm:block text-[17px] font-semibold text-[#FF3B30]">{formatYen(totalExpense)}</div>
        </div>
        <div className="text-center py-3 px-2 bg-[#f5f5f7] rounded-xl">
          <div className="text-[11px] text-[#86868b] mb-1">年間収支</div>
          <div className={`text-[15px] font-semibold sm:hidden ${totalBalance >= 0 ? 'text-[#007AFF]' : 'text-[#FF3B30]'}`}>{formatMan(totalBalance)}</div>
          <div className={`hidden sm:block text-[17px] font-semibold ${totalBalance >= 0 ? 'text-[#007AFF]' : 'text-[#FF3B30]'}`}>{formatYen(totalBalance)}</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ left: -10, right: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={40} />
          <YAxis tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`} tick={{ fontSize: 10 }} width={40} />
          <Tooltip formatter={(value) => formatYen(value as number)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke="#d2d2d7" />
          <Bar dataKey="income" name="収入" fill="#34C759" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="支出" fill="#FF3B30" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
