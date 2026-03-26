import { useState, useEffect, useRef, useCallback } from 'react';

type Mode = 'work' | 'break' | 'longBreak';

const DURATIONS: Record<Mode, number> = {
  work: 25 * 60,
  break: 5 * 60,
  longBreak: 15 * 60,
};

const LABELS: Record<Mode, string> = {
  work: 'Focus',
  break: 'Break',
  longBreak: 'Long Break',
};

export default function PomodoroTimer() {
  const [mode, setMode] = useState<Mode>('work');
  const [timeLeft, setTimeLeft] = useState(DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback((newMode: Mode) => {
    setMode(newMode);
    setTimeLeft(DURATIONS[newMode]);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (mode === 'work') {
              const next = sessions + 1;
              setSessions(next);
              if (next % 4 === 0) {
                reset('longBreak');
              } else {
                reset('break');
              }
            } else {
              reset('work');
            }
            try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACA').play(); } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, sessions, reset]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = 1 - timeLeft / DURATIONS[mode];
  const circumference = 2 * Math.PI * 22;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isWork = mode === 'work';
  const color = isWork ? '#FF9500' : '#34C759';

  // Floating pill (collapsed)
  if (!expanded) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 cursor-pointer"
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center gap-2.5 bg-[--card] rounded-full px-4 py-2.5 shadow-lg border border-[--border] hover:shadow-xl transition-shadow">
          {/* Mini circle */}
          <div className="relative w-8 h-8">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-[--bg2]" />
              <circle
                cx="24" cy="24" r="20" fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 20}
                strokeDashoffset={2 * Math.PI * 20 * (1 - progress)}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            {running && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
              </div>
            )}
          </div>
          <span className="text-[14px] font-medium tabular-nums text-[--fg]">{timeStr}</span>
          <span className="text-[11px] text-[--fg2]">{LABELS[mode]}</span>
        </div>
      </div>
    );
  }

  // Expanded panel
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-[--card] rounded-2xl p-5 shadow-xl border border-[--border] w-[260px]">
        {/* Close button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-[--fg]">Pomodoro</h3>
            <span className="text-[11px] text-[--fg3] bg-[--bg2] px-1.5 py-0.5 rounded-full">{sessions}</span>
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="w-6 h-6 flex items-center justify-center text-[--fg3] hover:text-[--fg] rounded-md transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Timer circle */}
        <div className="flex flex-col items-center">
          <div className="relative w-28 h-28 mb-4">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="5" className="text-[--bg2]" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={color}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - progress)}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-light text-[--fg] tabular-nums tracking-tight">{timeStr}</span>
              <span className="text-[10px] text-[--fg2] mt-0.5">{LABELS[mode]}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setRunning(!running)}
              className="px-5 py-2 rounded-full text-[13px] font-medium transition-all text-white"
              style={{ backgroundColor: running ? '#8E8E93' : color }}
            >
              {running ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={() => reset(mode)}
              className="px-3 py-2 rounded-full text-[13px] text-[--fg2] hover:bg-[--bg2] transition-colors"
            >
              Reset
            </button>
          </div>

          <div className="flex gap-1 mt-3">
            {(['work', 'break', 'longBreak'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => reset(m)}
                className={`px-2.5 py-1 rounded-full text-[10px] transition-colors ${
                  mode === m ? 'bg-[--bg2] text-[--fg] font-medium' : 'text-[--fg3] hover:text-[--fg2]'
                }`}
              >
                {LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
