import { useState, useEffect, useCallback } from 'react';

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  allDay: boolean;
  status: string;
}

export default function CalendarPanel() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar-events');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSchedule(data.schedule || []);
      setError(null);
      const now = new Date();
      setLastUpdated(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchEvents, 60000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  function parseStartMinutes(time: string): number {
    const match = time.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return -1;
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }

  function parseEndMinutes(time: string): number {
    const match = time.match(/-(\d{1,2}):(\d{2})$/);
    if (!match) return -1;
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }

  function getStatus(item: ScheduleItem): 'now' | 'upcoming' | 'past' {
    if (item.allDay) return 'upcoming';
    const start = parseStartMinutes(item.time);
    const end = parseEndMinutes(item.time);
    if (start === -1) return 'upcoming';
    if (currentMinutes >= start && (end === -1 || currentMinutes < end)) return 'now';
    if (end !== -1 && currentMinutes >= end) return 'past';
    return 'upcoming';
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">スケジュール</h2>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[11px] text-[#c7c7cc]">{lastUpdated} 更新</span>
          )}
          <span className="text-[12px] text-[#86868b]">Google Calendar</span>
        </div>
      </div>

      {loading ? (
        <p className="text-[13px] text-[#86868b] text-center py-8">読み込み中...</p>
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-[13px] text-[#FF3B30] mb-2">取得エラー</p>
          <p className="text-[11px] text-[#86868b]">{error}</p>
          <button
            onClick={fetchEvents}
            className="mt-3 text-[12px] text-[#007AFF] hover:underline"
          >
            再試行
          </button>
        </div>
      ) : schedule.length === 0 ? (
        <p className="text-[13px] text-[#86868b] text-center py-8">今日の予定なし</p>
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
                <div className="w-[80px] shrink-0">
                  {item.allDay ? (
                    <span className="text-[12px] text-[#86868b]">終日</span>
                  ) : item.time ? (
                    <span className={`text-[13px] font-medium tabular-nums ${
                      status === 'now' ? 'text-[#007AFF]' : 'text-[#86868b]'
                    }`}>
                      {item.time.split('-')[0]}
                    </span>
                  ) : (
                    <span className="text-[13px] text-[#c7c7cc]">--:--</span>
                  )}
                </div>
                <div className="mt-1.5 shrink-0">
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'now' ? 'bg-[#007AFF] animate-pulse'
                    : status === 'past' ? 'bg-[#86868b]'
                    : 'bg-[#d2d2d7]'
                  }`} />
                </div>
                <span className={`text-[14px] leading-snug ${
                  status === 'past' ? 'text-[#86868b]' : 'text-[#1d1d1f]'
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
