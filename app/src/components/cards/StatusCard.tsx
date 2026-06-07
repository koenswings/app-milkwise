"use client";

import SwipeableCard from "@/components/SwipeableCard";
import { waterToMilk } from "@/lib/calculations";
import { Feed } from "@/types";

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
  feeds: Feed[];
  now: number;
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

function Panel({ label, ml, pct, milkPerBottle, y, r, onExplain, feeds24h }:
  { label: string; ml: number; pct: number; milkPerBottle: number; y: number; r: number; onExplain: () => void; feeds24h: Feed[] }) {

  const bottles = ml / milkPerBottle;

  // Build actual feed pictograms from real 24h feeds
  // Each feed shown as an emoji sized relative to milkPerBottle
  const feedEmojis = feeds24h.map(f => ({
    vol: f.volume,
    size: waterToMilk(f.volume) / milkPerBottle, // fraction of a standard bottle
  }));

  return (
    <div className={`rounded-xl border p-3 ${bgBorder(pct, y, r)}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
        <button onClick={onExplain} className="w-4 h-4 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs font-bold flex items-center justify-center leading-none">?</button>
      </div>

      {/* Numbers: ml left, bottles right, same font */}
      <div className="flex items-baseline justify-between mb-1">
        <span className={`text-3xl font-bold leading-none tabular-nums ${colorClass(pct, y, r)}`}>{Math.round(ml)}<span className="text-base font-normal ml-0.5">ml</span></span>
        <span className={`text-3xl font-bold leading-none tabular-nums ${colorClass(pct, y, r)}`}>{bottles.toFixed(1)}<span className="text-base font-normal ml-0.5">bottles</span></span>
      </div>
      <div className={`text-sm mb-2 ${colorClass(pct, y, r)}`}>{Math.round(pct)}% · {statusText(pct, y, r)}</div>

      {/* Actual feed pictograms: real bottles from last 24h */}
      <div className="flex flex-wrap gap-1 mt-1">
        {feedEmojis.map((f, i) => (
          <div key={i} className="flex flex-col items-center">
            <span
              className="leading-none"
              style={{ fontSize: `${Math.max(0.8, Math.min(1.5, f.size + 0.3))}rem`, opacity: 0.7 + f.size * 0.3 }}
            >🍼</span>
            <span className="text-xs text-slate-500 tabular-nums">{f.vol}</span>
          </div>
        ))}
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
  const { strict24h, strictPct, smoothedMl, smoothedPct, standardBottleVolume, yellowThresholdPct: y, redThresholdPct: r } = props;
  const milkPerBottle = waterToMilk(standardBottleVolume);
  const cutoff24h = props.now - 24 * 3_600_000;
  const feeds24h = props.feeds.filter(f => f.timestamp >= cutoff24h)
    .sort((a, b) => a.timestamp - b.timestamp);

  return (
    <SwipeableCard
      className="mb-2"
      views={[
        <Panel key="smoothed" label="STATUS LAST 24H" ml={smoothedMl} pct={smoothedPct}
          milkPerBottle={milkPerBottle} y={y} r={r}
          onExplain={props.onSmoothedExplain} feeds24h={feeds24h} />,
        <Panel key="strict" label="Strict 24h" ml={strict24h} pct={strictPct}
          milkPerBottle={milkPerBottle} y={y} r={r}
          onExplain={props.onStrictExplain} feeds24h={feeds24h} />,
        <ProgressView key="progress" {...props} />,
        <SpotlightView key="spotlight" {...props} />,
      ]}
    />
  );
}
