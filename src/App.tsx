import { useState, useEffect } from 'react';
import CalendarPanel from './components/CalendarPanel';
import TaskPanel from './components/TaskPanel';
import HealthTracker from './components/HealthTracker';
import PomodoroTimer from './components/PomodoroTimer';
import QuickMemo from './components/QuickMemo';
import NightlyReview from './components/NightlyReview';
import CycleIndicator from './components/CycleIndicator';
import WeeklyReview from './components/WeeklyReview';

function formatToday(): string {
  const d = new Date();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
}

function App() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('matsumoto-theme') === 'dark';
    } catch { return false; }
  });
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('matsumoto-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="min-h-screen bg-[--bg]">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[--header] border-b border-[--border]">
        <div className="max-w-[1200px] mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-semibold text-[--fg] tracking-tight">
              Dashboard
            </h1>
            <p className="text-[13px] text-[--fg2] mt-0.5">{formatToday()}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Cycle indicator */}
            <CycleIndicator />
            {/* Weekly review link */}
            <button
              onClick={() => setShowWeeklyReview(true)}
              className="text-[12px] text-[--fg2] hover:text-[--fg] px-2 py-1 rounded-lg hover:bg-[--bg2] transition-colors"
            >
              週間レビュー
            </button>
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[--fg2] hover:text-[--fg] hover:bg-[--bg2] transition-all"
              title={dark ? 'ライトモード' : 'ダークモード'}
            >
              {dark ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.05 3.05L4.1 4.1M11.9 11.9L12.95 12.95M12.95 3.05L11.9 4.1M4.1 11.9L3.05 12.95" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 9.5A6.5 6.5 0 016.5 2 6.5 6.5 0 108 14.5a6.47 6.47 0 006-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 py-6 space-y-5">
        {/* Row 1: Schedule + Tasks */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <CalendarPanel />
          <TaskPanel />
        </section>

        {/* Row 2: Health + Memo */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <HealthTracker />
          <QuickMemo />
        </section>
      </main>

      {/* Floating Pomodoro */}
      <PomodoroTimer />

      {/* Nightly Review Modal */}
      <NightlyReview />

      {/* Weekly Review Modal */}
      {showWeeklyReview && (
        <WeeklyReview onClose={() => setShowWeeklyReview(false)} />
      )}
    </div>
  );
}

export default App;
