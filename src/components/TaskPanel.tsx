import { useState, useEffect, useCallback } from 'react';

interface ChatworkTask {
  task_id: number;
  room: { room_id: number; name: string };
  body: string;
  limit_time: number;
  status: string;
}

export default function TaskPanel() {
  const [tasks, setTasks] = useState<ChatworkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<Set<number>>(new Set());

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/chatwork-tasks');
      if (!res.ok) throw new Error('Failed to fetch');
      const data: ChatworkTask[] = await res.json();
      // Filter: only show tasks due today or earlier (including no deadline)
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const endOfTodayTs = Math.floor(endOfToday.getTime() / 1000);
      const filtered = data.filter(t => !t.limit_time || t.limit_time <= endOfTodayTs);
      setTasks(filtered);
      setError(null);
    } catch {
      setError('タスクの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const completeTask = async (task: ChatworkTask) => {
    setCompleting(prev => new Set(prev).add(task.task_id));
    try {
      const res = await fetch('/api/chatwork-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: task.room.room_id, taskId: task.task_id }),
      });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.task_id !== task.task_id));
      }
    } catch {
      // silently fail
    } finally {
      setCompleting(prev => {
        const next = new Set(prev);
        next.delete(task.task_id);
        return next;
      });
    }
  };

  const formatDeadline = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return '期限切れ';
    if (diffDays === 0) return '今日まで';
    if (diffDays === 1) return '明日まで';
    return `${d.getMonth() + 1}/${d.getDate()}まで`;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">タスク</h2>
        <button
          onClick={fetchTasks}
          className="text-[13px] text-[#007AFF] hover:text-[#0056b3] transition-colors"
        >
          更新
        </button>
      </div>

      {loading && (
        <div className="py-8 text-center text-[13px] text-[#86868b]">読み込み中...</div>
      )}

      {error && (
        <div className="py-8 text-center text-[13px] text-[#86868b]">{error}</div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="py-8 text-center text-[13px] text-[#86868b]">タスクなし</div>
      )}

      <div className="space-y-1">
        {tasks.map(task => {
          const isCompleting = completing.has(task.task_id);
          const deadline = formatDeadline(task.limit_time);
          const isOverdue = task.limit_time && task.limit_time * 1000 < Date.now();

          return (
            <div
              key={task.task_id}
              className={`flex items-start gap-3 py-2.5 px-1 rounded-lg transition-all ${
                isCompleting ? 'opacity-40' : 'hover:bg-[#f5f5f7]'
              }`}
            >
              <button
                onClick={() => completeTask(task)}
                disabled={isCompleting}
                className="mt-0.5 w-[20px] h-[20px] rounded-full border-2 border-[#c7c7cc] hover:border-[#007AFF] transition-colors flex-shrink-0 flex items-center justify-center"
              >
                {isCompleting && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#007AFF]" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-[#1d1d1f] leading-snug break-words">
                  {task.body.length > 80 ? task.body.slice(0, 80) + '...' : task.body}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-[#86868b]">{task.room.name}</span>
                  {deadline && (
                    <span className={`text-[11px] ${isOverdue ? 'text-[#FF3B30]' : 'text-[#86868b]'}`}>
                      {deadline}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
