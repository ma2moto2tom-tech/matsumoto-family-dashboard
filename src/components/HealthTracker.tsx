import { useState, useEffect, useCallback } from 'react';

interface HealthEntry {
  weight: string;
  bpSystolic: string;
  bpDiastolic: string;
  alcohol: string;
  diary: string;
}

type HealthData = Record<string, HealthEntry>;

const STORAGE_KEY = 'matsumoto-health-log';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(key: string): string {
  const [, m, d] = key.split('-');
  const date = new Date(key + 'T00:00:00');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${parseInt(m)}/${parseInt(d)}（${weekdays[date.getDay()]}）`;
}

function loadData(): HealthData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveData(data: HealthData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function shiftDate(key: string, days: number): string {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export default function HealthTracker() {
  const todayKey = dateKey(new Date());
  const [data, setData] = useState<HealthData>(loadData);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [saved, setSaved] = useState(false);

  const entry = data[selectedDate] || { weight: '', bpSystolic: '', bpDiastolic: '', alcohol: '', diary: '' };
  const isToday = selectedDate === todayKey;

  const [weight, setWeight] = useState(entry.weight);
  const [bpSystolic, setBpSystolic] = useState(entry.bpSystolic);
  const [bpDiastolic, setBpDiastolic] = useState(entry.bpDiastolic);
  const [alcohol, setAlcohol] = useState(entry.alcohol);
  const [diary, setDiary] = useState(entry.diary);

  // Sync form when date changes
  useEffect(() => {
    const e = data[selectedDate] || { weight: '', bpSystolic: '', bpDiastolic: '', alcohol: '', diary: '' };
    setWeight(e.weight);
    setBpSystolic(e.bpSystolic);
    setBpDiastolic(e.bpDiastolic);
    setAlcohol(e.alcohol);
    setDiary(e.diary);
  }, [selectedDate, data]);

  const save = useCallback(() => {
    const newEntry: HealthEntry = { weight, bpSystolic, bpDiastolic, alcohol, diary };
    const hasContent = Object.values(newEntry).some(v => v.trim() !== '');
    const updated = { ...data };
    if (hasContent) {
      updated[selectedDate] = newEntry;
    } else {
      delete updated[selectedDate];
    }
    setData(updated);
    saveData(updated);
    // Also save to file via API
    fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'health.json', data: updated }),
    }).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [weight, bpSystolic, bpDiastolic, alcohol, diary, selectedDate, data]);

  // Get sorted dates that have entries
  const entryDates = Object.keys(data).sort().reverse();

  const inputClass = "w-full px-3 py-2 text-[14px] bg-[#f5f5f7] rounded-xl border-none outline-none placeholder:text-[#c7c7cc] focus:ring-2 focus:ring-[#007AFF]/20 transition-all tabular-nums";

  return (
    <div className="card">
      {/* Header with date nav */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">ヘルスログ</h2>
        <button
          onClick={save}
          className={`text-[13px] font-medium transition-all ${
            saved ? 'text-[#34C759]' : 'text-[#007AFF] hover:text-[#0056b3]'
          }`}
        >
          {saved ? '保存済み' : '保存'}
        </button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-4 bg-[#f5f5f7] rounded-xl px-2 py-1.5">
        <button
          onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
          className="w-7 h-7 flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] transition-colors rounded-lg hover:bg-white"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={() => setSelectedDate(todayKey)}
          className={`text-[13px] font-medium px-3 py-1 rounded-lg transition-colors ${
            isToday ? 'text-[#007AFF]' : 'text-[#1d1d1f] hover:bg-white'
          }`}
        >
          {isToday ? '今日' : formatDateLabel(selectedDate)}
        </button>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(todayKey)}
            className="text-[12px] text-[#007AFF] font-medium px-2 py-0.5 rounded-md hover:bg-white transition-colors"
          >
            今日
          </button>
        )}
        <button
          onClick={() => {
            const next = shiftDate(selectedDate, 1);
            if (next <= todayKey) setSelectedDate(next);
          }}
          disabled={isToday}
          className="w-7 h-7 flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] transition-colors rounded-lg hover:bg-white disabled:opacity-30"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Form */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[11px] text-[#86868b] mb-1 block">体重 (kg)</label>
          <input type="number" step="0.1" placeholder="75.0" className={inputClass}
            value={weight} onChange={e => setWeight(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] text-[#86868b] mb-1 block">血圧</label>
          <div className="flex gap-1.5 items-center">
            <input type="number" placeholder="120" className={`${inputClass} text-center`}
              value={bpSystolic} onChange={e => setBpSystolic(e.target.value)} />
            <span className="text-[#c7c7cc] text-[14px]">/</span>
            <input type="number" placeholder="80" className={`${inputClass} text-center`}
              value={bpDiastolic} onChange={e => setBpDiastolic(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="mb-3">
        <label className="text-[11px] text-[#86868b] mb-1 block">お酒</label>
        <input type="text" placeholder="ビール350ml x 2" className={inputClass}
          value={alcohol} onChange={e => setAlcohol(e.target.value)} />
      </div>
      <div className="mb-4">
        <label className="text-[11px] text-[#86868b] mb-1 block">一言日記</label>
        <input type="text" placeholder="今日感じたこと..." className={inputClass}
          value={diary} onChange={e => setDiary(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); }} />
      </div>

      {/* Past entries */}
      {entryDates.length > 0 && (
        <div className="border-t border-[#e5e5ea] pt-3">
          <p className="text-[11px] text-[#86868b] mb-2">過去の記録</p>
          <div className="space-y-2 max-h-[140px] overflow-y-auto">
            {entryDates.filter(d => d !== selectedDate).slice(0, 14).map(date => {
              const e = data[date];
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className="flex items-baseline gap-3 text-[12px] w-full text-left hover:bg-[#f5f5f7] rounded-lg px-2 py-1.5 transition-colors"
                >
                  <span className="text-[#86868b] tabular-nums flex-shrink-0 w-[48px]">
                    {formatDateLabel(date).split('（')[0]}
                  </span>
                  <div className="flex gap-3 flex-wrap text-[#1d1d1f]">
                    {e.weight && <span>{e.weight}kg</span>}
                    {e.bpSystolic && <span>{e.bpSystolic}/{e.bpDiastolic}</span>}
                    {e.alcohol && <span>{e.alcohol}</span>}
                  </div>
                  {e.diary && (
                    <span className="text-[#86868b] truncate flex-1">{e.diary}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
