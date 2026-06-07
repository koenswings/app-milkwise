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

// ── View 0: Strict and Smoothed as separate panels side by side ──────────────
function TwoColumnView(props: Props) {
  const { strict24h, strictPct, smoothedMl, smoothedPct, yellowThresholdPct: y, redThresholdPct: r } = props;
  return (
    <div className="p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">24h intake</div>
      <div className="grid grid-cols-2 gap-2">
        {/* Strict */}
        <div className={`rounded-lg border p-2.5 ${bgBorder(strictPct, y, r)}`}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs text-slate-400">Strict 24h</span>
            <button onClick={props.onStrictExplain} className="w-4 h-4 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs font-bold flex items-center justify-center leading-none">?</button>
          </div>
          <div className={`text-2xl font-bold ${colorClass(strictPct, y, r)}`}>{Math.round(strict24h)} ml</div>
          <div className={`text-xs mt-0.5 ${colorClass(strictPct, y, r)}`}>{Math.round(strictPct)}%</div>
          <div className="text-xs text-slate-500">{statusText(strictPct, y, r)}</div>
        </div>
        {/* Smoothed */}
        <div className={`rounded-lg border p-2.5 ${bgBorder(smoothedPct, y, r)}`}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs text-slate-400">Smoothed 24h</span>
            <button onClick={props.onSmoothedExplain} className="w-4 h-4 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs font-bold flex items-center justify-center leading-none">?</button>
          </div>
          <div className={`text-2xl font-bold ${colorClass(smoothedPct, y, r)}`}>{Math.round(smoothedMl)} ml</div>
          <div className={`text-xs mt-0.5 ${colorClass(smoothedPct, y, r)}`}>{Math.round(smoothedPct)}%</div>
          <div className="text-xs text-slate-500">{statusText(smoothedPct, y, r)}</div>
        </div>
      </div>
    </div>
  );
}

// ── View 1: Bottles + ml count (combined) ────────────────────────────────────
function BottlesView(props: Props) {
  const { strict24h, strictPct, smoothedMl, smoothedPct, dailyTargetMl, standardBottleVolume, yellowThresholdPct: y, redThresholdPct: r } = props;
  const milkPerBottle = waterToMilk(standardBottleVolume);
  const targetBottles = dailyTargetMl / milkPerBottle;

  function Row({ label, ml, pct, onExplain }: { label: string; ml: number; pct: number; onExplain: () => void }) {
    const bottles = ml / milkPerBottle;
    const full = Math.floor(bottles);
    const partial = bottles - full;
    const total = Math.ceil(targetBottles);
    return (
      <div className="mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-xs font-medium ${colorClass(pct, y, r)}`}>{label}</span>
          <button onClick={onExplain} className="w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-xs font-bold flex items-center justify-center leading-none">?</button>
        </div>
        <div className="flex flex-wrap gap-0.5 mb-0.5">
          {Array.from({ length: Math.min(full, total) }).map((_, i) => (
            <span key={i} className="text-lg leading-none">🍼</span>
          ))}
          {partial > 0.1 && full < total && (
            <span className="text-lg leading-none" style={{ opacity: 0.2 + partial * 0.8 }}>🍼</span>
          )}
          {Array.from({ length: Math.max(0, total - full - (partial > 0.1 ? 1 : 0)) }).map((_, i) => (
            <span key={i} className="text-lg leading-none opacity-15">🍼</span>
          ))}
        </div>
        <div className={`text-xs font-semibold ${colorClass(pct, y, r)}`}>
          {bottles.toFixed(1)} bottles · {Math.round(ml)} ml
          <span className="text-slate-500 font-normal"> / {targetBottles.toFixed(1)} · {Math.round(dailyTargetMl)} ml</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Bottles today 🍼</div>
      <Row label="Strict 24h" ml={strict24h} pct={strictPct} onExplain={props.onStrictExplain} />
      <Row label="Smoothed 24h" ml={smoothedMl} pct={smoothedPct} onExplain={props.onSmoothedExplain} />
    </div>
  );
}

// ── View 2: Baby mood ────────────────────────────────────────────────────────
function MoodView({ smoothedPct, smoothedMl, yellowThresholdPct: y, redThresholdPct: r }: Props) {
  const diff = smoothedPct - 100;
  let emoji = "😄", mood = "", detail = "";
  if (Math.abs(diff) <= y)  { emoji = "😄"; mood = "Happy & content";   detail = "Perfect rhythm — baby is thriving!"; }
  else if (diff > r)         { emoji = "🤢"; mood = "A bit stuffed";     detail = "Overfed — let tummy rest before next feed."; }
  else if (diff > y)         { emoji = "😌"; mood = "Comfortably full";  detail = "Slightly over. Just watch."; }
  else if (diff < -r)        { emoji = "😢"; mood = "Hungry!";           detail = "Behind — offer a feed soon!"; }
  else                       { emoji = "😕"; mood = "A little peckish";  detail = "Slightly behind — feed a bit earlier."; }

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
      className="mb-3"
      views={[
        <TwoColumnView key="two" {...props} />,
        <BottlesView key="bottles" {...props} />,
        <MoodView key="mood" {...props} />,
      ]}
    />
  );
}
