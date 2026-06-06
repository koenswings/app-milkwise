"use client";

import SwipeableCard from "@/components/SwipeableCard";
import StatusBadge from "@/components/StatusBadge";
import SmoothedExplainer from "@/components/SmoothedExplainer";
import { Feed } from "@/types";
import { useState } from "react";

interface Props {
  smoothedMl: number;
  smoothedBottles: number;
  pct: number;
  dailyTargetMl: number;
  standardBottleVolume: number;
  hourlyRate: number;
  yellowThresholdPct: number;
  redThresholdPct: number;
  feeds: Feed[];
  now: number;
}

// ── View 0: Numeric ──────────────────────────────────────────────────────────
function NumericView(props: Props & { onExplain: () => void }) {
  return (
    <div className="relative">
      <StatusBadge
        label="Smoothed 24h"
        value={`${Math.round(props.smoothedMl)} ml`}
        percentage={props.pct}
        yellowThresholdPct={props.yellowThresholdPct}
        redThresholdPct={props.redThresholdPct}
      />
      <button
        onClick={props.onExplain}
        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs font-bold flex items-center justify-center leading-none"
      >?</button>
    </div>
  );
}

// ── View 1: Battery Meter ────────────────────────────────────────────────────
function BatteryView({ pct, smoothedMl, yellowThresholdPct, redThresholdPct }: Props) {
  const fill = Math.min(Math.max(pct, 0), 130);
  const diff = Math.abs(pct - 100);
  const color = diff <= yellowThresholdPct ? "#4ade80" : diff <= redThresholdPct ? "#facc15" : "#f87171";
  const bars = 10;
  const filledBars = Math.round((fill / 130) * bars);

  return (
    <div className="p-4 rounded-xl bg-slate-700/40 flex items-center gap-4">
      {/* Battery body */}
      <div className="flex flex-col items-center gap-0.5">
        {/* Terminal nub */}
        <div className="w-5 h-1.5 rounded-sm" style={{ backgroundColor: color, opacity: 0.6 }} />
        {/* Body */}
        <div className="w-10 border-2 border-slate-500 rounded-sm p-0.5 flex flex-col-reverse gap-0.5" style={{ height: 80 }}>
          {Array.from({ length: bars }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all"
              style={{ backgroundColor: i < filledBars ? color : "#334155" }}
            />
          ))}
        </div>
        <div className="text-xs font-bold mt-1" style={{ color }}>{Math.round(pct)}%</div>
      </div>
      <div>
        <div className="text-slate-100 text-lg font-bold">{Math.round(smoothedMl)} ml</div>
        <div className="text-slate-400 text-sm">smoothed intake</div>
        <div className="text-slate-500 text-xs mt-1">
          {pct < 95 ? "🔴 Charge baby now!" : pct < 105 ? "🟢 Full charge!" : "⚡ Overcharged a bit"}
        </div>
      </div>
    </div>
  );
}

// ── View 2: Water Tank ───────────────────────────────────────────────────────
function WaterTankView({ pct, smoothedMl, dailyTargetMl, yellowThresholdPct, redThresholdPct }: Props) {
  const fill = Math.min(Math.max(pct, 0), 130);
  const diff = Math.abs(pct - 100);
  const color = diff <= yellowThresholdPct ? "#4ade80" : diff <= redThresholdPct ? "#facc15" : "#f87171";
  const fillPct = (fill / 130 * 100).toFixed(0);

  return (
    <div className="p-4 rounded-xl bg-slate-700/40">
      <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Tank level 🌊</div>
      <div className="flex items-end gap-3">
        {/* Tank */}
        <div className="relative w-14 rounded-b-xl border-2 border-slate-500 overflow-hidden" style={{ height: 72 }}>
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-700"
            style={{ height: `${fillPct}%`, backgroundColor: color, opacity: 0.7 }}
          />
          {/* Wave shimmer */}
          <div
            className="absolute left-0 right-0 h-1 rounded"
            style={{ bottom: `calc(${fillPct}% - 2px)`, backgroundColor: color, opacity: 0.9 }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
            {Math.round(pct)}%
          </div>
        </div>
        <div>
          <div className="text-slate-100 text-lg font-bold">{Math.round(smoothedMl)} ml</div>
          <div className="text-slate-500 text-xs">of {Math.round(dailyTargetMl)} ml target</div>
          <div className="text-slate-400 text-sm mt-1">
            {pct < 95 ? "🌵 Running dry!" : pct <= 105 ? "💧 Just right" : "🌊 Overflowing!"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── View 3: Baby Mood ────────────────────────────────────────────────────────
function BabyMoodView({ pct, smoothedMl, yellowThresholdPct, redThresholdPct }: Props) {
  const diff = pct - 100;
  let emoji = "😊", mood = "", detail = "";

  if (Math.abs(diff) <= yellowThresholdPct) {
    emoji = "😄"; mood = "Happy & content"; detail = "Perfect feeding rhythm. Baby is thriving!";
  } else if (diff > redThresholdPct) {
    emoji = "🤢"; mood = "A bit stuffed"; detail = "Overfed. Give the tummy some rest before the next feed.";
  } else if (diff > yellowThresholdPct) {
    emoji = "😌"; mood = "Comfortably full"; detail = "Slightly over target. All good — just keep watching.";
  } else if (diff < -redThresholdPct) {
    emoji = "😢"; mood = "Hungry!"; detail = "Significantly behind. Baby needs a feed soon!";
  } else {
    emoji = "😕"; mood = "A little peckish"; detail = "Slightly behind. Offer a feed a bit earlier.";
  }

  return (
    <div className="p-4 rounded-xl bg-slate-700/40 text-center">
      <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Baby mood 😊</div>
      <div className="text-6xl mb-2">{emoji}</div>
      <div className="text-slate-100 font-semibold text-lg">{mood}</div>
      <div className="text-slate-400 text-sm mt-1">{detail}</div>
      <div className="text-slate-500 text-xs mt-2">{Math.round(smoothedMl)} ml · {Math.round(pct)}%</div>
    </div>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────
export default function SmoothedCard(props: Props) {
  const [showExplainer, setShowExplainer] = useState(false);

  return (
    <>
      {showExplainer && (
        <SmoothedExplainer
          onClose={() => setShowExplainer(false)}
          hourlyRate={props.hourlyRate}
          standardBottleVolume={props.standardBottleVolume}
          dailyTargetMl={props.dailyTargetMl}
          feeds={props.feeds}
          now={props.now}
        />
      )}
      <SwipeableCard
        views={[
          <NumericView key="num" {...props} onExplain={() => setShowExplainer(true)} />,
          <BatteryView key="battery" {...props} />,
          <WaterTankView key="tank" {...props} />,
          <BabyMoodView key="mood" {...props} />,
        ]}
      />
    </>
  );
}
