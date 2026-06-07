"use client";

import SwipeableCard from "@/components/SwipeableCard";
import { waterToMilk } from "@/lib/calculations";

interface Props {
  strict24h: number;
  strictPct: number;
  smoothedMl: number;
  smoothedPct: number;
  dailyTargetMl: number;
  standardBottleVolume: number;
  yellowThresholdPct: number;
  redThresholdPct: number;
  onStrictExplain: () => void;
  onSmoothedExplain: () => void;
}

function colorClass(pct: number, y: number, r: number) {
  const d = Math.abs(pct - 100);
  if (d <= y) return "text-green-400";
  if (d <= r) return "text-yellow-400";
  return "text-red-400";
}
function bgBorder(pct: number, y: number, r: number) {
  const d = Math.abs(pct - 100);
  if (d <= y) return "bg-green-900/20 border-green-700/40";
  if (d <= r) return "bg-yellow-900/20 border-yellow-700/40";
  return "bg-red-900/20 border-red-700/40";
}
function statusText(pct: number, y: number, r: number) {
  const d = Math.abs(pct - 100);
  if (d <= y) return "on track";
  if (pct > 100) return d <= r ? "slightly over" : "overfed ⚠️";
  return d <= r ? "slightly behind" : "behind ⚠️";
}

function Panel({ label, ml, pct, dailyTargetMl, milkPerBottle, y, r, onExplain }:
  { label: string; ml: number; pct: number; dailyTargetMl: number; milkPerBottle: number; y: number; r: number; onExplain: () => void }) {

  const bottles = ml / milkPerBottle;
  const targetBottles = dailyTargetMl / milkPerBottle;
  const cols = 4;
  const totalSlots = Math.min(Math.ceil(targetBottles), 12);
  const fullSlots = Math.min(Math.floor(bottles), totalSlots);
  const partial = bottles - Math.floor(bottles);
  const hasPartial = partial > 0.1 && fullSlots < totalSlots;

  return (
    <div className={`rounded-xl border p-3 ${bgBorder(pct, y, r)}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
        <button onClick={onExplain} className="w-4 h-4 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs font-bold flex items-center justify-center leading-none">?</button>
      </div>

      {/* Two-column layout: numbers left, bottle matrix + count right */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: ml and status */}
        <div className="flex-1">
          <div className={`text-3xl font-bold leading-none tabular-nums ${colorClass(pct, y, r)}`}>{Math.round(ml)}<span className="text-base font-normal ml-0.5">ml</span></div>
          <div className={`text-sm mt-1 ${colorClass(pct, y, r)}`}>{Math.round(pct)}% · {statusText(pct, y, r)}</div>
        </div>
        {/* Right: bottle matrix + count below */}
        <div className="flex-shrink-0">
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${cols}, 1.5rem)` }}
          >
            {Array.from({ length: totalSlots }).map((_, i) => {
              const isFull = i < fullSlots;
              const isPartial = hasPartial && i === fullSlots;
              return (
                <span
                  key={i}
                  className="text-xl leading-none text-center"
                  style={{ opacity: isFull ? 1 : isPartial ? 0.2 + partial * 0.8 : 0.12 }}
                >🍼</span>
              );
            })}
          </div>
          {/* Count right-aligned under matrix, aligned with ml on left */}
          <div className={`text-xl font-bold tabular-nums text-right mt-0.5 ${colorClass(pct, y, r)}`}>
            {bottles.toFixed(1)}<span className="text-xs font-normal text-slate-500 ml-0.5">🍼</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Extra view A: Progress bar (“what’s been consumed”) ──────────────────────────
function ProgressView(props: Props) {
  const { strict24h, strictPct, smoothedMl, smoothedPct, dailyTargetMl, yellowThresholdPct: y, redThresholdPct: r } = props;
  function Bar({ label, ml, pct, onExplain }: { label: string; ml: number; pct: number; onExplain: () => void }) {
    const fill = Math.min(pct, 150);
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">{label}</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-bold ${colorClass(pct, y, r)}`}>{Math.round(ml)} ml</span>
            <button onClick={onExplain} className="w-4 h-4 rounded-full bg-slate-600 text-slate-300 text-xs font-bold flex items-center justify-center leading-none">?</button>
          </div>
        </div>
        <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${(fill / 150) * 100}%`, backgroundColor: fill <= 100 + y ? '#4ade80' : fill <= 100 + r ? '#facc15' : '#f87171' }} />
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">{Math.round(pct)}%</div>
          {/* Target line */}
          <div className="absolute inset-y-0 w-0.5 bg-white/40" style={{ left: `${(100 / 150) * 100}%` }} />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-700 p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Today’s intake</div>
      <Bar label="Smoothed 24h" ml={smoothedMl} pct={smoothedPct} onExplain={props.onSmoothedExplain} />
      <Bar label="Strict 24h" ml={strict24h} pct={strictPct} onExplain={props.onStrictExplain} />
      <div className="text-xs text-slate-600 mt-0.5">Target: {Math.round(dailyTargetMl)} ml · white line = 100%</div>
    </div>
  );
}

// ── Extra view B: Number spotlight ──────────────────────────────────────────
function SpotlightView({ smoothedMl, smoothedPct, strict24h, strictPct, yellowThresholdPct: y, redThresholdPct: r, onSmoothedExplain, onStrictExplain }: Props) {
  return (
    <div className="rounded-xl border border-slate-700 p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">At a glance</div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className={`text-4xl font-black tabular-nums ${colorClass(smoothedPct, y, r)}`}>{Math.round(smoothedPct)}%</div>
          <div className="text-xs text-slate-400 mt-0.5">Smoothed</div>
          <div className="text-xs text-slate-500">{Math.round(smoothedMl)} ml</div>
          <button onClick={onSmoothedExplain} className="mt-1 w-4 h-4 rounded-full bg-slate-600 text-slate-300 text-xs font-bold mx-auto flex items-center justify-center leading-none">?</button>
        </div>
        <div>
          <div className={`text-4xl font-black tabular-nums ${colorClass(strictPct, y, r)}`}>{Math.round(strictPct)}%</div>
          <div className="text-xs text-slate-400 mt-0.5">Strict</div>
          <div className="text-xs text-slate-500">{Math.round(strict24h)} ml</div>
          <button onClick={onStrictExplain} className="mt-1 w-4 h-4 rounded-full bg-slate-600 text-slate-300 text-xs font-bold mx-auto flex items-center justify-center leading-none">?</button>
        </div>
      </div>
    </div>
  );
}

export default function StatusCard(props: Props) {
  const { strict24h, strictPct, smoothedMl, smoothedPct, dailyTargetMl, standardBottleVolume, yellowThresholdPct: y, redThresholdPct: r } = props;
  const milkPerBottle = waterToMilk(standardBottleVolume);

  return (
    <SwipeableCard
      className="mb-3"
      views={[
        <Panel key="smoothed" label="Smoothed 24h" ml={smoothedMl} pct={smoothedPct}
          dailyTargetMl={dailyTargetMl} milkPerBottle={milkPerBottle} y={y} r={r}
          onExplain={props.onSmoothedExplain} />,
        <Panel key="strict" label="Strict 24h" ml={strict24h} pct={strictPct}
          dailyTargetMl={dailyTargetMl} milkPerBottle={milkPerBottle} y={y} r={r}
          onExplain={props.onStrictExplain} />,
        <ProgressView key="progress" {...props} />,
        <SpotlightView key="spotlight" {...props} />,
      ]}
    />
  );
}
