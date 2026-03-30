import { useState, useEffect, useRef, useCallback } from 'react';

type Mode = 'work' | 'break' | 'longBreak';

interface WorkLogEntry {
  id: string;
  text: string;
  timestamp: number;
  duration: number;
}

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

const LOG_KEY = 'matsumoto-pomodoro-log';
const SESSION_KEY = 'matsumoto-pomodoro-sessions';
const TASKS_KEY = 'matsumoto-pomodoro-tasks';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadLog(): Record<string, WorkLogEntry[]> {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '{}'); } catch { return {}; }
}

function loadSessions(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}'); } catch { return {}; }
}

function loadTaskList(): string[] {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]'); } catch { return []; }
}

export default function PomodoroTimer() {
  const [mode, setMode] = useState<Mode>('work');
  const [timeLeft, setTimeLeft] = useState(DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>(loadSessions);
  const [expanded, setExpanded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [workLog, setWorkLog] = useState<Record<string, WorkLogEntry[]>>(loadLog);
  const [showLog, setShowLog] = useState(false);

  // Task selection
  const [taskList, setTaskList] = useState<string[]>(loadTaskList);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [newTaskName, setNewTaskName] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const today = dateKey(new Date());
  const sessions = sessionCounts[today] || 0;

  const reset = useCallback((newMode: Mode) => {
    setMode(newMode);
    setTimeLeft(DURATIONS[newMode]);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const saveWorkEntry = useCallback((text: string) => {
    const entry: WorkLogEntry = {
      id: Math.random().toString(36).slice(2, 10),
      text: text.trim(),
      timestamp: Date.now(),
      duration: 25,
    };
    const updated = { ...workLog };
    updated[today] = [entry, ...(updated[today] || [])];
    setWorkLog(updated);
    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
  }, [workLog, today]);

  const addTaskToList = (name: string) => {
    if (!name.trim() || taskList.includes(name.trim())) return;
    const updated = [name.trim(), ...taskList];
    setTaskList(updated);
    localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
    setSelectedTask(name.trim());
    setNewTaskName('');
    setShowNewTask(false);
  };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (mode === 'work') {
              const newCounts = { ...sessionCounts };
              const next = (newCounts[today] || 0) + 1;
              newCounts[today] = next;
              setSessionCounts(newCounts);
              localStorage.setItem(SESSION_KEY, JSON.stringify(newCounts));

              // Auto-save with selected task name
              if (selectedTask) {
                saveWorkEntry(selectedTask);
              } else {
                setShowPrompt(true);
                setExpanded(true);
              }

              if (next % 4 === 0) {
                setTimeLeft(DURATIONS.longBreak);
                setMode('longBreak');
              } else {
                setTimeLeft(DURATIONS.break);
                setMode('break');
              }

              try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACA').play(); } catch {}
              return 0;
            } else {
              reset('work');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, sessionCounts, today, reset, selectedTask, saveWorkEntry]);

  const submitPrompt = () => {
    if (promptText.trim()) {
      saveWorkEntry(promptText);
      // Auto-add to task list
      if (!taskList.includes(promptText.trim())) {
        const updated = [promptText.trim(), ...taskList];
        setTaskList(updated);
        localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
      }
    }
    setPromptText('');
    setShowPrompt(false);
  };

  const skipPrompt = () => {
    saveWorkEntry('(記録なし)');
    setPromptText('');
    setShowPrompt(false);
  };

  const todayLog = workLog[today] || [];
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = 1 - timeLeft / DURATIONS[mode];
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isWork = mode === 'work';
  const color = isWork ? '#FF9500' : '#34C759';

  // Collapsed floating pill
  if (!expanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50 cursor-pointer" onClick={() => setExpanded(true)}>
        <div className="w-14 h-14 rounded-full bg-[--card] border border-[--border] shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow relative">
          <svg className="w-14 h-14 -rotate-90 absolute inset-0" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[--bg2]" />
            <circle cx="28" cy="28" r="24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - progress)}
              className="transition-all duration-1000 ease-linear" />
          </svg>
          <div className="relative z-10 flex flex-col items-center">
            {running ? (
              <span className="text-[11px] font-medium tabular-nums text-[--fg]">{timeStr}</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            )}
          </div>
          {sessions > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF9500] flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{sessions}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Expanded panel
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-[--card] rounded-2xl p-5 shadow-xl border border-[--border] w-[280px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-[--fg]">Pomodoro</h3>
            <span className="text-[11px] text-[--fg3] bg-[--bg2] px-1.5 py-0.5 rounded-full">{sessions}</span>
          </div>
          <button onClick={() => setExpanded(false)}
            className="w-6 h-6 flex items-center justify-center text-[--fg3] hover:text-[--fg] rounded-md transition-colors">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Task selector - only when not running */}
        {!running && !showPrompt && (
          <div className="mb-4">
            <p className="text-[11px] text-[--fg2] mb-1.5">何に集中する？</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {taskList.map(task => (
                <button key={task} onClick={() => setSelectedTask(selectedTask === task ? '' : task)}
                  className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${
                    selectedTask === task
                      ? 'bg-[#FF9500] text-white font-medium'
                      : 'bg-[--bg2] text-[--fg2] hover:text-[--fg]'
                  }`}
                >{task}</button>
              ))}
              {!showNewTask && (
                <button onClick={() => setShowNewTask(true)}
                  className="px-2.5 py-1 rounded-full text-[11px] text-[#007AFF] bg-[--bg2] hover:bg-[--border] transition-colors">
                  + 追加
                </button>
              )}
            </div>
            {showNewTask && (
              <div className="flex gap-1.5">
                <input type="text" value={newTaskName} onChange={e => setNewTaskName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTaskToList(newTaskName)}
                  placeholder="新しい作業..." autoFocus
                  className="flex-1 px-2.5 py-1.5 text-[12px] bg-[--bg2] rounded-lg border-none outline-none text-[--fg] placeholder:text-[--fg3]" />
                <button onClick={() => addTaskToList(newTaskName)} disabled={!newTaskName.trim()}
                  className="px-2.5 py-1.5 text-[11px] font-medium text-[#007AFF] hover:bg-[--bg2] rounded-lg disabled:opacity-30">
                  追加
                </button>
                <button onClick={() => { setShowNewTask(false); setNewTaskName(''); }}
                  className="px-2 py-1.5 text-[11px] text-[--fg3] hover:text-[--fg]">
                  ×
                </button>
              </div>
            )}
            {selectedTask && (
              <p className="text-[11px] text-[--fg3] mt-1.5">
                {selectedTask} — 完了時に自動記録されます
              </p>
            )}
          </div>
        )}

        {/* Prompt overlay */}
        {showPrompt && (
          <div className="mb-4 p-3 bg-[--bg2] rounded-xl">
            <p className="text-[13px] font-medium text-[--fg] mb-2">何をやった？</p>
            <input type="text" value={promptText} onChange={e => setPromptText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitPrompt()}
              placeholder="作業内容..." autoFocus
              className="w-full px-3 py-2 text-[13px] bg-[--card] rounded-lg border-none outline-none placeholder:text-[--fg3] focus:ring-2 focus:ring-[#FF9500]/20 transition-all text-[--fg] mb-2" />
            <div className="flex gap-2">
              <button onClick={submitPrompt}
                className="flex-1 px-3 py-1.5 text-[12px] font-medium bg-[#FF9500] text-white rounded-lg hover:bg-[#E08600] transition-colors">
                記録
              </button>
              <button onClick={skipPrompt}
                className="px-3 py-1.5 text-[12px] text-[--fg2] hover:bg-[--card] rounded-lg transition-colors">
                スキップ
              </button>
            </div>
          </div>
        )}

        {/* Timer circle */}
        {!showPrompt && (
          <div className="flex flex-col items-center">
            <div className="relative w-28 h-28 mb-4">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="5" className="text-[--bg2]" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - progress)}
                  className="transition-all duration-1000 ease-linear" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-light text-[--fg] tabular-nums tracking-tight">{timeStr}</span>
                <span className="text-[10px] text-[--fg2] mt-0.5">{LABELS[mode]}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setRunning(!running)}
                className="px-5 py-2 rounded-full text-[13px] font-medium transition-all text-white"
                style={{ backgroundColor: running ? '#8E8E93' : color }}>
                {running ? 'Pause' : 'Start'}
              </button>
              <button onClick={() => reset(mode)}
                className="px-3 py-2 rounded-full text-[13px] text-[--fg2] hover:bg-[--bg2] transition-colors">
                Reset
              </button>
            </div>

            <div className="flex gap-1 mt-3">
              {(['work', 'break', 'longBreak'] as Mode[]).map(m => (
                <button key={m} onClick={() => reset(m)}
                  className={`px-2.5 py-1 rounded-full text-[10px] transition-colors ${
                    mode === m ? 'bg-[--bg2] text-[--fg] font-medium' : 'text-[--fg3] hover:text-[--fg2]'
                  }`}>
                  {LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Work log */}
        {todayLog.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[--border]">
            <button onClick={() => setShowLog(!showLog)}
              className="flex items-center gap-2 text-[12px] text-[--fg2] hover:text-[--fg] transition-colors w-full">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"
                className={`transition-transform ${showLog ? 'rotate-90' : ''}`}>
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>作業ログ ({todayLog.length})</span>
            </button>
            {showLog && (
              <div className="mt-2 space-y-1 max-h-[120px] overflow-y-auto">
                {todayLog.map(entry => (
                  <div key={entry.id} className="flex items-start gap-2 px-1 py-1">
                    <span className="text-[10px] text-[--fg3] mt-0.5 flex-shrink-0 tabular-nums">
                      {new Date(entry.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[12px] text-[--fg] leading-snug">{entry.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
