import { useState, useEffect, useCallback } from 'react';

interface MemoEntry {
  id: string;
  text: string;
  timestamp: number;
}

type MemoData = Record<string, MemoEntry[]>;

const STORAGE_KEY = 'matsumoto-memos';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(key: string): string {
  const [, m, d] = key.split('-');
  const date = new Date(key + 'T00:00:00');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${parseInt(m)}/${parseInt(d)}（${weekdays[date.getDay()]}）`;
}

function shiftDate(key: string, days: number): string {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

function loadMemos(): MemoData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveMemos(data: MemoData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function QuickMemo() {
  const todayKey = dateKey(new Date());
  const [data, setData] = useState<MemoData>(loadMemos);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [input, setInput] = useState('');
  const isToday = selectedDate === todayKey;

  const memos = data[selectedDate] || [];

  useEffect(() => { saveMemos(data); }, [data]);

  const persistToServer = useCallback((updated: MemoData) => {
    fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'memos.json', data: updated }),
    }).catch(() => {});
  }, []);

  const addMemo = () => {
    if (!input.trim()) return;
    const now = new Date();
    const entry: MemoEntry = {
      id: crypto.randomUUID(),
      text: input.trim(),
      timestamp: now.getTime(),
    };
    const updated = { ...data };
    updated[selectedDate] = [entry, ...(updated[selectedDate] || [])];
    setData(updated);
    persistToServer(updated);
    setInput('');
  };

  const deleteMemo = (id: string) => {
    const updated = { ...data };
    updated[selectedDate] = (updated[selectedDate] || []).filter(m => m.id !== id);
    if (updated[selectedDate].length === 0) delete updated[selectedDate];
    setData(updated);
    persistToServer(updated);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Get all dates that have memos
  const memoDates = Object.keys(data).sort().reverse();

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold text-[--fg]">メモ</h2>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-3 bg-[--bg2] rounded-xl px-2 py-1.5">
        <button
          onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
          className="w-7 h-7 flex items-center justify-center text-[--fg2] hover:text-[--fg] transition-colors rounded-lg hover:bg-[--card]"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={() => setSelectedDate(todayKey)}
          className={`text-[13px] font-medium px-3 py-1 rounded-lg transition-colors ${
            isToday ? 'text-[#007AFF]' : 'text-[--fg] hover:bg-[--card]'
          }`}
        >
          {isToday ? '今日' : formatDateLabel(selectedDate)}
        </button>
        <button
          onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
          disabled={selectedDate >= todayKey}
          className="w-7 h-7 flex items-center justify-center text-[--fg2] hover:text-[--fg] transition-colors rounded-lg hover:bg-[--card] disabled:opacity-30"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Input */}
      <div className="mb-3">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="思ったことを記録..."
          rows={3}
          className="w-full px-3 py-2.5 text-[14px] bg-[--bg2] rounded-xl border-none outline-none placeholder:text-[--fg3] focus:ring-2 focus:ring-[#007AFF]/20 transition-all resize-none leading-relaxed"
        />
        <div className="flex justify-end mt-1.5">
          <button
            onClick={addMemo}
            disabled={!input.trim()}
            className="px-4 py-1.5 text-[13px] font-medium bg-[#007AFF] text-white rounded-lg hover:bg-[#0056b3] disabled:opacity-30 transition-all"
          >
            記録する
          </button>
        </div>
      </div>

      {/* Memos for selected date */}
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {memos.length === 0 && (
          <p className="text-[13px] text-[--fg3] py-4 text-center">メモなし</p>
        )}
        {memos.map(memo => (
          <div
            key={memo.id}
            className="flex items-start gap-2 px-2 py-1.5 rounded-lg group hover:bg-[--bg2] transition-colors"
          >
            <span className="text-[11px] text-[--fg3] mt-0.5 flex-shrink-0 tabular-nums">
              {formatTime(memo.timestamp)}
            </span>
            <p className="text-[14px] text-[--fg] flex-1 leading-snug">{memo.text}</p>
            <button
              onClick={() => deleteMemo(memo.id)}
              className="opacity-0 group-hover:opacity-100 text-[--fg3] hover:text-[#FF3B30] transition-all flex-shrink-0 mt-0.5"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Jump to dates with memos */}
      {memoDates.length > 1 && (
        <div className="border-t border-[--border] pt-2 mt-3">
          <div className="flex gap-1.5 flex-wrap">
            {memoDates.filter(d => d !== selectedDate).slice(0, 7).map(d => (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className="text-[11px] text-[--fg2] hover:text-[#007AFF] px-2 py-1 rounded-lg hover:bg-[--bg2] transition-colors tabular-nums"
              >
                {formatDateLabel(d).split('（')[0]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
