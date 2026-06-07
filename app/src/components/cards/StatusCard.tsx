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
function statusText(pct: number, y: number, r: number) {
  const d = Math.abs(pct - 100);
  if (d <= y) return "on track";
  if (pct > 100) return d <= r ? "slightly over" : "overfed ⚠️";
  return d <= r ? "slightly behind" : "behind ⚠️";
}
function bgClass(pct: number, y: number, r: number) {
  const d = Math.abs(pct - 100);
  if (d <= y) return "bg-green-900/20 border-green-700/40";
  if (d <= r) return "bg-yellow-900/20 border-yellow-700/40";
  return "bg-red-900/20 border-red-700/40";
}

// ── View 0: Both numeric ─────────────────────────────────────────────────────
function NumericView(props: Props) {
  const { strict24h, strictPct, smoothedMl, smoothedPct, yellowThresholdPct: y, redThresholdPct: r } = props;
  return (
    <div className="p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">24h intake</div>
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-lg border p-2.5 ${bgClass(strictPct, y, r)}`}>
          <div className="text-xs text-slate-400 mb-0.5 flex items-center justify-between">
            <span>Strict</span>
            <button onClick={props.onStrictExplain} className="w-4 h-4 rounded-full bg-slate-600 text-slate-300 text-xs font-bold flex items-center justify-center leading-none">?</button>
          </div>
          <div className={`text-xl font-bold ${colorClass(strictPct, y, r)}`}>{Math.round(strict24h)} ml</div>
          <div className={`text-xs ${colorClass(strictPct, y, r)}`}>{Math.round(strictPct)}% · {statusText(strictPct, y, r)}</div>
        </div>
        <div className={`rounded-lg border p-2.5 ${bgClass(smoothedPct, y, r)}`}>
          <div className="text-xs text-slate-400 mb-0.5 flex items-center justify-between">
            <span>Smoothed</span>
            <button onClick={props.onSmoothedExplain} className="w-4 h-4 rounded-full bg-slate-600 text-slate-300 text-xs font-bold flex items-center justify-center leading-none">?</button>
          </div>
          <div className={`text-xl font-bold ${colorClass(smoothedPct, y, r)}`}>{Math.round(smoothedMl)} ml</div>
          <div className={`text-xs ${colorClass(smoothedPct, y, r)}`}>{Math.round(smoothedPct)}% · {statusText(smoothedPct, y, r)}</div>
        </div>
      </div>
    </div>
  );
}

// ── View 1: Bottles ──────────────────────────────────────────────────────────
function BottlesView(props: Props) {
  const { strict24h, smoothedMl, dailyTargetMl, standardBottleVolume, yellowThresholdPct: y, redThresholdPct: r } = props;
  const milkPerBottle = waterToMilk(standardBottleVolume);
  const targetBottles = dailyTargetMl / milkPerBottle;

  function BottleRow({ label, ml, pct }: { label: string; ml: number; pct: number }) {
    const bottles = ml / milkPerBottle;
    const full = Math.floor(bottles);
    const partial = bottles - full;
    const empty = Math.max(0, Math.ceil(targetBottles) - Math.ceil(bottles));
    return (
      <div className="mb-2">
        <div className={`text-xs font-medium mb-0.5 ${colorClass(pct, y, r)}`}>{label} · {Math.round(pct)}%</div>
        <div className="flex flex-wrap gap-0.5">
          {Array.from({ length: Math.min(full, 10) }).map((_, i) => <span key={i} className="text-xl leading-none">🍼</span>)}
          {partial > 0.1 && full < 10 && <span className="text-xl leading-none" style={{ opacity: 0.2 + partial * 0.8 }}>🍼</span>}
          {Array.from({ length: Math.min(empty, 10 - full - 1) }).map((_, i) => <span key={i} className="text-xl leading-none opacity-15">🍼</span>)}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{bottles.toFixed(1)} / {targetBottles.toFixed(1)} bottles</div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Bottles today 🍼</div>
      <BottleRow label="Strict 24h" ml={strict24h} pct={props.strictPct} />
      <BottleRow label="Smoothed" ml={smoothedMl} pct={props.smoothedPct} />
    </div>
  );
}

// ── View 2: Baby mood (smoothed) ─────────────────────────────────────────────
function MoodView({ smoothedPct, smoothedMl, yellowThresholdPct: y, redThresholdPct: r }: Props) {
  const diff = smoothedPct - 100;
  let emoji = "😄", mood = "", detail = "";
  if (Math.abs(diff) <= y) { emoji = "😄"; mood = "Happy & content"; detail = "Perfect rhythm. Baby is thriving!"; }
  else if (diff > r) { emoji = "🤢"; mood = "A bit stuffed"; detail = "Overfed — let the tummy rest before next feed."; }
  else if (diff > y) { emoji = "😌"; mood = "Comfortably full"; detail = "Slightly over. Just watch."; }
  else if (diff < -r) { emoji = "😢"; mood = "Hungry!"; detail = "Behind — offer a feed soon!"; }
  else { emoji = "😕"; mood = "A little peckish"; detail = "Slightly behind — feed a bit earlier."; }

  return (
    <div className="p-3 text-center">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Baby mood</div>
      <div className="text-5xl mb-1">{emoji}</div>
      <div className="text-slate-100 font-semibold">{mood}</div>
      <div className="text-slate-400 text-xs mt-0.5">{detail}</div>
      <div className="text-slate-500 text-xs mt-1">{Math.round(smoothedMl)} ml · {Math.round(smoothedPct)}%</div>
    </div>
  );
}

export default function StatusCard(props: Props) {
  return (
    <SwipeableCard
      className="mb-4"
      views={[
        <NumericView key="num" {...props} />,
        <BottlesView key="bottles" {...props} />,
        <MoodView key="mood" {...props} />,
      ]}
    />
  );
}
