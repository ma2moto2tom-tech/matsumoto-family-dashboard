import { useState, useEffect } from 'react';
import { Transaction } from './types';
import { getMonthlySummaries } from './utils';
import TaskManager from './components/TaskManager';
import PomodoroTimer from './components/PomodoroTimer';
import QuickMemo from './components/QuickMemo';
import MonthlySummaryChart from './components/MonthlySummaryChart';
import CategoryBreakdown from './components/CategoryBreakdown';
import GoalTracker from './components/GoalTracker';
import TrendChart from './components/TrendChart';
import InstitutionBreakdown from './components/InstitutionBreakdown';
import TransactionSearch from './components/TransactionSearch';
import CsvUploader from './components/CsvUploader';

type FinanceTab = 'summary' | 'categories' | 'goals' | 'trends' | 'institutions' | 'search';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getDateString(): string {
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financeTab, setFinanceTab] = useState<FinanceTab>('summary');
  const [showFinance, setShowFinance] = useState(false);

  useEffect(() => {
    fetch('/transactions.json')
      .then(res => res.json())
      .then((data: Transaction[]) => setTransactions(data))
      .catch(() => {});
  }, []);

  const handleUpload = (newTxs: Transaction[]) => {
    setTransactions(prev => [...prev, ...newTxs]);
  };

  const monthlySummaries = getMonthlySummaries(transactions);

  const financeTabs: { key: FinanceTab; label: string }[] = [
    { key: 'summary', label: 'Summary' },
    { key: 'categories', label: 'Categories' },
    { key: 'goals', label: 'Goals' },
    { key: 'trends', label: 'Trends' },
    { key: 'institutions', label: 'Accounts' },
    { key: 'search', label: 'Search' },
  ];

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="pt-8 sm:pt-12 pb-2 px-4 sm:px-6 max-w-5xl mx-auto">
        <p className="text-sm text-gray-400 tracking-wide">{getDateString()}</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mt-1">
          {getGreeting()}, Tsutomu
        </h1>
      </header>

      {/* Main grid */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: Tasks (takes more space) */}
          <div className="lg:col-span-3">
            <TaskManager />
          </div>

          {/* Right: Pomodoro + Memo */}
          <div className="lg:col-span-2 space-y-4">
            <PomodoroTimer />
            <QuickMemo />
          </div>
        </div>

        {/* Finance section (collapsible) */}
        <div className="mt-8">
          <button
            onClick={() => setShowFinance(!showFinance)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4"
          >
            <svg
              width="12" height="12" viewBox="0 0 16 16" fill="none"
              className={`transition-transform ${showFinance ? 'rotate-90' : ''}`}
            >
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Finance
          </button>

          {showFinance && (
            <div className="card">
              <nav className="flex gap-1 mb-6 overflow-x-auto pb-1">
                {financeTabs.map(tab => (
                  <button
                    key={tab.key}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      financeTab === tab.key
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                    onClick={() => setFinanceTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              <CsvUploader onUpload={handleUpload} />

              {financeTab === 'summary' && <MonthlySummaryChart data={monthlySummaries} />}
              {financeTab === 'categories' && <CategoryBreakdown transactions={transactions} />}
              {financeTab === 'goals' && <GoalTracker transactions={transactions} />}
              {financeTab === 'trends' && <TrendChart transactions={transactions} />}
              {financeTab === 'institutions' && <InstitutionBreakdown transactions={transactions} />}
              {financeTab === 'search' && <TransactionSearch transactions={transactions} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
