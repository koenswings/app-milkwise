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
  const full = Math.floor(bottles);
  const partial = bottles - full;
  const totalSlots = Math.min(Math.ceil(targetBottles), 10);
  const emptySlots = Math.max(0, totalSlots - Math.ceil(bottles));

  return (
    <div className={`rounded-xl border p-3 ${bgBorder(pct, y, r)}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
        <button
          onClick={onExplain}
          className="w-4 h-4 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs font-bold flex items-center justify-center leading-none"
        >?</button>
      </div>

      {/* Main value */}
      <div className={`text-3xl font-bold leading-none ${colorClass(pct, y, r)}`}>
        {Math.round(ml)} ml
      </div>
      <div className={`text-sm mt-0.5 ${colorClass(pct, y, r)}`}>
        {Math.round(pct)}% &middot; {statusText(pct, y, r)}
      </div>

      {/* Bottle pictograms */}
      <div className="flex flex-wrap gap-0.5 mt-2">
        {Array.from({ length: Math.min(full, totalSlots) }).map((_, i) => (
          <span key={i} className="text-xl leading-none">🍼</span>
        ))}
        {partial > 0.1 && full < totalSlots && (
          <span className="text-xl leading-none" style={{ opacity: 0.2 + partial * 0.8 }}>🍼</span>
        )}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <span key={i} className="text-xl leading-none opacity-15">🍼</span>
        ))}
      </div>

      {/* Bottle count */}
      <div className={`text-xs mt-1 font-medium ${colorClass(pct, y, r)}`}>
        {bottles.toFixed(1)}
        <span className="text-slate-500 font-normal"> / {targetBottles.toFixed(1)} bottles</span>
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
      ]}
    />
  );
}
