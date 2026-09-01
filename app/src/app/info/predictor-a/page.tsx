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
  standardIntervalMs: number;
  predictorATimestamp: number;
  intakeAtTA: number;
  predictorAVolumeWater: number;
  predictorAVolumeMilk: number;
  predictorASurplus: boolean;
  predictorACapped: boolean;
  timeFormat: '24h' | '12h';
  // For SVG diagram
  currentIntake: number;
}

export default function PredictorAPage() {
  const [live, setLive] = useState<LiveData | null>(null);
  const [now] = useState(Date.now());

  useEffect(() => {
    (async () => {
      const [feeds, settings] = await Promise.all([getFeeds(), getSettings()]);
      if (!feeds.length) return;
      const derived = deriveSettings(settings);
      const preds = computePredictors(feeds, derived.hourlyRate, derived.dailyTargetMl, settings.preferredBottleWaterMl);
      if (!preds) return;

      const preferredBottleMilkMl = waterToMilk(settings.preferredBottleWaterMl);
      const intakeAtTA = smoothedAtTime(feeds, derived.hourlyRate, preds.predictorATimestamp);
      const currentIntake = smoothedAtTime(feeds, derived.hourlyRate, Date.now());

      setLive({
        dailyTargetMl: derived.dailyTargetMl,
        hourlyRate: derived.hourlyRate,
        preferredBottleWaterMl: settings.preferredBottleWaterMl,
        preferredBottleMilkMl,
        standardIntervalMs: preds.standardIntervalMs,
        predictorATimestamp: preds.predictorATimestamp,
        intakeAtTA,
        predictorAVolumeWater: preds.predictorAVolumeWater,
        predictorAVolumeMilk: preds.predictorAVolumeMilk,
        predictorASurplus: preds.predictorASurplus,
        predictorACapped: preds.predictorACapped,
        timeFormat: settings.timeFormat,
        currentIntake,
      });
    })();
  }, []);

  function renderDiagram(lv: LiveData) {
    const W = 300, H = 180;
    const padL = 16, padR = 16, padT = 20, padB = 20;
    const gW = W - padL - padR, gH = H - padT - padB;

    // Bar chart: current level, peak (D + m0), gap
    const D = lv.dailyTargetMl;
    const m0 = lv.preferredBottleMilkMl;
    const peak = D + m0; // equilibrium peak
    const currentLevel = lv.intakeAtTA;
    const gapMl = lv.predictorASurplus ? 0 : lv.predictorAVolumeMilk;

    const maxY = peak * 1.05;

    const barW = 52, gap = 18;
    const nBars = 3;
    const totalW = nBars * barW + (nBars - 1) * gap;
    const startX = padL + (gW - totalW) / 2;

    function barHeight(ml: number) {
      return (ml / maxY) * gH;
    }
    function barY(ml: number) {
      return padT + gH - barHeight(ml);
    }

    const bars = [
      { label: 'At std time', ml: currentLevel, color: '#60a5fa', labelColor: '#93c5fd' },
      { label: 'Target', ml: D, color: '#4ade80', labelColor: '#86efac' },
      { label: 'Peak', ml: peak, color: '#818cf8', labelColor: '#a5b4fc' },
    ];

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Horizontal baseline */}
        <line x1={padL} y1={padT + gH} x2={W - padR} y2={padT + gH} stroke="#334155" strokeWidth="1" />

        {bars.map((bar, i) => {
          const x = startX + i * (barW + gap);
          const bH = barHeight(bar.ml);
          const bY = barY(bar.ml);
          return (
            <g key={bar.label}>
              <rect x={x} y={bY} width={barW} height={bH} fill={bar.color} opacity="0.7" rx="3" />
              <text x={x + barW / 2} y={bY - 4} textAnchor="middle" fontSize="9" fill={bar.labelColor}>
                {Math.round(bar.ml)}ml
              </text>
              <text x={x + barW / 2} y={padT + gH + 13} textAnchor="middle" fontSize="8" fill="#64748b">
                {bar.label}
              </text>
            </g>
          );
        })}

        {/* Gap annotation between "At std time" and "Peak" */}
        {!lv.predictorASurplus && gapMl > 0 && (() => {
          const x0 = startX + barW / 2;
          const x2 = startX + 2 * (barW + gap) + barW / 2;
          const yTop = barY(peak);
          const yBot = barY(currentLevel);
          const xMid = (x0 + x2) / 2;
          return (
            <g>
              <line x1={xMid} y1={yBot} x2={xMid} y2={yTop} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
              <text x={xMid + 4} y={(yBot + yTop) / 2 + 4} fontSize="8" fill="#f59e0b">Gap = {Math.round(gapMl)}ml</text>
            </g>
          );
        })()}
      </svg>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 text-slate-300 text-sm leading-relaxed">
      <Link href="/" className="text-blue-400 hover:text-blue-300 text-xs mb-6 block">← Back to dashboard</Link>

      <h1 className="text-2xl font-bold text-slate-100 mb-2">How much to give?</h1>
      <p className="text-slate-400 text-sm mb-6">Predictor A — adjust the amount at the standard time</p>

      {/* Intro */}
      <p className="mb-4">
        At the usual feeding interval, this baby needs a specific amount — but if feeding
        has been a bit off schedule lately, the amount adjusts automatically. Here&apos;s why.
      </p>

      {/* Section: The 24-hour bucket */}
      <section className="mb-6">
        <h2 className="text-slate-100 font-semibold mb-2">The 24-hour bucket</h2>
        <p className="mb-3">
          Think of the baby&apos;s milk intake as a bucket. Each feed fills it up. Between feeds,
          the body uses milk steadily — so the level slowly drops.
        </p>
        <p className="mb-3">
          When the bucket is <span className="text-green-400 font-medium">full</span>, the baby
          doesn&apos;t need as much at the next feed. When it&apos;s{' '}
          <span className="text-blue-400 font-medium">lower than usual</span>, the baby needs a
          bit more to catch up.
        </p>
        <p>
          The goal is to keep the bucket at the <strong className="text-slate-200">daily target</strong> level —
          not too high, not too low.
        </p>
      </section>

      {/* SVG diagram */}
      {live && (
        <div className="bg-slate-800 rounded-xl p-4 mb-6">
          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide">Intake levels at the standard time</p>
          {renderDiagram(live)}
          <p className="text-xs text-slate-500 mt-2">
            <span className="text-blue-300">■</span> Intake at standard time &nbsp;
            <span className="text-green-300">■</span> Daily target &nbsp;
            <span className="text-indigo-400">■</span> Peak (target + bottle) &nbsp;
            <span className="text-amber-400">- -</span> Amount to give
          </p>
        </div>
      )}

      {/* Section: At the standard time */}
      <section className="mb-6">
        <h2 className="text-slate-100 font-semibold mb-2">At the standard time</h2>
        <p className="mb-3">
          The <strong className="text-slate-200">standard time</strong> is when one preferred
          bottle would have been fully used by the body. At that exact moment, the app measures
          the bucket level and calculates how much to top it up.
        </p>
        <p>
          The target after feeding is: <em>daily target + one bottle</em>. That&apos;s the
          equilibrium peak. Subtracting the current level gives the amount to give.
        </p>
      </section>

      {/* Live numbers box */}
      {live ? (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Live calculation</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Standard time (T_A)</span>
              <span className="text-slate-100 font-mono">
                {formatTime(live.predictorATimestamp, live.timeFormat)}{' '}
                <span className="text-slate-500 text-xs">({fmtRel(live.predictorATimestamp, now)})</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Intake at T_A</span>
              <span className="text-slate-100">{Math.round(live.intakeAtTA)} ml</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Daily target</span>
              <span className="text-slate-100">{Math.round(live.dailyTargetMl)} ml</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Preferred bottle</span>
              <span className="text-slate-100">{live.preferredBottleWaterMl} ml water = {Math.round(live.preferredBottleMilkMl)} ml milk</span>
            </div>
            <div className="border-t border-slate-700 pt-2 flex justify-between">
              <span className="text-slate-300 font-medium">Amount to give</span>
              {live.predictorASurplus ? (
                <span className="text-slate-400 italic">Well fed — none needed</span>
              ) : (
                <span className="text-blue-300 font-bold">
                  {live.predictorAVolumeWater} ml water = {Math.round(live.predictorAVolumeMilk)} ml milk
                </span>
              )}
            </div>
            {live.predictorACapped && (
              <div className="text-xs text-yellow-400">⚠️ Amount capped at stomach limit</div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl p-4 mb-6 text-slate-500 text-sm">
          No feeds logged yet — log a feed to see live calculations.
        </div>
      )}

      {/* Section: When the amount changes */}
      <section className="mb-6">
        <h2 className="text-slate-100 font-semibold mb-2">When the amount changes</h2>
        <ul className="space-y-2">
          <li>
            <span className="text-blue-400 font-medium">Feeds late or missed:</span>{' '}
            the bucket is lower than usual — the app suggests a larger bottle to catch up.
          </li>
          <li>
            <span className="text-yellow-400 font-medium">Feeds earlier than usual:</span>{' '}
            the bucket is already high — the app suggests less, or shows &quot;no extra needed&quot;.
          </li>
          <li>
            <span className="text-green-400 font-medium">Normal schedule:</span>{' '}
            the amount equals the preferred bottle size exactly.
          </li>
        </ul>
      </section>

      {/* Stomach cap note */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
        <p className="text-xs text-slate-400">
          <strong className="text-slate-300">Safety cap:</strong> The app never suggests more
          than one bottle size above your preferred bottle. This matches the stomach&apos;s
          comfortable capacity and prevents overfeeding in a single session.
        </p>
      </div>

      <Link href="/" className="block text-center text-blue-400 hover:text-blue-300 text-sm py-2">
        ← Back to dashboard
      </Link>
    </div>
  );
}
