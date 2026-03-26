import { useState, useEffect } from 'react';

interface ScheduleItem {
  time: string;
  title: string;
  done: boolean;
}

interface BriefingData {
  date: string;
  schedule: ScheduleItem[];
}

export default function CalendarPanel() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/briefing.json')
      .then(r => r.json())
      .then((data: BriefingData) => {
        setSchedule(data.schedule || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  function getStatus(item: ScheduleItem): 'done' | 'now' | 'upcoming' | 'past' {
    if (item.done) return 'done';
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
        <span className="text-[12px] text-[#86868b]">ブリーフィングより</span>
      </div>

      {loading ? (
        <p className="text-[13px] text-[#86868b] text-center py-8">読み込み中...</p>
      ) : schedule.length === 0 ? (
        <p className="text-[13px] text-[#86868b] text-center py-8">予定なし</p>
      ) : (
        <div className="space-y-1">
          {schedule.map((item, i) => {
            const status = getStatus(item);
            return (
              <div
                key={i}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  status === 'now' ? 'bg-[#007AFF]/8' : status === 'done' ? 'opacity-50' : ''
                }`}
              >
                <div className="w-[80px] shrink-0">
                  {item.time ? (
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
                    status === 'done' ? 'bg-[#34C759]'
                    : status === 'now' ? 'bg-[#007AFF] animate-pulse'
                    : status === 'past' ? 'bg-[#86868b]'
                    : 'bg-[#d2d2d7]'
                  }`} />
                </div>
                <span className={`text-[14px] leading-snug ${
                  status === 'done' ? 'text-[#86868b] line-through' : 'text-[#1d1d1f]'
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
