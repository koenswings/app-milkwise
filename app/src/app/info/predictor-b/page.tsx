"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFeeds, getSettings } from "@/lib/store";
import {
  deriveSettings,
  smoothedAtTime,
  computePredictors,
  waterToMilk,
} from "@/lib/calculations";
import { formatTime } from "@/lib/formatTime";

function fmtRel(ms: number, now: number): string {
  const d = ms - now, abs = Math.abs(d);
  const mins = Math.round(abs / 60000), h = Math.floor(mins / 60), m = mins % 60;
  const str = h > 0 ? `${h}h ${m}m` : `${mins}m`;
  return d > 0 ? `in ${str}` : `${str} ago`;
}

interface LiveData {
  dailyTargetMl: number;
  hourlyRate: number;
  preferredBottleWaterMl: number;
  preferredBottleMilkMl: number;
  currentIntake: number;
  lastFeedTs: number;
  predictorBTimestamp: number;
  predictorBStomachLimited: boolean;
  predictorBCapped: boolean;
  timeFormat: '24h' | '12h';
  // For graph
  graphPoints: { ts: number; smoothedMl: number }[];
  graphStartTs: number;
  graphEndTs: number;
}

export default function PredictorBPage() {
  const [live, setLive] = useState<LiveData | null>(null);
  const [now] = useState(Date.now());

  useEffect(() => {
    (async () => {
      const [feeds, settings] = await Promise.all([getFeeds(), getSettings()]);
      if (!feeds.length) return;
      const derived = deriveSettings(settings);
      const preds = computePredictors(feeds, derived.hourlyRate, derived.dailyTargetMl, settings.preferredBottleWaterMl);
      if (!preds) return;

      const lastFeed = feeds.reduce((a, b) => a.timestamp > b.timestamp ? a : b);
      const preferredBottleMilkMl = waterToMilk(settings.preferredBottleWaterMl);
      const currentIntake = smoothedAtTime(feeds, derived.hourlyRate, Date.now());

      // Build graph points: from lastFeed - 1h to T_B + 2h
      const graphStartTs = lastFeed.timestamp - 1 * 3_600_000;
      const graphEndTs = preds.predictorBTimestamp + 2 * 3_600_000;
      const steps = Math.min(300, Math.ceil((graphEndTs - graphStartTs) / 60_000));
      const stepMs = (graphEndTs - graphStartTs) / steps;
      const graphPoints: { ts: number; smoothedMl: number }[] = [];
      for (let i = 0; i <= steps; i++) {
        const ts = graphStartTs + i * stepMs;
        graphPoints.push({ ts, smoothedMl: smoothedAtTime(feeds, derived.hourlyRate, ts) });
      }

      setLive({
        dailyTargetMl: derived.dailyTargetMl,
        hourlyRate: derived.hourlyRate,
        preferredBottleWaterMl: settings.preferredBottleWaterMl,
        preferredBottleMilkMl,
        currentIntake,
        lastFeedTs: lastFeed.timestamp,
        predictorBTimestamp: preds.predictorBTimestamp,
        predictorBStomachLimited: preds.predictorBStomachLimited,
        predictorBCapped: preds.predictorBCapped,
        timeFormat: settings.timeFormat,
        graphPoints,
        graphStartTs,
        graphEndTs,
      });
    })();
  }, []);

  function renderGraph(lv: LiveData) {
    const W = 320, H = 130, padL = 44, padR = 12, padT = 12, padB = 28;
    const gW = W - padL - padR, gH = H - padT - padB;

    const allVals = lv.graphPoints.map(p => p.smoothedMl);
    const minY = Math.min(...allVals, lv.dailyTargetMl) * 0.95;
    const maxY = Math.max(...allVals) * 1.05;
    const rangeY = maxY - minY || 1;
    const spanMs = lv.graphEndTs - lv.graphStartTs;

    const tx = (ts: number) => padL + ((ts - lv.graphStartTs) / spanMs) * gW;
    const ty = (ml: number) => padT + (1 - (ml - minY) / rangeY) * gH;

    const pathD = lv.graphPoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${tx(p.ts).toFixed(1)},${ty(p.smoothedMl).toFixed(1)}`
    ).join(' ');

    const targetY = ty(lv.dailyTargetMl);
    const tBX = tx(lv.predictorBTimestamp);
    const lastFeedX = tx(lv.lastFeedTs);

    // Find smoothed value at T_B for dot
    const tBPoint = lv.graphPoints.reduce((best, p) =>
      Math.abs(p.ts - lv.predictorBTimestamp) < Math.abs(best.ts - lv.predictorBTimestamp) ? p : best
    );

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y = padT + f * gH;
          const val = Math.round(maxY - f * rangeY);
          return (
            <g key={f}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#334155" strokeWidth="0.5" />
              <text x={padL - 4} y={y + 3.5} textAnchor="end" fontSize="8" fill="#64748b">{val}</text>
            </g>
          );
        })}

        {/* Daily target line (amber) */}
        <line x1={padL} y1={targetY} x2={W - padR} y2={targetY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
        <text x={W - padR + 2} y={targetY + 3.5} fontSize="7" fill="#f59e0b">target</text>

        {/* Last feed vertical (cyan dashed) */}
        <line x1={lastFeedX} y1={padT} x2={lastFeedX} y2={padT + gH} stroke="#22d3ee" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
        <text x={lastFeedX} y={padT + gH + 10} textAnchor="middle" fontSize="7" fill="#22d3ee">last</text>

        {/* T_B vertical (blue) */}
        <line x1={tBX} y1={padT} x2={tBX} y2={padT + gH} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 2" />
        <text x={tBX} y={padT + gH + 10} textAnchor="middle" fontSize="7" fill="#3b82f6">T_B</text>

        {/* Decay curve (cyan) */}
        <path d={pathD} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* T_B dot (blue) */}
        <circle cx={tBX} cy={ty(tBPoint.smoothedMl)} r="3.5" fill="#3b82f6" />

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + gH} stroke="#475569" strokeWidth="1" />
        <line x1={padL} y1={padT + gH} x2={W - padR} y2={padT + gH} stroke="#475569" strokeWidth="1" />
      </svg>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 text-slate-300 text-sm leading-relaxed">
      <Link href="/" className="text-blue-400 hover:text-blue-300 text-xs mb-6 block">← Back to dashboard</Link>

      <h1 className="text-2xl font-bold text-slate-100 mb-2">When to give your bottle?</h1>
      <p className="text-slate-400 text-sm mb-6">Predictor B — adjust the timing, give your preferred bottle</p>

      {/* Intro */}
      <p className="mb-4">
        Predictor B answers a different question: <em>when has the baby burned through enough
        milk that giving the preferred bottle will land the 24h intake right on the daily target?</em>
      </p>

      {/* Section: The tide analogy */}
      <section className="mb-6">
        <h2 className="text-slate-100 font-semibold mb-2">The tide analogy</h2>
        <p className="mb-3">
          Think of the 24h intake as a tide. Each feed is a wave that raises the level.
          Between feeds, the tide falls steadily as the body uses milk.
        </p>
        <p className="mb-3">
          Predictor B finds the moment the tide has fallen back to the daily target.
          At that exact moment, giving the preferred bottle brings the tide back up to its
          equilibrium peak — neither too high nor too low.
        </p>
      </section>

      {/* SVG graph */}
      {live ? (
        <div className="bg-slate-800 rounded-xl p-4 mb-6">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Intake decay to T_B</p>
          {renderGraph(live)}
          <p className="text-xs text-slate-500 mt-2">
            <span className="text-cyan-400">━</span> Smoothed intake &nbsp;
            <span className="text-amber-400">- -</span> Daily target &nbsp;
            <span className="text-blue-400">●</span> T_B (feed here)
          </p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl p-4 mb-6">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Stylised diagram</p>
          <svg viewBox="0 0 300 110" className="w-full" style={{ height: 110 }}>
            {/* Stylised wave */}
            <path d="M20,30 Q60,10 80,50 Q100,80 120,72 Q160,55 200,75 Q230,85 260,80"
              fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
            {/* Target line */}
            <line x1="20" y1="75" x2="280" y2="75" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
            {/* T_B dot */}
            <circle cx="200" cy="75" r="4" fill="#3b82f6" />
            {/* Labels */}
            <text x="14" y="50" fontSize="8" fill="#22d3ee">intake</text>
            <text x="230" y="72" fontSize="7" fill="#f59e0b">target</text>
            <text x="203" y="88" fontSize="7" fill="#3b82f6">T_B</text>
          </svg>
          <p className="text-xs text-slate-500 mt-1">Log a feed to see real data</p>
        </div>
      )}

      {/* Live numbers box */}
      {live ? (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Live calculation</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Daily target</span>
              <span className="text-slate-100">{Math.round(live.dailyTargetMl)} ml</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current intake</span>
              <span className="text-slate-100">{Math.round(live.currentIntake)} ml</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Intake reaches target at</span>
              <span className="text-slate-100 font-mono">
                {formatTime(live.predictorBTimestamp, live.timeFormat)}{' '}
                <span className="text-slate-500 text-xs">({fmtRel(live.predictorBTimestamp, now)})</span>
              </span>
            </div>
            <div className="border-t border-slate-700 pt-2 flex justify-between">
              <span className="text-slate-300 font-medium">Give</span>
              <span className="text-blue-300 font-bold">
                {live.preferredBottleWaterMl} ml water (preferred bottle)
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl p-4 mb-6 text-slate-500 text-sm">
          No feeds logged yet — log a feed to see live calculations.
        </div>
      )}

      {/* Section: Why earlier or later */}
      <section className="mb-6">
        <h2 className="text-slate-100 font-semibold mb-2">Why earlier or later than usual?</h2>
        <ul className="space-y-2">
          <li>
            <span className="text-yellow-400 font-medium">Baby was overfed:</span>{' '}
            the tide is still high — T_B is later than the standard interval.
          </li>
          <li>
            <span className="text-blue-400 font-medium">Baby was underfed:</span>{' '}
            the tide has already fallen — T_B is now or earlier than standard.
          </li>
          <li>
            <span className="text-green-400 font-medium">Baby is on track:</span>{' '}
            T_B matches the standard interval exactly.
          </li>
        </ul>
      </section>

      {/* Stomach floor note */}
      {live?.predictorBStomachLimited && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <p className="text-xs text-slate-400">
            <strong className="text-slate-300">Stomach not ready yet:</strong> The last feed was
            too recent for the stomach to comfortably hold another full bottle. The app adds extra
            waiting time (T_B = stomach floor) before suggesting the next feed.
          </p>
        </div>
      )}

      {!live?.predictorBStomachLimited && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <p className="text-xs text-slate-400">
            <strong className="text-slate-300">Stomach note:</strong> If the stomach isn&apos;t
            ready yet (last feed too recent), the app adds extra waiting time before T_B. This
            ensures the baby can comfortably take the full preferred bottle.
          </p>
        </div>
      )}

      <Link href="/" className="block text-center text-blue-400 hover:text-blue-300 text-sm py-2">
        ← Back to dashboard
      </Link>
    </div>
  );
}
