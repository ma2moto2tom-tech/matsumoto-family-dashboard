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
  const circumference = 2 * Math.PI * 54;

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          mode === 'work' ? 'bg-orange-500' : 'bg-green-500'
        }`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2"/>
            <path d="M8 4.5V8L10.5 9.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Pomodoro</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {sessions} done
        </span>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 mb-4">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#f0f0f0" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={mode === 'work' ? '#f97316' : '#22c55e'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-light text-gray-900 tabular-nums tracking-tight">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <span className="text-[11px] text-gray-400 mt-0.5">{LABELS[mode]}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setRunning(!running)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              running
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : mode === 'work'
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {running ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={() => reset(mode)}
            className="px-4 py-2 rounded-full text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="flex gap-1 mt-4">
          {(['work', 'break', 'longBreak'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => reset(m)}
              className={`px-3 py-1 rounded-full text-[11px] transition-colors ${
                mode === m ? 'bg-gray-200 text-gray-700 font-medium' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {LABELS[m]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
