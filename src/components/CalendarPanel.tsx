import { useState, useEffect } from 'react';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

function formatTime(dateTime: string): string {
  const d = new Date(dateTime);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function CalendarPanel() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/calendar-events')
      .then(res => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setEvents(data);
        }
        setError(null);
      })
      .catch(() => setError('カレンダーの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const isEventPast = (event: CalendarEvent) => {
    if (!event.end.dateTime) return false;
    return new Date(event.end.dateTime) < now;
  };

  const isEventNow = (event: CalendarEvent) => {
    if (!event.start.dateTime || !event.end.dateTime) return false;
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return start <= now && now <= end;
  };

  const allDayEvents = events.filter(e => e.start.date && !e.start.dateTime);
  const timedEvents = events.filter(e => e.start.dateTime);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">スケジュール</h2>
        <span className="text-[13px] text-[#86868b] tabular-nums">
          {currentHour}:{String(currentMinute).padStart(2, '0')}
        </span>
      </div>

      {loading && (
        <div className="py-6 text-center text-[13px] text-[#86868b]">読み込み中...</div>
      )}

      {error && (
        <div className="py-6 text-center text-[13px] text-[#86868b]">{error}</div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="py-6 text-center text-[13px] text-[#86868b]">予定なし</div>
      )}

      {!loading && !error && (
        <div className="space-y-1">
          {allDayEvents.length > 0 && (
            <div className="mb-3">
              {allDayEvents.map(event => (
                <div key={event.id} className="flex items-start gap-3 py-2 px-1 rounded-lg">
                  <div className="w-[52px] flex-shrink-0 text-[12px] text-[#86868b]">終日</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-[#86868b] leading-snug truncate">
                      {event.summary}
                    </p>
                  </div>
                </div>
              ))}
              <div className="border-b border-[#e5e5ea] my-2" />
            </div>
          )}

          {timedEvents.map(event => {
            const past = isEventPast(event);
            const active = isEventNow(event);

            return (
              <div
                key={event.id}
                className={`flex items-start gap-3 py-2.5 px-1 rounded-lg transition-colors ${
                  active ? 'bg-[#007AFF]/5' : ''
                }`}
              >
                {active && (
                  <div className="w-[3px] h-full min-h-[24px] bg-[#007AFF] rounded-full flex-shrink-0 mt-0.5" />
                )}
                <div className={`${active ? '' : 'w-[52px]'} flex-shrink-0 text-[13px] tabular-nums ${
                  past ? 'text-[#c7c7cc]' : active ? 'text-[#007AFF] font-medium' : 'text-[#86868b]'
                }`}>
                  {event.start.dateTime ? formatTime(event.start.dateTime) : ''}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] leading-snug ${
                    past ? 'text-[#c7c7cc]' : 'text-[#1d1d1f]'
                  } ${active ? 'font-medium' : ''}`}>
                    {event.summary}
                  </p>
                  {event.description && !past && (
                    <p className="text-[12px] text-[#86868b] mt-0.5 truncate">
                      {event.description.split('\n')[0]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
