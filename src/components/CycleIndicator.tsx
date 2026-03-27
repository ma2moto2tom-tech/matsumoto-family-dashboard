import { useState } from 'react';

const LAST_PERIOD = new Date('2026-03-21T00:00:00');
const CYCLE_LENGTH = 28;

interface PhaseInfo {
  label: string;
  color: string;
  advice: string;
}

function getPhaseInfo(cycleDay: number): PhaseInfo {
  if (cycleDay >= 1 && cycleDay <= 6) {
    return {
      label: '生理中',
      color: '#FF3B30',
      advice:
        '遥菜さんは体調が優れない時期。家事を積極的に引き受けて、「大丈夫？」の一言だけでいい。求めない、ただ寄り添う',
    };
  }
  if (cycleDay >= 7 && cycleDay <= 14) {
    return {
      label: 'ゴールデンタイム',
      color: '#34C759',
      advice:
        '関係が良い時期。デートの提案や感謝の言葉が最も響く。この時期の積み重ねが次のPMS期の緩衝材になる',
    };
  }
  if (cycleDay >= 15 && cycleDay <= 21) {
    return {
      label: '通常期',
      color: '#FFCC00',
      advice:
        '安定期。日常の中で小さな感謝を伝え続ける。「ありがとう」は何回言っても多すぎない',
    };
  }
  return {
    label: 'PMS期',
    color: '#FF9500',
    advice:
      '遥菜さんの気が立ちやすい時期。言葉尻を捉えない（カバくん）。反応しない。距離を取るのではなく、静かにそばにいる',
  };
}

function getCycleDay(): number {
  const now = new Date();
  const diffMs = now.getTime() - LAST_PERIOD.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const cycleDay = (diffDays % CYCLE_LENGTH) + 1;
  return cycleDay;
}

export default function CycleIndicator() {
  const [expanded, setExpanded] = useState(false);

  const cycleDay = getCycleDay();
  const phase = getPhaseInfo(cycleDay);

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[--bg2] transition-colors"
        title={`${phase.label} (Day ${cycleDay})`}
      >
        <span
          className="block w-2 h-2 rounded-full"
          style={{ backgroundColor: phase.color }}
        />
        <span className="text-[11px] text-[--fg2]">{phase.label}</span>
      </button>

      {expanded && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setExpanded(false)} />
          <div className="absolute top-full right-0 mt-2 z-[100] w-[280px] bg-[--card] rounded-xl border border-[--border] shadow-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: phase.color }}
              />
              <span className="text-[14px] font-medium text-[--fg]">
                {phase.label}
              </span>
              <span className="text-[12px] text-[--fg3] ml-auto">
                Day {cycleDay}/{CYCLE_LENGTH}
              </span>
            </div>
            <p className="text-[12px] leading-[1.6] text-[--fg2]">
              {phase.advice}
            </p>
            {/* Cycle progress bar */}
            <div className="mt-3 h-1.5 bg-[--bg2] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(cycleDay / CYCLE_LENGTH) * 100}%`,
                  backgroundColor: phase.color,
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
