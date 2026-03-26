import { useState, useEffect, useCallback } from 'react';

interface ChatworkTask {
  task_id: number;
  room: { room_id: number; name: string };
  assigned_by_account: { name: string };
  body: string;
  limit_time: number;
  status: string;
  limit_type: string;
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<ChatworkTask[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks?status=open');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to load tasks');
      }
    } catch {
      setError('Could not connect to task service');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 60000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const completeTask = async (task: ChatworkTask) => {
    setCompletedIds(prev => new Set(prev).add(task.task_id));
    try {
      await fetch('/api/tasks-complete', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: task.room.room_id, taskId: task.task_id }),
      });
    } catch {
      setCompletedIds(prev => {
        const next = new Set(prev);
        next.delete(task.task_id);
        return next;
      });
    }
  };

  const formatDeadline = (limitTime: number, limitType: string) => {
    if (limitType === 'none' || limitTime === 0) return null;
    const d = new Date(limitTime * 1000);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    if (diffDays < 0) return { text: `${dateStr} (期限切れ)`, urgent: true };
    if (diffDays === 0) return { text: `${dateStr} (今日)`, urgent: true };
    if (diffDays <= 3) return { text: `${dateStr} (あと${diffDays}日)`, urgent: true };
    return { text: dateStr, urgent: false };
  };

  const activeTasks = tasks.filter(t => !completedIds.has(t.task_id));
  const justCompleted = tasks.filter(t => completedIds.has(t.task_id));

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L6.5 11.5L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L6.5 11.5L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
        </div>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L6.5 11.5L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {activeTasks.length}
          </span>
        </div>
        <button
          onClick={() => { setLoading(true); fetchTasks(); }}
          className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-1">
        {activeTasks.length === 0 && justCompleted.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">No open tasks</p>
        )}

        {activeTasks.map(task => {
          const deadline = formatDeadline(task.limit_time, task.limit_type);
          return (
            <button
              key={task.task_id}
              onClick={() => completeTask(task)}
              className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left group"
            >
              <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-blue-400 flex-shrink-0 transition-colors" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 leading-snug">{task.body}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-gray-400">{task.room.name}</span>
                  {deadline && (
                    <span className={`text-[11px] ${deadline.urgent ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      {deadline.text}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {justCompleted.length > 0 && (
          <>
            <div className="border-t border-gray-100 my-2" />
            <p className="text-[11px] text-gray-400 uppercase tracking-wider px-3 pt-1">Done</p>
            {justCompleted.map(task => (
              <div
                key={task.task_id}
                className="flex items-start gap-3 px-3 py-2 rounded-xl opacity-50"
              >
                <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6.5 11.5L13 4.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-500 line-through leading-snug">{task.body}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
