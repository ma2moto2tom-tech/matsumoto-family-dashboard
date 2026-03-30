import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface Task {
  id: string;
  text: string;
  done: boolean;
  category: string;
  dueDate: string | null;
  doneDate: string | null;
}

interface ApiResponse {
  categories: string[];
  tasks: Task[];
}

const TODAY = new Date().toISOString().split('T')[0];

const isToday = (dateStr: string | null): boolean => {
  if (!dateStr) return false;
  return dateStr === TODAY;
};

const isOverdue = (dateStr: string | null): boolean => {
  if (!dateStr) return false;
  return dateStr < TODAY;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
};

const sortTasks = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    // Overdue first
    const aOverdue = isOverdue(a.dueDate) ? 0 : 1;
    const bOverdue = isOverdue(b.dueDate) ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;

    // Then today
    const aToday = isToday(a.dueDate) ? 0 : 1;
    const bToday = isToday(b.dueDate) ? 0 : 1;
    if (aToday !== bToday) return aToday - bToday;

    // Then by due date
    if (a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    // Then by creation order (id)
    return a.id.localeCompare(b.id);
  });
};

export default function TaskPanel() {
  const [categories, setCategories] = useState<string[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setInterval>>();
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('API error');
      const data: ApiResponse = await res.json();
      setCategories(data.categories);
      setAllTasks(data.tasks);
      setLastSync(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));

      // Save to localStorage as backup
      localStorage.setItem('matsumoto-tasks-backup', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      // Fallback to localStorage
      try {
        const backup = localStorage.getItem('matsumoto-tasks-backup');
        if (backup) {
          const data: ApiResponse = JSON.parse(backup);
          setCategories(data.categories);
          setAllTasks(data.tasks);
        }
      } catch {}
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    syncTimer.current = setInterval(() => {
      fetchTasks();
    }, 60000);
    return () => {
      if (syncTimer.current) clearInterval(syncTimer.current);
    };
  }, [fetchTasks]);

  const updateTask = useCallback(
    async (taskId: string, action: 'toggle' | 'delete' | 'update' | 'add', options?: Partial<Task>) => {
      setSyncing(true);

      // Optimistic update
      if (action === 'toggle') {
        setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !t.done, doneDate: !t.done ? TODAY : null } : t));
      } else if (action === 'delete') {
        setAllTasks(prev => prev.filter(t => t.id !== taskId));
      } else if (action === 'add' && options) {
        const newTask: Task = {
          id: Math.random().toString(36).slice(2, 11),
          text: options.text || '',
          done: false,
          category: options.category || '',
          dueDate: options.dueDate || null,
          doneDate: null,
        };
        setAllTasks(prev => [...prev, newTask]);
      } else if (action === 'update' && options) {
        setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...options } : t));
      }

      // Clear any pending save
      if (saveTimeout.current) clearTimeout(saveTimeout.current);

      // Debounced API call
      saveTimeout.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/tasks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: taskId, action, ...options }),
          });
          if (!res.ok) throw new Error('API error');
          setLastSync(new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
        } catch (error) {
          console.error('Failed to update task:', error);
          // Revert on failure
          fetchTasks();
        } finally {
          setSyncing(false);
        }
      }, 500);
    },
    [fetchTasks],
  );

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (selectedCategory === 'すべて') {
      return allTasks.filter(t => !t.done);
    }
    return allTasks.filter(t => t.category === selectedCategory && !t.done);
  }, [allTasks, selectedCategory]);

  const sortedTasks = sortTasks(filteredTasks);

  // Completed tasks
  const completedTasks = useMemo(() => {
    if (selectedCategory === 'すべて') {
      return allTasks.filter(t => t.done);
    }
    return allTasks.filter(t => t.category === selectedCategory && t.done);
  }, [allTasks, selectedCategory]);

  // Due date stats
  const dueDateStats = useMemo(() => {
    const active = allTasks.filter(t => !t.done);
    const today = active.filter(t => isToday(t.dueDate)).length;
    const overdue = active.filter(t => isOverdue(t.dueDate)).length;
    return { today, overdue };
  }, [allTasks]);

  const handleAddTask = () => {
    if (!newTaskText.trim() || !newTaskCategory.trim()) return;
    updateTask('', 'add', {
      text: newTaskText.trim(),
      category: newTaskCategory,
      dueDate: newTaskDueDate || null,
    });
    setNewTaskText('');
    setNewTaskCategory(categories[0] || '');
    setNewTaskDueDate('');
    setShowAddForm(false);
  };

  const activeCount = sortedTasks.length;
  const completedCount = completedTasks.length;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-[--fg]">タスク</h2>
          {syncing && <span className="text-[10px] text-[#007AFF] animate-pulse">同期中...</span>}
          {!syncing && lastSync && <span className="text-[10px] text-[--fg3]">{lastSync}</span>}
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && <span className="text-[12px] text-[--fg2] tabular-nums">{activeCount}件</span>}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[12px] text-[#007AFF] font-medium hover:text-[#0056b3] transition-colors"
          >
            {showAddForm ? 'キャンセル' : '追加'}
          </button>
        </div>
      </div>

      {/* Due date banner */}
      {(dueDateStats.today > 0 || dueDateStats.overdue > 0) && (
        <div className="mb-3 px-3 py-2 bg-[--bg2] rounded-xl text-[12px] text-[--fg2]">
          {dueDateStats.overdue > 0 && (
            <span className="text-[#FF3B30] font-medium">期限切れ {dueDateStats.overdue}件</span>
          )}
          {dueDateStats.overdue > 0 && dueDateStats.today > 0 && <span className="mx-2">/</span>}
          {dueDateStats.today > 0 && (
            <span className="text-[#007AFF] font-medium">期限: 今日 {dueDateStats.today}件</span>
          )}
        </div>
      )}

      {/* Category tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {['すべて', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-full whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-[#007AFF] text-white'
                : 'bg-[--bg2] text-[--fg] hover:bg-[--border]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-4 p-3 bg-[--bg2] rounded-xl space-y-3">
          <input
            type="text"
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
            placeholder="タスク名"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAddTask()}
            className="w-full px-3 py-2 text-[14px] bg-[--bg] rounded-lg border border-[--border] outline-none focus:ring-2 focus:ring-[#007AFF]/20 text-[--fg] placeholder:text-[--fg3] transition-all"
          />
          <div className="flex gap-2">
            <select
              value={newTaskCategory}
              onChange={e => setNewTaskCategory(e.target.value)}
              className="flex-1 px-3 py-2 text-[14px] bg-[--bg] rounded-lg border border-[--border] outline-none focus:ring-2 focus:ring-[#007AFF]/20 text-[--fg] transition-all"
            >
              <option value="">{categories[0] ? 'カテゴリ選択' : 'カテゴリ作成中...'}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newTaskDueDate}
              onChange={e => setNewTaskDueDate(e.target.value)}
              className="px-3 py-2 text-[14px] bg-[--bg] rounded-lg border border-[--border] outline-none focus:ring-2 focus:ring-[#007AFF]/20 text-[--fg] transition-all"
            />
          </div>
          <button
            onClick={handleAddTask}
            disabled={!newTaskText.trim() || !newTaskCategory.trim()}
            className="w-full px-3 py-2 text-[14px] font-medium bg-[#007AFF] text-white rounded-lg hover:bg-[#0056b3] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            追加
          </button>
        </div>
      )}

      {/* Task list */}
      <div className="max-h-[400px] overflow-y-auto mb-3">
        {sortedTasks.length === 0 && !showAddForm && completedCount === 0 && (
          <div className="text-[13px] text-[--fg3] text-center py-8">タスクなし</div>
        )}

        {sortedTasks.length === 0 && completedCount > 0 && (
          <div className="text-[13px] text-[#34C759] text-center py-6 font-medium">全タスク完了</div>
        )}

        <div className="space-y-0.5">
          {sortedTasks.map(task => {
            const taskIsToday = isToday(task.dueDate);
            const taskIsOverdue = isOverdue(task.dueDate);
            let dueBadgeColor = 'text-[--fg3]';
            if (taskIsOverdue) dueBadgeColor = 'text-[#FF3B30] font-medium';
            else if (taskIsToday) dueBadgeColor = 'text-[#007AFF] font-medium';

            return (
              <div
                key={task.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl group hover:bg-[--bg2] transition-all"
              >
                <button
                  onClick={() => updateTask(task.id, 'toggle')}
                  className="w-5 h-5 rounded-full border-2 border-[--fg3] flex-shrink-0 flex items-center justify-center transition-all hover:border-[#34C759] group-hover:border-[#34C759]"
                  title="Toggle task"
                >
                  <div className="w-2.5 h-2.5 rounded-full" />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-[14px] leading-snug text-[--fg] break-words">{task.text}</p>
                  <div className="text-[11px] text-[--fg3] mt-0.5">
                    <span className="bg-[--bg2] px-2 py-0.5 rounded inline-block">{task.category}</span>
                  </div>
                </div>

                {task.dueDate && (
                  <span className={`text-[12px] whitespace-nowrap flex-shrink-0 ${dueBadgeColor}`}>
                    {formatDate(task.dueDate)}
                  </span>
                )}

                <button
                  onClick={() => setDeleteConfirm(task.id)}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-[--fg3] hover:text-[#FF3B30] transition-all flex-shrink-0"
                  title="Delete task"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed section */}
      {completedCount > 0 && (
        <div className="pt-3 border-t border-[--border]">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-[12px] font-medium text-[--fg2] hover:text-[--fg] transition-colors w-full"
          >
            <svg
              width="10" height="10" viewBox="0 0 16 16" fill="none"
              className={`transition-transform ${showCompleted ? 'rotate-90' : ''}`}
            >
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>完了 ({completedCount})</span>
          </button>

          {showCompleted && (
            <div className="mt-2 space-y-0.5">
              {completedTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl group hover:bg-[--bg2] transition-all"
                >
                  <button
                    onClick={() => updateTask(task.id, 'toggle')}
                    className="w-5 h-5 rounded-full border-2 border-[#34C759] bg-[#34C759] flex-shrink-0 flex items-center justify-center transition-all"
                    title="Toggle task"
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                      <path d="M3.5 8.5L6.5 11.5L12.5 5.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-snug text-[--fg2] line-through break-words">{task.text}</p>
                  </div>

                  <button
                    onClick={() => setDeleteConfirm(task.id)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-[--fg3] hover:text-[#FF3B30] transition-all flex-shrink-0"
                    title="Delete task"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50 backdrop-blur-sm">
          <div className="bg-[--card] rounded-2xl shadow-xl p-6 max-w-sm mx-4 border border-[--border]">
            <h3 className="text-[16px] font-semibold text-[--fg] mb-2">タスクを削除</h3>
            <p className="text-[14px] text-[--fg2] mb-6">このタスクを削除してもよろしいですか？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 text-[14px] font-medium text-[--fg] bg-[--bg2] rounded-lg hover:bg-[--border] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  updateTask(deleteConfirm, 'delete');
                  setDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2.5 text-[14px] font-medium text-white bg-[#FF3B30] rounded-lg hover:bg-[#cc2f24] transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}