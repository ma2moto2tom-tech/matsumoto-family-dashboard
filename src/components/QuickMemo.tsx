import { useState, useEffect } from 'react';

interface Memo {
  id: string;
  text: string;
  time: string;
}

export default function QuickMemo() {
  const [memos, setMemos] = useState<Memo[]>(() => {
    try {
      const saved = localStorage.getItem('quick-memos');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');

  useEffect(() => {
    localStorage.setItem('quick-memos', JSON.stringify(memos));
  }, [memos]);

  const addMemo = () => {
    if (!input.trim()) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    setMemos(prev => [{ id: crypto.randomUUID(), text: input.trim(), time }, ...prev]);
    setInput('');
  };

  const deleteMemo = (id: string) => {
    setMemos(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3H10L13 6V13H3V3Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M5 8H11M5 10.5H9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Memo</h2>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addMemo()}
          placeholder="Write something..."
          className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all placeholder:text-gray-300"
        />
        <button
          onClick={addMemo}
          disabled={!input.trim()}
          className="px-3 py-2 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 disabled:opacity-30 disabled:hover:bg-yellow-500 transition-all"
        >
          +
        </button>
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {memos.length === 0 && (
          <p className="text-sm text-gray-300 py-3 text-center">No memos yet</p>
        )}
        {memos.map(memo => (
          <div
            key={memo.id}
            className="flex items-start gap-2 px-2 py-1.5 rounded-lg group hover:bg-gray-50 transition-colors"
          >
            <span className="text-[11px] text-gray-300 mt-0.5 flex-shrink-0 tabular-nums">
              {memo.time}
            </span>
            <p className="text-sm text-gray-700 flex-1 leading-snug">{memo.text}</p>
            <button
              onClick={() => deleteMemo(memo.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
