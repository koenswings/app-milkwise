"use client";

import SwipeableCard from "@/components/SwipeableCard";
import { DerivedSettings, Settings } from "@/types";
import { waterToMilk } from "@/lib/calculations";

interface Props {
  settings: Settings;
  derived: DerivedSettings;
}

// ── View 0: Target — same template as StatusCard panel ──────────────────────
function NumericView({ settings, derived }: Props) {
  const milkPerBottle = waterToMilk(settings.standardBottleVolume);
  const targetBottles = derived.dailyTargetMl / milkPerBottle;
  const full = Math.floor(targetBottles);
  const partial = targetBottles - full;
  const totalSlots = Math.min(Math.ceil(targetBottles), 10);
  const h = Math.floor(derived.idealIntervalHours);
  const m = Math.round((derived.idealIntervalHours - h) * 60);
  const intervalLabel = h > 0 ? `${h}h ${m}m` : `${m}m`;

  const cols = 4;
  const fullSlots = Math.min(full, totalSlots);
  const hasPartial = partial > 0.1 && fullSlots < totalSlots;

  return (
    <div className="rounded-xl border border-slate-700 p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Daily target</div>

      {/* Numbers full width — same layout as Status */}
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-3xl font-bold leading-none tabular-nums text-slate-100">{Math.round(derived.dailyTargetMl)}<span className="text-base font-normal ml-0.5">ml</span></span>
        <span className="text-3xl font-bold leading-none tabular-nums text-blue-300">{targetBottles.toFixed(1)}<span className="text-base font-normal text-slate-500 ml-0.5">bottles</span></span>
      </div>
      <div className="text-sm text-slate-400 mb-1">{settings.standardBottleVolume} ml · every {intervalLabel}</div>
      <div className="text-xs text-slate-600 mb-2">{settings.weightKg} kg × {settings.mlPerKgPerDay} ml/kg</div>

      {/* Bottle pictograms below — full width, same as Status */}
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: totalSlots }).map((_, i) => {
          const isFull = i < fullSlots;
          const isPartial = hasPartial && i === fullSlots;
          return (
            <div key={i} className="flex flex-col items-center">
              <span
                className="leading-none"
                style={{ fontSize: '1.25rem', opacity: isFull ? 0.85 : isPartial ? partial * 0.8 : 0.12 }}
              >🍼</span>
              <span className="text-xs text-slate-500 tabular-nums">{settings.standardBottleVolume}</span>
            </div>
          );
        })}
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
    <div className="p-3">
      <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Today&apos;s feast 🍼</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {Array.from({ length: full }).map((_, i) => (
          <span key={i} className="text-xl leading-none">🍼</span>
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
    <div className="p-3">
      <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Feed schedule ⏰</div>
      <div className="flex flex-wrap gap-2">
        {feedTimes.map((t, i) => (
          <span
            key={i}
            className="text-base bg-blue-900/60 border border-blue-700/50 text-blue-300 rounded-lg px-2.5 py-1 font-mono font-semibold"
          >
            {hourLabel(t)}
          </span>
        ))}
      </div>
      <div className="text-sm text-slate-500 mt-2">
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
    <div className="p-3">
      <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Did you know? 🌟</div>
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

// ── Extra view A: Progress bar (matched with StatusCard ProgressView) ────────
function TargetProgressView({ settings, derived }: Props) {
  const milkPerBottle = waterToMilk(settings.standardBottleVolume);
  const targetBottles = derived.dailyTargetMl / milkPerBottle;
  const h = Math.floor(derived.idealIntervalHours);
  const m = Math.round((derived.idealIntervalHours - h) * 60);
  return (
    <div className="rounded-xl border border-slate-700 p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Daily target</div>
      <div className="text-slate-300 text-sm font-medium mb-2">
        {Math.round(derived.dailyTargetMl)} ml · {targetBottles.toFixed(1)} 🍼
      </div>
      <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden mb-1">
        <div className="absolute inset-0 rounded-full bg-blue-500/60" />
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">100%</div>
      </div>
      <div className="text-xs text-slate-500">
        Every {h > 0 ? `${h}h ${m}m` : `${m}m`} · {settings.weightKg} kg × {settings.mlPerKgPerDay} ml/kg
      </div>
    </div>
  );
}

// ── Extra view B: Number spotlight (matched with StatusCard SpotlightView) ───
function TargetSpotlightView({ settings, derived }: Props) {
  const milkPerBottle = waterToMilk(settings.standardBottleVolume);
  const targetBottles = derived.dailyTargetMl / milkPerBottle;
  const h = Math.floor(derived.idealIntervalHours);
  const m = Math.round((derived.idealIntervalHours - h) * 60);
  return (
    <div className="rounded-xl border border-slate-700 p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Daily target</div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-4xl font-black text-slate-100 tabular-nums">{Math.round(derived.dailyTargetMl)}</div>
          <div className="text-xs text-slate-400 mt-0.5">ml / day</div>
        </div>
        <div>
          <div className="text-4xl font-black text-blue-300 tabular-nums">{targetBottles.toFixed(1)}</div>
          <div className="text-xs text-slate-400 mt-0.5">bottles of {settings.standardBottleVolume} ml</div>
        </div>
      </div>
      <div className="text-xs text-slate-600 text-center mt-2">every {h > 0 ? `${h}h ${m}m` : `${m}m`}</div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function DailyTargetCard({ settings, derived }: Props) {
  return (
    <SwipeableCard
      className="mb-2"
      views={[
        <NumericView key="num" settings={settings} derived={derived} />,
        <FeedClockView key="clock" derived={derived} />,
        <FunFactsView key="facts" settings={settings} derived={derived} />,
        <TargetSpotlightView key="spotlight" settings={settings} derived={derived} />,
      ]}
    />
  );
}
