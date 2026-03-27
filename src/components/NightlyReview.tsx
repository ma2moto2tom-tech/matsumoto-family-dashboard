import { useState, useEffect, useCallback } from 'react';

interface ReviewEntry {
  date: string;
  didToday: string;
  thankedHaruna: boolean;
  timestamp: number;
}

const STORAGE_KEY = 'matsumoto-nightly-review';
const DISMISS_KEY = 'matsumoto-nightly-dismiss';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadReviews(): Record<string, ReviewEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function getCompletedTasks(): string[] {
  try {
    const raw = localStorage.getItem('matsumoto-tasks');
    if (!raw) return [];
    const data = JSON.parse(raw);
    const today = dateKey(new Date());
    const dayData = data[today];
    if (!dayData?.tasks) return [];
    return dayData.tasks
      .filter((t: { done: boolean; text: string }) => t.done)
      .map((t: { text: string }) => t.text);
  } catch { return []; }
}

function getPomodoroLog(): string[] {
  try {
    const raw = localStorage.getItem('matsumoto-pomodoro-log');
    if (!raw) return [];
    const data = JSON.parse(raw);
    const today = dateKey(new Date());
    const entries = data[today] || [];
    return entries
      .filter((e: { text: string }) => e.text !== '(記録なし)')
      .map((e: { text: string }) => e.text);
  } catch { return []; }
}

export default function NightlyReview() {
  const [show, setShow] = useState(false);
  const [didToday, setDidToday] = useState('');
  const [thankedHaruna, setThankedHaruna] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = dateKey(new Date());

  // Check if it's 21:00+ JST and review hasn't been done/dismissed today
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const hour = now.getHours();

      // Only show at 21:00 or later
      if (hour < 21) return;

      // Already reviewed today?
      const reviews = loadReviews();
      if (reviews[today]) return;

      // Already dismissed today?
      try {
        const dismissed = localStorage.getItem(DISMISS_KEY);
        if (dismissed === today) return;
      } catch {}

      // Auto-fill from completed tasks and pomodoro log
      const completedTasks = getCompletedTasks();
      const pomodoroEntries = getPomodoroLog();
      const allItems = [...new Set([...completedTasks, ...pomodoroEntries])];

      if (allItems.length > 0) {
        setDidToday(allItems.map(item => `- ${item}`).join('\n'));
      }

      setShow(true);
    };

    check();
    // Re-check every 5 minutes
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [today]);

  const save = useCallback(() => {
    const entry: ReviewEntry = {
      date: today,
      didToday: didToday.trim(),
      thankedHaruna,
      timestamp: Date.now(),
    };
    const reviews = loadReviews();
    reviews[today] = entry;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));

    // Also save to memos
    try {
      const memosRaw = localStorage.getItem('matsumoto-memos');
      const memos = memosRaw ? JSON.parse(memosRaw) : {};
      const memoEntry = {
        id: crypto.randomUUID(),
        text: `[振り返り] ${didToday.trim()}${thankedHaruna ? ' / 遥菜さんに感謝を伝えた' : ''}`,
        timestamp: Date.now(),
      };
      memos[today] = [memoEntry, ...(memos[today] || [])];
      localStorage.setItem('matsumoto-memos', JSON.stringify(memos));
    } catch {}

    setSaved(true);
    setTimeout(() => {
      setShow(false);
      setSaved(false);
    }, 1500);
  }, [today, didToday, thankedHaruna]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, today);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="relative bg-[--card] rounded-2xl border border-[--border] shadow-2xl w-[400px] max-w-[calc(100vw-40px)] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-semibold text-[--fg]">1日の振り返り</h2>
          <button
            onClick={dismiss}
            className="w-7 h-7 flex items-center justify-center text-[--fg3] hover:text-[--fg] rounded-lg hover:bg-[--bg2] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Question 1 */}
        <div className="mb-5">
          <label className="text-[13px] font-medium text-[--fg] mb-2 block">
            今日やったこと
          </label>
          <textarea
            value={didToday}
            onChange={e => setDidToday(e.target.value)}
            placeholder="完了タスクから自動入力されます..."
            rows={5}
            className="w-full px-3 py-2.5 text-[14px] bg-[--bg2] rounded-xl border-none outline-none placeholder:text-[--fg3] focus:ring-2 focus:ring-[#007AFF]/20 transition-all resize-none leading-relaxed text-[--fg]"
          />
        </div>

        {/* Question 2 */}
        <div className="mb-6">
          <label className="text-[13px] font-medium text-[--fg] mb-3 block">
            遥菜さんに感謝を伝えた?
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setThankedHaruna(true)}
              className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                thankedHaruna
                  ? 'bg-[#34C759] text-white'
                  : 'bg-[--bg2] text-[--fg2] hover:bg-[--border]'
              }`}
            >
              はい
            </button>
            <button
              onClick={() => setThankedHaruna(false)}
              className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                !thankedHaruna
                  ? 'bg-[--bg2] text-[--fg] border-2 border-[--border]'
                  : 'bg-[--bg2] text-[--fg2] hover:bg-[--border]'
              }`}
            >
              まだ
            </button>
          </div>
          {!thankedHaruna && (
            <p className="text-[12px] text-[#FF9500] mt-2">
              まだ間に合う。今日の感謝を伝えよう。
            </p>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={save}
          disabled={saved}
          className={`w-full py-3 rounded-xl text-[14px] font-medium transition-all ${
            saved
              ? 'bg-[#34C759] text-white'
              : 'bg-[#007AFF] text-white hover:bg-[#0056b3]'
          }`}
        >
          {saved ? '保存しました' : '記録する'}
        </button>
      </div>
    </div>
  );
}
