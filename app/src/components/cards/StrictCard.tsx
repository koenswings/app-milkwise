"use client";

import SwipeableCard from "@/components/SwipeableCard";
import StatusBadge from "@/components/StatusBadge";
import { waterToMilk } from "@/lib/calculations";

interface Props {
  strict24h: number;
  pct: number;
  dailyTargetMl: number;
  standardBottleVolume: number;
  yellowThresholdPct: number;
  redThresholdPct: number;
  onExplain: () => void;
}

// ── View 0: Numeric ──────────────────────────────────────────────────────────
function NumericView({ strict24h, pct, dailyTargetMl, standardBottleVolume, yellowThresholdPct, redThresholdPct, onExplain }: Props) {
  return (
    <div className="relative">
      <StatusBadge
        label="Strict 24h"
        value={`${Math.round(strict24h)} ml`}
        percentage={pct}
        yellowThresholdPct={yellowThresholdPct}
        redThresholdPct={redThresholdPct}
      />
      <button
        onClick={onExplain}
        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs font-bold flex items-center justify-center leading-none"
      >?</button>
    </div>
  );
}

// ── View 1: Bottles — filled vs outlined ─────────────────────────────────────
function BottleProgressView({ strict24h, dailyTargetMl, standardBottleVolume }: Props) {
  const milkPerBottle = waterToMilk(standardBottleVolume);
  const consumed = strict24h / milkPerBottle;
  const target = dailyTargetMl / milkPerBottle;
  const full = Math.floor(consumed);
  const partial = consumed - full;
  const remaining = Math.max(0, Math.ceil(target) - Math.ceil(consumed));
  const totalSlots = Math.min(Math.ceil(target), 12);

  return (
    <div className="p-4 rounded-xl bg-slate-700/40">
      <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Bottles so far 🍼</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {Array.from({ length: Math.min(full, totalSlots) }).map((_, i) => (
          <span key={`f${i}`} className="text-2xl leading-none">🍼</span>
        ))}
        {partial > 0.1 && full < totalSlots && (
          <span className="text-2xl leading-none" style={{ opacity: 0.2 + partial * 0.8 }}>🍼</span>
        )}
        {Array.from({ length: Math.min(remaining, totalSlots - full - 1) }).map((_, i) => (
          <span key={`r${i}`} className="text-2xl leading-none opacity-20">🍼</span>
        ))}
      </div>
      <div className="text-sm text-slate-300">
        <span className="font-bold text-slate-100">{consumed.toFixed(1)}</span>
        <span className="text-slate-500"> / {target.toFixed(1)} bottles</span>
        <span className="ml-2 text-slate-400">({Math.round(strict24h)} ml)</span>
      </div>
    </div>
  );
}

// ── View 2: Weather Report ───────────────────────────────────────────────────
function WeatherView({ pct, yellowThresholdPct, redThresholdPct }: Props) {
  const diff = pct - 100;
  let emoji = "☀️", headline = "", sub = "";

  if (Math.abs(diff) <= yellowThresholdPct) {
    emoji = "☀️"; headline = "Clear skies"; sub = "Feeding perfectly on track. Great work!";
  } else if (diff > redThresholdPct) {
    emoji = "🌩️"; headline = "Storm alert!"; sub = "Significantly overfed. Delay the next bottle.";
  } else if (diff > yellowThresholdPct) {
    emoji = "⛅"; headline = "Slightly cloudy"; sub = "A touch overfed. Just watch — no action needed.";
  } else if (diff < -redThresholdPct) {
    emoji = "🌧️"; headline = "Heavy rain"; sub = "Significantly behind. Offer a feed soon!";
  } else {
    emoji = "🌦️"; headline = "Light drizzle"; sub = "Slightly behind. Keep an eye on it.";
  }

  return (
    <div className="p-4 rounded-xl bg-slate-700/40">
      <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Today&apos;s feeding forecast</div>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-4xl">{emoji}</span>
        <div>
          <div className="text-slate-100 font-semibold text-lg">{headline}</div>
          <div className="text-slate-400 text-sm">{sub}</div>
        </div>
      </div>
      <div className="text-xs text-slate-500 mt-1">{Math.round(pct)}% of daily target consumed</div>
    </div>
  );
}

// ── View 3: Arcade Health Bar ────────────────────────────────────────────────
function ArcadeView({ pct, strict24h, yellowThresholdPct, redThresholdPct }: Props) {
  const clamped = Math.min(Math.max(pct, 0), 150);
  const barWidth = Math.min(clamped / 150 * 100, 100);
  const diff = Math.abs(pct - 100);
  const color = diff <= yellowThresholdPct ? "#4ade80" : diff <= redThresholdPct ? "#facc15" : "#f87171";
  const blink = diff > redThresholdPct;

  return (
    <div className="p-4 rounded-xl bg-slate-900 font-mono">
      <div className="text-xs text-green-400 mb-1 uppercase tracking-widest">[ NUTRITION LEVEL ]</div>
      <div className="relative h-7 bg-slate-700 rounded border border-slate-600 overflow-hidden mb-1">
        <div
          className={`h-full transition-all duration-500 ${blink ? "animate-pulse" : ""}`}
          style={{ width: `${barWidth}%`, backgroundColor: color }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
          {Math.round(pct)}%
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>0%</span>
        <span className="text-green-400">TARGET 100%</span>
        <span>150%</span>
      </div>
      <div className="text-xs text-slate-400 mt-1.5">
        {Math.round(strict24h)} ml consumed &middot; {pct < 100 ? `DEFICIT ${Math.round(100 - pct)}%` : `SURPLUS ${Math.round(pct - 100)}%`}
      </div>
    </div>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────
export default function StrictCard(props: Props) {
  return (
    <SwipeableCard
      views={[
        <NumericView key="num" {...props} />,
        <BottleProgressView key="bottles" {...props} />,
        <WeatherView key="weather" {...props} />,
        <ArcadeView key="arcade" {...props} />,
      ]}
    />
  );
}
