import { useState, useEffect, useCallback } from 'react';

interface TaskItem {
  id: string;
  text: string;
  done: boolean;
}

interface GoalItem {
  text: string;
  done: boolean;
}

type TaskData = Record<string, { tasks: TaskItem[]; goals: GoalItem[] }>;

const STORAGE_KEY = 'matsumoto-tasks';

function loadTasks(): TaskData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveTasks(data: TaskData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TaskPanel() {
  const todayKey = dateKey(new Date());
  const [data, setData] = useState<TaskData>(loadTasks);
  const [newTaskText, setNewTaskText] = useState('');
  const [showInput, setShowInput] = useState(false);

  // Load from briefing.json if today has no tasks
  useEffect(() => {
    if (data[todayKey]) return;
    fetch('/data/briefing.json')
      .then(r => r.json())
      .then(briefing => {
        if (briefing.date === todayKey || !data[todayKey]) {
          const updated = { ...data };
          updated[todayKey] = {
            tasks: briefing.tasks || [],
            goals: briefing.goals || [],
          };
          setData(updated);
          saveTasks(updated);
        }
      })
      .catch(() => {});
  }, [todayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayData = data[todayKey] || { tasks: [], goals: [] };
  const tasks = todayData.tasks;
  const goals = todayData.goals;

  const persist = useCallback((updated: TaskData) => {
    setData(updated);
    saveTasks(updated);
    fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'tasks.json', data: updated }),
    }).catch(() => {});
  }, []);

  const toggleTask = (id: string) => {
    const updated = { ...data };
    const day = { ...updated[todayKey] };
    day.tasks = day.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    updated[todayKey] = day;
    persist(updated);
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const updated = { ...data };
    const day = updated[todayKey] || { tasks: [], goals: [] };
    day.tasks = [...day.tasks, { id: crypto.randomUUID(), text: newTaskText.trim(), done: false }];
    updated[todayKey] = day;
    persist(updated);
    setNewTaskText('');
    setShowInput(false);
  };

  const deleteTask = (id: string) => {
    const updated = { ...data };
    const day = { ...updated[todayKey] };
    day.tasks = day.tasks.filter(t => t.id !== id);
    updated[todayKey] = day;
    persist(updated);
  };

  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-[--fg]">今日やること</h2>
        <div className="flex items-center gap-3">
          {tasks.length > 0 && (
            <span className="text-[12px] text-[--fg2] tabular-nums">
              {doneCount}/{tasks.length}
            </span>
          )}
          <button
            onClick={() => setShowInput(!showInput)}
            className="text-[12px] text-[#007AFF] font-medium hover:text-[#0056b3] transition-colors"
          >
            {showInput ? 'キャンセル' : '追加'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="h-1 bg-[--bg2] rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-[#34C759] rounded-full transition-all duration-500"
            style={{ width: `${(doneCount / tasks.length) * 100}%` }}
          />
        </div>
      )}

      {/* Add task input */}
      {showInput && (
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="新しいタスク..."
            autoFocus
            className="flex-1 px-3 py-2 text-[14px] bg-[--bg2] rounded-xl border-none outline-none placeholder:text-[--fg3] focus:ring-2 focus:ring-[#007AFF]/20 transition-all text-[--fg]"
          />
          <button
            onClick={addTask}
            disabled={!newTaskText.trim()}
            className="px-3 py-2 text-[13px] font-medium bg-[#007AFF] text-white rounded-xl hover:bg-[#0056b3] disabled:opacity-30 transition-all"
          >
            追加
          </button>
        </div>
      )}

      {/* Tasks */}
      <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
        {tasks.length === 0 && !showInput && (
          <p className="text-[13px] text-[--fg3] text-center py-6">タスクなし</p>
        )}
        {tasks.map(task => (
          <div
            key={task.id}
            className={`flex items-start gap-3 py-2 px-2 rounded-xl group transition-all ${
              task.done ? 'opacity-40' : 'hover:bg-[--bg2]'
            }`}
          >
            <div
              className={`mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                task.done ? 'border-[#34C759] bg-[#34C759]' : 'border-[--fg3]'
              }`}
              onClick={() => toggleTask(task.id)}
            >
              {task.done && (
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 8.5L6.5 11.5L12.5 5.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span
              className={`text-[14px] leading-snug flex-1 cursor-pointer ${
                task.done ? 'text-[--fg2] line-through' : 'text-[--fg]'
              }`}
              onClick={() => toggleTask(task.id)}
            >
              {task.text}
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              className="opacity-0 group-hover:opacity-100 text-[--fg3] hover:text-[#FF3B30] transition-all flex-shrink-0 mt-0.5"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Goals */}
      {goals.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[--border]">
          <p className="text-[11px] text-[--fg2] mb-2 uppercase tracking-wider">Today's Goal</p>
          <div className="space-y-1">
            {goals.map((g, i) => (
              <div key={i} className={`flex items-start gap-2 text-[13px] ${g.done ? 'text-[--fg2] line-through' : 'text-[--fg]'}`}>
                <span className="shrink-0">{g.done ? '—' : '·'}</span>
                <span>{g.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
