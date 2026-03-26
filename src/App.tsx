import CalendarPanel from './components/CalendarPanel';
import TaskPanel from './components/TaskPanel';
import HealthTracker from './components/HealthTracker';
import PomodoroTimer from './components/PomodoroTimer';
import QuickMemo from './components/QuickMemo';

function formatToday(): string {
  const d = new Date();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
}

function App() {
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-[#d2d2d7]/40">
        <div className="max-w-[1200px] mx-auto px-5 py-4">
          <h1 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight">
            Dashboard
          </h1>
          <p className="text-[13px] text-[#86868b] mt-0.5">{formatToday()}</p>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 py-6 space-y-5">
        {/* Row 1: Schedule + Tasks */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <CalendarPanel />
          <TaskPanel />
        </section>

        {/* Row 2: Health + Pomodoro + Memo */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <HealthTracker />
          <PomodoroTimer />
          <QuickMemo />
        </section>
      </main>
    </div>
  );
}

export default App;
