"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFeeds, getSettings } from "@/lib/store";
import { deriveSettings, smoothedEffective, nextFeedTime, waterToMilk } from "@/lib/calculations";
import { formatDateTime } from "@/lib/formatTime";

function formatRelMin(ms: number, now: number): string {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const h = Math.floor(mins / 60), m = mins % 60;
  const str = h > 0 ? `${h}h ${m}m` : `${mins}m`;
  return diff > 0 ? `in ${str}` : `${str} ago`;
}

export default function NextFeedInfoPage() {
  const [live, setLive] = useState<{
    surplusMl: number;
    balance: number;
    rawShiftMin: number;
    clampedShiftMin: number;
    capped: boolean;
    adjustedTs: number;
    idealIntervalMin: number;
    maxCorrectionMin: number;
    standardBottleVolume: number;
    timeFormat: '24h' | '12h';
  } | null>(null);
  const [now] = useState(Date.now());

  useEffect(() => {
    (async () => {
      const [feeds, settings] = await Promise.all([getFeeds(), getSettings()]);
      if (!feeds.length) return;
      const derived = deriveSettings(settings);
      const lastFeed = feeds.reduce((a, b) => a.timestamp > b.timestamp ? a : b);
      const smoothedAt = lastFeed.timestamp;
      const { totalMl: smoothedTotal } = smoothedEffective(feeds, derived.hourlyRate, settings.standardBottleVolume, smoothedAt);

      // New algorithm: standard = lastFeed + waterToMilk(lastFeed.volume) / hourlyRate
      const lastMilkMl = waterToMilk(lastFeed.volume);
      const standardIntervalMs = (lastMilkMl / derived.hourlyRate) * 3_600_000;
      const standardNext = lastFeed.timestamp + standardIntervalMs;
      const maxCorrectionMs = standardIntervalMs * (settings.maxCorrectionPct / 100);

      const surplus = smoothedTotal - derived.dailyTargetMl;
      const rawCorrectionMs = (surplus / derived.hourlyRate) * 3_600_000;
      const clampedCorrection = Math.max(-maxCorrectionMs, Math.min(maxCorrectionMs, rawCorrectionMs));
      const adjustedTs = standardNext + clampedCorrection;
      const capped = Math.abs(clampedCorrection - rawCorrectionMs) > 1;

      setLive({
        surplusMl: surplus,
        balance: surplus,
        rawShiftMin: Math.round(rawCorrectionMs / 60_000),
        clampedShiftMin: Math.round(clampedCorrection / 60_000),
        capped,
        adjustedTs,
        idealIntervalMin: Math.round(standardIntervalMs / 60_000),
        maxCorrectionMin: Math.round(maxCorrectionMs / 60_000),
        standardBottleVolume: lastFeed.volume,
        timeFormat: settings.timeFormat,
      });
    })();
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 text-slate-300 text-sm leading-relaxed">
      <Link href="/" className="text-blue-400 hover:text-blue-300 text-xs mb-6 block">← Back to dashboard</Link>

      <h1 className="text-2xl font-bold text-slate-100 mb-1">Adjusted next feed</h1>
      <p className="text-slate-400 text-xs mb-6">How it's calculated and what it means right now</p>

      {/* Live current values */}
      {live && (
        <div className={`rounded-xl border p-4 mb-6 ${live.surplusMl >= 0 ? 'border-yellow-700/50 bg-yellow-900/10' : 'border-blue-700/50 bg-blue-900/10'}`}>
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-3">Right now</div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">{live.surplusMl >= 0 ? 'Overfed by' : 'Underfed by'}</span>
              <span className={`font-semibold ${live.surplusMl >= 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
                {Math.abs(Math.round(live.surplusMl))} ml
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">24h surplus</span>
              <span className={`font-semibold tabular-nums ${live.surplusMl >= 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
                {live.surplusMl >= 0 ? '+' : ''}{Math.round(live.surplusMl)} ml
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ideal interval</span>
              <span className="text-slate-300 tabular-nums">{live.idealIntervalMin} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Raw correction needed</span>
              <span className={`font-semibold tabular-nums ${live.rawShiftMin > 0 ? 'text-yellow-400' : live.rawShiftMin < 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                {live.rawShiftMin === 0 ? 'none' : live.rawShiftMin > 0 ? `+${live.rawShiftMin} min` : `${live.rawShiftMin} min`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cap (±{live.maxCorrectionMin} min)</span>
              <span className={`font-semibold tabular-nums ${live.capped ? 'text-orange-400' : 'text-slate-500'}`}>
                {live.capped
                  ? `applied → ${live.clampedShiftMin > 0 ? '+' : ''}${live.clampedShiftMin} min`
                  : 'not applied'}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-700">
              <span className="text-slate-300 font-medium">Adjusted next feed</span>
              <span className="text-blue-300 font-bold">
                {formatDateTime(live.adjustedTs, live.timeFormat)}{' '}
                <span className="text-slate-500 font-normal text-xs">{formatRelMin(live.adjustedTs, now)}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Explanation */}
      <h2 className="text-slate-100 font-semibold mt-4 mb-2">How it's calculated</h2>
      <p className="mb-3">
        The adjusted time is based on the baby's <strong>energy balance</strong> — how much
        energy she has stored relative to ideal:
      </p>
      <div className="bg-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 mb-3 whitespace-pre">{`standard   = lastFeed + waterToMilk(lastFeed.volume) / hourlyRate

surplus    = smoothedTotal − dailyTarget
correction = surplus / hourlyRate  (capped ±maxCorrectionPct%)
adjusted   = standard + correction`}</div>
      <ul className="list-disc pl-5 space-y-1.5 mb-4 text-slate-400">
        <li><strong className="text-slate-300">surplus &gt; 0</strong> (overfed) → correction &gt; 0 → adjusted later than standard</li>
        <li><strong className="text-slate-300">surplus &lt; 0</strong> (underfed) → correction &lt; 0 → adjusted earlier than standard</li>
        <li><strong className="text-slate-300">surplus = 0</strong> (on target) → adjusted = standard</li>
      </ul>

      <h2 className="text-slate-100 font-semibold mt-4 mb-2">The correction cap</h2>
      <p className="mb-3 text-slate-400">
        The shift relative to the standard interval is limited to ±<strong className="text-slate-300">maxCorrectionPct</strong>%
        of the ideal interval (default ±25%). This prevents large surpluses or deficits
        from pushing the feed time to an extreme.
      </p>
      <div className="bg-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 mb-4">
        {`maxCorrection = idealInterval × maxCorrectionPct / 100\nadjusted = clamp(rawAdjusted,\n           standard − maxCorrection,\n           standard + maxCorrection)`}
      </div>

      <div className="bg-slate-800 rounded-xl p-4 mt-4">
        <p className="text-slate-200 font-medium mb-1">Self-correcting</p>
        <p className="text-slate-400 text-xs">
          After giving one standard bottle at the adjusted time, the energy balance returns
          to exactly one bottle — the rhythm resets automatically. No manual adjustment needed.
        </p>
      </div>
    </div>
  );
}
