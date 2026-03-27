import { useState, useEffect, useCallback } from 'react';

interface TaskItem {
  id: string;
  text: string;
  done: boolean;
}

interface DayData {
  tasks: TaskItem[];
}

interface MemoEntry {
  id: string;
  text: string;
  timestamp: number;
}

const HIGHLIGHT_KEY = 'matsumoto-weekly-highlights';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekRange(): { start: Date; end: Date; keys: string[] } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    keys.push(dateKey(d));
  }
  return { start: monday, end: sunday, keys };
}

function loadTaskData(): Record<string, DayData> {
  try {
    const raw = localStorage.getItem('matsumoto-tasks');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadPomodoroSessions(): Record<string, number> {
  try {
    const raw = localStorage.getItem('matsumoto-pomodoro-sessions');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadMemos(): Record<string, MemoEntry[]> {
  try {
    const raw = localStorage.getItem('matsumoto-memos');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadHighlights(): Record<string, string> {
  try {
    const raw = localStorage.getItem(HIGHLIGHT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function formatDateLabel(key: string): string {
  const [, m, d] = key.split('-');
  const date = new Date(key + 'T00:00:00');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${parseInt(m)}/${parseInt(d)}(${weekdays[date.getDay()]})`;
}

interface WeeklyStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalPomodoro: number;
  memosByDay: { date: string; memos: MemoEntry[] }[];
}

function computeStats(weekKeys: string[]): WeeklyStats {
  const taskData = loadTaskData();
  const pomodoroData = loadPomodoroSessions();
  const memoData = loadMemos();

  let totalTasks = 0;
  let completedTasks = 0;
  let totalPomodoro = 0;
  const memosByDay: { date: string; memos: MemoEntry[] }[] = [];

  for (const key of weekKeys) {
    const day = taskData[key];
    if (day?.tasks) {
      totalTasks += day.tasks.length;
      completedTasks += day.tasks.filter((t) => t.done).length;
    }
    totalPomodoro += pomodoroData[key] || 0;

    const dayMemos = memoData[key];
    if (dayMemos && dayMemos.length > 0) {
      memosByDay.push({ date: key, memos: dayMemos });
    }
  }

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return { totalTasks, completedTasks, completionRate, totalPomodoro, memosByDay };
}

export default function WeeklyReview({ onClose }: { onClose: () => void }) {
  const { keys: weekKeys } = getWeekRange();
  const weekId = weekKeys[0]; // Monday as week identifier

  const [stats, setStats] = useState<WeeklyStats>(() => computeStats(weekKeys));
  const [highlight, setHighlight] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setStats(computeStats(weekKeys));
    const highlights = loadHighlights();
    if (highlights[weekId]) {
      setHighlight(highlights[weekId]);
    }
  }, [weekId, weekKeys.join(',')]);

  const saveHighlight = useCallback(() => {
    const highlights = loadHighlights();
    highlights[weekId] = highlight.trim();
    localStorage.setItem(HIGHLIGHT_KEY, JSON.stringify(highlights));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [weekId, highlight]);

  const weekLabel = `${formatDateLabel(weekKeys[0])} - ${formatDateLabel(weekKeys[6])}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[--card] rounded-2xl border border-[--border] shadow-2xl w-[480px] max-w-[calc(100vw-40px)] max-h-[calc(100vh-80px)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div>
            <h2 className="text-[16px] font-semibold text-[--fg]">Weekly Review</h2>
            <p className="text-[12px] text-[--fg2] mt-0.5">{weekLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-[--fg3] hover:text-[--fg] rounded-lg hover:bg-[--bg2] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Completion rate */}
            <div className="bg-[--bg2] rounded-xl p-3 text-center">
              <div className="text-[24px] font-semibold text-[--fg] leading-none">
                {stats.completionRate}
                <span className="text-[14px] text-[--fg2]">%</span>
              </div>
              <div className="text-[11px] text-[--fg2] mt-1.5">タスク完了率</div>
              <div className="text-[11px] text-[--fg3] mt-0.5">
                {stats.completedTasks}/{stats.totalTasks}
              </div>
            </div>

            {/* Pomodoro sessions */}
            <div className="bg-[--bg2] rounded-xl p-3 text-center">
              <div className="text-[24px] font-semibold text-[--fg] leading-none">
                {stats.totalPomodoro}
              </div>
              <div className="text-[11px] text-[--fg2] mt-1.5">ポモドーロ</div>
              <div className="text-[11px] text-[--fg3] mt-0.5">
                {Math.round(stats.totalPomodoro * 25)}分
              </div>
            </div>

            {/* Memo count */}
            <div className="bg-[--bg2] rounded-xl p-3 text-center">
              <div className="text-[24px] font-semibold text-[--fg] leading-none">
                {stats.memosByDay.reduce((sum, d) => sum + d.memos.length, 0)}
              </div>
              <div className="text-[11px] text-[--fg2] mt-1.5">メモ数</div>
              <div className="text-[11px] text-[--fg3] mt-0.5">
                {stats.memosByDay.length}日分
              </div>
            </div>
          </div>

          {/* Memos summary */}
          {stats.memosByDay.length > 0 && (
            <div>
              <h3 className="text-[13px] font-medium text-[--fg] mb-2">今週のメモ</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {stats.memosByDay.map(({ date, memos }) => (
                  <div key={date}>
                    <div className="text-[11px] text-[--fg3] mb-1">
                      {formatDateLabel(date)}
                    </div>
                    {memos.slice(0, 3).map((memo) => (
                      <div
                        key={memo.id}
                        className="text-[12px] text-[--fg2] pl-3 py-0.5 border-l-2 border-[--border] leading-relaxed truncate"
                      >
                        {memo.text}
                      </div>
                    ))}
                    {memos.length > 3 && (
                      <div className="text-[11px] text-[--fg3] pl-3">
                        +{memos.length - 3}件
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Highlight input */}
          <div>
            <label className="text-[13px] font-medium text-[--fg] mb-2 block">
              今週のハイライト
            </label>
            <input
              type="text"
              value={highlight}
              onChange={(e) => setHighlight(e.target.value)}
              placeholder="一言で今週を振り返る..."
              maxLength={100}
              className="w-full px-3 py-2.5 text-[14px] bg-[--bg2] rounded-xl border-none outline-none placeholder:text-[--fg3] focus:ring-2 focus:ring-[#007AFF]/20 transition-all text-[--fg]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <button
            onClick={saveHighlight}
            disabled={saved}
            className={`w-full py-3 rounded-xl text-[14px] font-medium transition-all ${
              saved
                ? 'bg-[#34C759] text-white'
                : 'bg-[#007AFF] text-white hover:bg-[#0056b3]'
            }`}
          >
            {saved ? '保存しました' : 'ハイライトを保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
