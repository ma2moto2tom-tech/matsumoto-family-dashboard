import { useState, useEffect, useCallback, useRef } from 'react';

interface TaskItem {
  id: string;
  text: string;
  done: boolean;
}

interface DayData {
  tasks: TaskItem[];
  goals: { text: string; done: boolean }[];
}

type TaskData = Record<string, DayData>;

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

export default function TaskPanel() {
  const todayKey = dateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [data, setData] = useState<TaskData>({});
  const [newTaskText, setNewTaskText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{ taskId: string; x: number; y: number } | null>(null);
  const [moveDate, setMoveDate] = useState('');
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isToday = selectedDate === todayKey;

  // Load from GitHub TASKS.md
  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then((remote: TaskData) => {
        if (Object.keys(remote).length > 0) {
          setData(remote);
          setLastSync(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
        } else {
          fetch('/data/briefing.json')
            .then(r => r.json())
            .then(briefing => {
              const initial: TaskData = {};
              initial[todayKey] = {
                tasks: briefing.tasks || [],
                goals: briefing.goals || [],
              };
              setData(initial);
              saveToGitHub(initial);
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem('matsumoto-tasks');
          if (raw) setData(JSON.parse(raw));
        } catch {}
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [contextMenu]);

  const saveToGitHub = useCallback((updated: TaskData) => {
    localStorage.setItem('matsumoto-tasks', JSON.stringify(updated));
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      setSyncing(true);
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
        .then(() => {
          setLastSync(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
        })
        .catch(() => {})
        .finally(() => setSyncing(false));
    }, 1000);
  }, []);

  const dayData = data[selectedDate] || { tasks: [], goals: [] };
  const tasks = dayData.tasks;
  const activeTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);
  const doneCount = doneTasks.length;

  const toggleTask = (id: string) => {
    const updated = { ...data };
    const day = { ...(updated[selectedDate] || { tasks: [], goals: [] }) };
    day.tasks = day.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    updated[selectedDate] = day;
    setData(updated);
    saveToGitHub(updated);
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const updated = { ...data };
    const day = { ...(updated[selectedDate] || { tasks: [], goals: [] }) };
    day.tasks = [...day.tasks, { id: Math.random().toString(36).slice(2, 10), text: newTaskText.trim(), done: false }];
    updated[selectedDate] = day;
    setData(updated);
    saveToGitHub(updated);
    setNewTaskText('');
    setShowInput(false);
  };

  const deleteTask = (id: string) => {
    const updated = { ...data };
    const day = { ...(updated[selectedDate] || { tasks: [], goals: [] }) };
    day.tasks = day.tasks.filter(t => t.id !== id);
    updated[selectedDate] = day;
    setData(updated);
    saveToGitHub(updated);
  };

  const moveTaskToDate = (taskId: string, targetDate: string) => {
    if (!targetDate || targetDate === selectedDate) return;
    const updated = { ...data };
    const sourceDay = { ...(updated[selectedDate] || { tasks: [], goals: [] }) };
    const task = sourceDay.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Remove from source
    sourceDay.tasks = sourceDay.tasks.filter(t => t.id !== taskId);
    updated[selectedDate] = sourceDay;

    // Add to target
    const targetDay = { ...(updated[targetDate] || { tasks: [], goals: [] }) };
    targetDay.tasks = [...targetDay.tasks, { ...task, done: false }];
    updated[targetDate] = targetDay;

    setData(updated);
    saveToGitHub(updated);
    setContextMenu(null);
    setMoveDate('');
  };

  const handleContextMenu = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    setContextMenu({ taskId, x: e.clientX, y: e.clientY });
    setMoveDate(shiftDate(selectedDate, 1));
  };

  const handleTouchStart = (taskId: string) => {
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ taskId, x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 60 });
      setMoveDate(shiftDate(selectedDate, 1));
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-[--fg]">
            {isToday ? '今日やること' : 'タスク'}
          </h2>
          {syncing && (
            <span className="text-[10px] text-[#007AFF] animate-pulse">同期中...</span>
          )}
          {!syncing && lastSync && (
            <span className="text-[10px] text-[--fg3]">{lastSync}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {tasks.length > 0 && (
            <span className="text-[12px] text-[--fg2] tabular-nums">
              {activeTasks.length}件
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

      {/* Active tasks */}
      <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
        {activeTasks.length === 0 && !showInput && doneCount === 0 && (
          <p className="text-[13px] text-[--fg3] text-center py-6">タスクなし</p>
        )}
        {activeTasks.length === 0 && doneCount > 0 && (
          <p className="text-[13px] text-[#34C759] text-center py-4 font-medium">全タスク完了</p>
        )}
        {activeTasks.map(task => (
          <div
            key={task.id}
            className="flex items-start gap-3 py-2.5 px-3 rounded-xl group hover:bg-[--bg2] transition-all"
            onContextMenu={e => handleContextMenu(e, task.id)}
            onTouchStart={() => handleTouchStart(task.id)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
          >
            <div
              className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 border-[--fg3] flex-shrink-0 flex items-center justify-center transition-all cursor-pointer hover:border-[#34C759]"
              onClick={() => toggleTask(task.id)}
            />
            <span
              className="text-[14px] leading-snug flex-1 cursor-pointer text-[--fg]"
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

      {/* Completed tasks toggle */}
      {doneCount > 0 && (
        <div className="mt-3 pt-3 border-t border-[--border]">
          <button
            onClick={() => setShowDone(!showDone)}
            className="flex items-center gap-2 text-[12px] text-[--fg2] hover:text-[--fg] transition-colors w-full"
          >
            <svg
              width="10" height="10" viewBox="0 0 16 16" fill="none"
              className={`transition-transform ${showDone ? 'rotate-90' : ''}`}
            >
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>完了タスク ({doneCount})</span>
          </button>
          {showDone && (
            <div className="mt-2 space-y-0.5">
              {doneTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 py-1.5 px-3 rounded-xl group transition-all"
                  onContextMenu={e => handleContextMenu(e, task.id)}
                  onTouchStart={() => handleTouchStart(task.id)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                >
                  <div
                    className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 border-[#34C759] bg-[#34C759] flex-shrink-0 flex items-center justify-center cursor-pointer"
                    onClick={() => toggleTask(task.id)}
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                      <path d="M3.5 8.5L6.5 11.5L12.5 5.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-[13px] leading-snug flex-1 text-[--fg2] line-through cursor-pointer" onClick={() => toggleTask(task.id)}>
                    {task.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Context menu for moving task */}
      {contextMenu && (
        <div
          className="fixed z-[100] bg-[--card] rounded-xl border border-[--border] shadow-xl p-3 min-w-[200px]"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 220), top: Math.min(contextMenu.y, window.innerHeight - 140) }}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[12px] text-[--fg2] mb-2">タスクを移動</p>
          <div className="flex gap-1.5 mb-2">
            <button
              onClick={() => moveTaskToDate(contextMenu.taskId, shiftDate(selectedDate, 1))}
              className="flex-1 px-3 py-1.5 text-[12px] font-medium bg-[#007AFF] text-white rounded-lg hover:bg-[#0056b3] transition-colors"
            >
              明日
            </button>
            <button
              onClick={() => moveTaskToDate(contextMenu.taskId, shiftDate(selectedDate, 7))}
              className="flex-1 px-3 py-1.5 text-[12px] font-medium bg-[--bg2] text-[--fg] rounded-lg hover:bg-[--border] transition-colors"
            >
              1週間後
            </button>
          </div>
          <div className="flex gap-1.5">
            <input
              type="date"
              value={moveDate}
              onChange={e => setMoveDate(e.target.value)}
              className="flex-1 px-2 py-1.5 text-[12px] bg-[--bg2] rounded-lg border-none outline-none text-[--fg]"
            />
            <button
              onClick={() => moveTaskToDate(contextMenu.taskId, moveDate)}
              disabled={!moveDate}
              className="px-3 py-1.5 text-[12px] font-medium text-[#007AFF] hover:bg-[--bg2] rounded-lg transition-colors disabled:opacity-30"
            >
              移動
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
