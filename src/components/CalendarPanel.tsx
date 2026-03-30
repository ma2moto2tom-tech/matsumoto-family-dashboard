import { useState, useEffect, useCallback } from 'react';

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  allDay: boolean;
  status: string;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftDate(key: string, days: number): string {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

function formatDateLabel(key: string): string {
  const [, m, d] = key.split('-');
  const date = new Date(key + 'T00:00:00');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${parseInt(m)}/${parseInt(d)}（${weekdays[date.getDay()]}）`;
}

export default function CalendarPanel() {
  const todayKey = dateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addStart, setAddStart] = useState('');
  const [addEnd, setAddEnd] = useState('');
  const [addAllDay, setAddAllDay] = useState(false);
  const [adding, setAdding] = useState(false);

  const isToday = selectedDate === todayKey;

  const fetchEvents = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar-events?date=${date}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSchedule(data.schedule || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(selectedDate);
  }, [selectedDate, fetchEvents]);

  // Auto-refresh every 60s if viewing today
  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => fetchEvents(selectedDate), 60000);
    return () => clearInterval(interval);
  }, [isToday, selectedDate, fetchEvents]);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  function getStatus(item: ScheduleItem): 'now' | 'upcoming' | 'past' {
    if (!isToday || item.allDay) return 'upcoming';
    const startMatch = item.time.match(/^(\d{1,2}):(\d{2})/);
    if (!startMatch) return 'upcoming';
    const start = parseInt(startMatch[1]) * 60 + parseInt(startMatch[2]);
    const endMatch = item.time.match(/-(\d{1,2}):(\d{2})$/);
    const end = endMatch ? parseInt(endMatch[1]) * 60 + parseInt(endMatch[2]) : -1;
    if (currentMinutes >= start && (end === -1 || currentMinutes < end)) return 'now';
    if (end !== -1 && currentMinutes >= end) return 'past';
    if (currentMinutes < start) return 'upcoming';
    return 'upcoming';
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold text-[--fg]">スケジュール</h2>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[--fg3]">Google Calendar</span>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-[12px] text-[#007AFF] font-medium hover:text-[#0056b3] transition-colors"
          >
            {showAdd ? 'キャンセル' : '追加'}
          </button>
        </div>
      </div>

      {/* Add event form */}
      {showAdd && (
        <div className="mb-4 p-3 bg-[--bg2] rounded-xl space-y-2">
          <input
            type="text"
            value={addTitle}
            onChange={e => setAddTitle(e.target.value)}
            placeholder="予定のタイトル"
            autoFocus
            className="w-full px-3 py-2 text-[13px] bg-[--card] rounded-lg border-none outline-none text-[--fg] placeholder:text-[--fg3]"
          />
          <label className="flex items-center gap-2 text-[12px] text-[--fg2]">
            <input
              type="checkbox"
              checked={addAllDay}
              onChange={e => setAddAllDay(e.target.checked)}
              className="rounded"
            />
            終日
          </label>
          {!addAllDay && (
            <div className="flex gap-2">
              <input
                type="time"
                value={addStart}
                onChange={e => setAddStart(e.target.value)}
                className="flex-1 px-2 py-1.5 text-[12px] bg-[--card] rounded-lg border-none outline-none text-[--fg]"
              />
              <span className="text-[12px] text-[--fg3] self-center">〜</span>
              <input
                type="time"
                value={addEnd}
                onChange={e => setAddEnd(e.target.value)}
                className="flex-1 px-2 py-1.5 text-[12px] bg-[--card] rounded-lg border-none outline-none text-[--fg]"
              />
            </div>
          )}
          <button
            onClick={async () => {
              if (!addTitle.trim()) return;
              setAdding(true);
              try {
                const res = await fetch('/api/calendar-add', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    summary: addTitle.trim(),
                    date: selectedDate,
                    startTime: addAllDay ? undefined : addStart,
                    endTime: addAllDay ? undefined : addEnd,
                    allDay: addAllDay,
                  }),
                });
                if (res.ok) {
                  setAddTitle('');
                  setAddStart('');
                  setAddEnd('');
                  setAddAllDay(false);
                  setShowAdd(false);
                  fetchEvents(selectedDate);
                }
              } catch {}
              setAdding(false);
            }}
            disabled={!addTitle.trim() || adding}
            className="w-full px-3 py-2 text-[13px] font-medium bg-[#007AFF] text-white rounded-lg hover:bg-[#0056b3] disabled:opacity-40 transition-all"
          >
            {adding ? '追加中...' : 'カレンダーに追加'}
          </button>
        </div>
      )}

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-4 bg-[--bg2] rounded-xl px-2 py-1.5">
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
          className="w-7 h-7 flex items-center justify-center text-[--fg2] hover:text-[--fg] transition-colors rounded-lg hover:bg-[--card]"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {loading ? (
        <p className="text-[13px] text-[--fg2] text-center py-8">読み込み中...</p>
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-[13px] text-[#FF3B30] mb-2">取得エラー</p>
          <p className="text-[11px] text-[--fg2] break-all">{error}</p>
          <button
            onClick={() => fetchEvents(selectedDate)}
            className="mt-3 text-[12px] text-[#007AFF] hover:underline"
          >
            再試行
          </button>
        </div>
      ) : schedule.length === 0 ? (
        <p className="text-[13px] text-[--fg2] text-center py-8">予定なし</p>
      ) : (
        <div className="space-y-1">
          {schedule.map((item) => {
            const status = getStatus(item);
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  status === 'now' ? 'bg-[#007AFF]/8' : ''
                }`}
              >
                <div className="w-[60px] shrink-0">
                  {item.allDay ? (
                    <span className="text-[12px] text-[--fg2]">終日</span>
                  ) : item.time ? (
                    <span className={`text-[13px] font-medium tabular-nums ${
                      status === 'now' ? 'text-[#007AFF]' : 'text-[--fg2]'
                    }`}>
                      {item.time.split('-')[0]}
                    </span>
                  ) : (
                    <span className="text-[13px] text-[--fg3]">--:--</span>
                  )}
                </div>
                <div className="mt-1.5 shrink-0">
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'now' ? 'bg-[#007AFF] animate-pulse'
                    : status === 'past' ? 'bg-[--fg2]'
                    : 'bg-[--border]'
                  }`} />
                </div>
                <span className={`text-[14px] leading-snug ${
                  status === 'past' ? 'text-[--fg2]' : 'text-[--fg]'
                }`}>
                  {item.title}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
