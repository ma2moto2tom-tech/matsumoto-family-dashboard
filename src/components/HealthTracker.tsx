import { useState, useEffect } from 'react';

interface HealthEntry {
  date: string;
  weight: string;
  bpSystolic: string;
  bpDiastolic: string;
  alcohol: string;
  diary: string;
  timestamp: number;
}

const STORAGE_KEY = 'matsumoto-health-log';

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadEntries(): HealthEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: HealthEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export default function HealthTracker() {
  const [entries, setEntries] = useState<HealthEntry[]>(loadEntries);
  const todayKey = getTodayKey();
  const todayEntry = entries.find(e => e.date === todayKey);

  const [weight, setWeight] = useState(todayEntry?.weight || '');
  const [bpSystolic, setBpSystolic] = useState(todayEntry?.bpSystolic || '');
  const [bpDiastolic, setBpDiastolic] = useState(todayEntry?.bpDiastolic || '');
  const [alcohol, setAlcohol] = useState(todayEntry?.alcohol || '');
  const [diary, setDiary] = useState(todayEntry?.diary || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => { saveEntries(entries); }, [entries]);

  const save = () => {
    const entry: HealthEntry = {
      date: todayKey,
      weight,
      bpSystolic,
      bpDiastolic,
      alcohol,
      diary,
      timestamp: Date.now(),
    };
    setEntries(prev => {
      const filtered = prev.filter(e => e.date !== todayKey);
      return [entry, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const recentEntries = entries.filter(e => e.date !== todayKey).slice(0, 5);

  const inputClass = "w-full px-3 py-2 text-[14px] bg-[#f5f5f7] rounded-xl border-none outline-none placeholder:text-[#c7c7cc] focus:ring-2 focus:ring-[#007AFF]/20 transition-all tabular-nums";

  return (
    <div className="card">
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

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[11px] text-[#86868b] mb-1 block">体重 (kg)</label>
          <input
            type="number"
            step="0.1"
            placeholder="75.0"
            className={inputClass}
            value={weight}
            onChange={e => setWeight(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[11px] text-[#86868b] mb-1 block">血圧</label>
          <div className="flex gap-1.5 items-center">
            <input
              type="number"
              placeholder="120"
              className={`${inputClass} text-center`}
              value={bpSystolic}
              onChange={e => setBpSystolic(e.target.value)}
            />
            <span className="text-[#c7c7cc] text-[14px]">/</span>
            <input
              type="number"
              placeholder="80"
              className={`${inputClass} text-center`}
              value={bpDiastolic}
              onChange={e => setBpDiastolic(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[11px] text-[#86868b] mb-1 block">お酒</label>
        <input
          type="text"
          placeholder="ビール350ml x 2"
          className={inputClass}
          value={alcohol}
          onChange={e => setAlcohol(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="text-[11px] text-[#86868b] mb-1 block">一言日記</label>
        <input
          type="text"
          placeholder="今日感じたこと..."
          className={inputClass}
          value={diary}
          onChange={e => setDiary(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); }}
        />
      </div>

      {recentEntries.length > 0 && (
        <div className="border-t border-[#e5e5ea] pt-3">
          <p className="text-[11px] text-[#86868b] mb-2">最近の記録</p>
          <div className="space-y-2">
            {recentEntries.map(entry => (
              <div key={entry.date} className="flex items-baseline gap-3 text-[12px]">
                <span className="text-[#86868b] tabular-nums flex-shrink-0 w-[48px]">
                  {entry.date.slice(5).replace('-', '/')}
                </span>
                <div className="flex gap-3 flex-wrap text-[#1d1d1f]">
                  {entry.weight && <span>{entry.weight}kg</span>}
                  {entry.bpSystolic && <span>{entry.bpSystolic}/{entry.bpDiastolic}</span>}
                  {entry.alcohol && <span>{entry.alcohol}</span>}
                </div>
                {entry.diary && (
                  <span className="text-[#86868b] truncate flex-1">{entry.diary}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
