import { useState, useEffect } from 'react';

interface TaskItem {
  id: string;
  text: string;
  done: boolean;
}

interface GoalItem {
  text: string;
  done: boolean;
}

interface BriefingData {
  date: string;
  tasks: TaskItem[];
  goals: GoalItem[];
  later: string[];
}

export default function TaskPanel() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [later, setLater] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLater, setShowLater] = useState(false);

  useEffect(() => {
    fetch('/data/briefing.json')
      .then(r => r.json())
      .then((data: BriefingData) => {
        setTasks(data.tasks || []);
        setGoals(data.goals || []);
        setLater(data.later || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">今日やること</h2>
        {tasks.length > 0 && (
          <span className="text-[12px] text-[#86868b] tabular-nums">
            {doneCount}/{tasks.length}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-[13px] text-[#86868b] text-center py-8">読み込み中...</p>
      ) : (
        <>
          {/* Progress bar */}
          {tasks.length > 0 && (
            <div className="h-1 bg-[#e5e5ea] rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-[#34C759] rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / tasks.length) * 100}%` }}
              />
            </div>
          )}

          {/* Tasks */}
          <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`flex items-start gap-3 py-2 px-2 rounded-xl cursor-pointer transition-all ${
                  task.done ? 'opacity-40' : 'hover:bg-[#f5f5f7]'
                }`}
                onClick={() => toggleTask(task.id)}
              >
                <div className={`mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  task.done ? 'border-[#34C759] bg-[#34C759]' : 'border-[#c7c7cc]'
                }`}>
                  {task.done && (
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                      <path d="M3.5 8.5L6.5 11.5L12.5 5.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className={`text-[14px] leading-snug ${
                  task.done ? 'text-[#86868b] line-through' : 'text-[#1d1d1f]'
                }`}>
                  {task.text}
                </span>
              </div>
            ))}
          </div>

          {/* Goals */}
          {goals.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#e5e5ea]">
              <p className="text-[11px] text-[#86868b] mb-2 uppercase tracking-wider">Today's Goal</p>
              <div className="space-y-1">
                {goals.map((g, i) => (
                  <div key={i} className={`flex items-start gap-2 text-[13px] ${g.done ? 'text-[#86868b] line-through' : 'text-[#1d1d1f]'}`}>
                    <span className="shrink-0">{g.done ? '—' : '·'}</span>
                    <span>{g.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Later items */}
          {later.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowLater(!showLater)}
                className="flex items-center gap-1 text-[12px] text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                <svg
                  width="10" height="10" viewBox="0 0 16 16" fill="none"
                  className={`transition-transform ${showLater ? 'rotate-90' : ''}`}
                >
                  <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                今日じゃなくていいもの ({later.length})
              </button>
              {showLater && (
                <div className="mt-2 space-y-1 pl-3">
                  {later.map((item, i) => (
                    <p key={i} className="text-[12px] text-[#86868b] leading-snug">
                      · {item}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
