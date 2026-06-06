"use client";

import SwipeableCard from "@/components/SwipeableCard";
import { DerivedSettings, Settings } from "@/types";
import { waterToMilk } from "@/lib/calculations";

interface Props {
  settings: Settings;
  derived: DerivedSettings;
}

// ── View 0: Numeric ──────────────────────────────────────────────────────────
function NumericView({ settings, derived }: Props) {
  return (
    <div className="p-4">
      <div className="text-sm text-slate-400 mb-1">Daily target</div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-xl font-semibold text-slate-100">{Math.round(derived.dailyTargetMl)} ml</span>
        <span className="text-slate-400 text-sm">&middot;</span>
        <span className="text-lg font-semibold text-slate-300">
          {settings.standardBottleVolume} ml bottle every{" "}
          {(() => {
            const h = Math.floor(derived.idealIntervalHours);
            const m = Math.round((derived.idealIntervalHours - h) * 60);
            return h > 0 ? `${h}h ${m}m` : `${m}m`;
          })()}
        </span>
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {settings.weightKg} kg &times; {settings.mlPerKgPerDay} ml/kg/day &middot; prepared formula ml
      </div>
    </div>
  );
}

// ── View 1: Bottle Parade ────────────────────────────────────────────────────
function BottleParadeView({ settings, derived }: Props) {
  const milkPerBottle = waterToMilk(settings.standardBottleVolume);
  const totalBottles = derived.dailyTargetMl / milkPerBottle;
  const full = Math.floor(totalBottles);
  const partial = totalBottles - full;

  return (
    <div className="p-4">
      <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Today&apos;s feast 🍼</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {Array.from({ length: full }).map((_, i) => (
          <span key={i} className="text-2xl leading-none">🍼</span>
        ))}
        {partial > 0.1 && (
          <span className="text-2xl leading-none" style={{ opacity: 0.3 + partial * 0.7 }}>🍼</span>
        )}
      </div>
      <div className="text-slate-300 text-sm">
        <span className="font-bold text-slate-100">{totalBottles.toFixed(1)}</span> bottles of {settings.standardBottleVolume} ml
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{Math.round(derived.dailyTargetMl)} ml target</div>
    </div>
  );
}

// ── View 2: Feed Clock ───────────────────────────────────────────────────────
function FeedClockView({ derived }: { derived: DerivedSettings }) {
  const intervalH = derived.idealIntervalHours;
  const feedsPerDay = 24 / intervalH;
  const feedTimes: number[] = [];
  for (let i = 0; i < feedsPerDay && feedTimes.length < 12; i++) {
    feedTimes.push((i * intervalH) % 24);
  }

  function hourLabel(h: number) {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  return (
    <div className="p-4">
      <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Feed schedule ⏰</div>
      <div className="flex flex-wrap gap-1.5">
        {feedTimes.map((t, i) => (
          <span
            key={i}
            className="text-xs bg-blue-900/60 border border-blue-700/50 text-blue-300 rounded-md px-1.5 py-0.5 font-mono"
          >
            {hourLabel(t)}
          </span>
        ))}
      </div>
      <div className="text-xs text-slate-500 mt-2">
        Every {derived.idealIntervalHours.toFixed(1)}h &middot; ~{Math.round(feedsPerDay)} feeds/day
      </div>
    </div>
  );
}

// ── View 3: Fun Facts ────────────────────────────────────────────────────────
function FunFactsView({ settings, derived }: Props) {
  const ml = Math.round(derived.dailyTargetMl);
  const facts = [
    { emoji: "🥤", text: `${(ml / 330).toFixed(1)} cans of soda` },
    { emoji: "🍵", text: `${Math.round(ml / 150)} cups of tea` },
    { emoji: "💧", text: `${(ml / 1000).toFixed(2)} litres of liquid` },
    { emoji: "🫙", text: `${(ml / 500).toFixed(1)} jam jars full` },
  ];

  return (
    <div className="p-4">
      <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Did you know? 🌟</div>
      <div className="text-slate-300 text-sm mb-2">
        <span className="text-slate-100 font-bold">{settings.weightKg} kg</span> baby needs <span className="text-slate-100 font-bold">{ml} ml</span>/day — that&apos;s like…
      </div>
      <div className="space-y-1">
        {facts.map(({ emoji, text }) => (
          <div key={text} className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-lg">{emoji}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────
export default function DailyTargetCard({ settings, derived }: Props) {
  return (
    <SwipeableCard
      className="mb-4"
      views={[
        <NumericView key="num" settings={settings} derived={derived} />,
        <BottleParadeView key="bottles" settings={settings} derived={derived} />,
        <FeedClockView key="clock" derived={derived} />,
        <FunFactsView key="facts" settings={settings} derived={derived} />,
      ]}
    />
  );
}
