"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFeeds, getSettings } from "@/lib/store";
import { deriveSettings, smoothedEffective, smoothedAtTime, nextFeedTime, waterToMilk, bottleCredit } from "@/lib/calculations";
import { formatDateTime } from "@/lib/formatTime";

function fmtRel(ms: number, now: number): string {
  const d = ms - now, abs = Math.abs(d);
  const mins = Math.round(abs / 60000), h = Math.floor(mins / 60), m = mins % 60;
  const str = h > 0 ? `${h}h ${m}m` : `${mins}m`;
  return d > 0 ? `in ${str}` : `${str} ago`;
}

function fmtTime(ts: number, fmt: '24h' | '12h'): string {
  const d = new Date(ts);
  let h = d.getHours(), m = d.getMinutes();
  if (fmt === '12h') { h = h % 12 || 12; }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface WindowPoint {
  ts: number;
  smoothedMl: number;
  label?: string;
  isTarget?: boolean;
  isTstar?: boolean;
}

export default function NextFeedInfoPage() {
  const [live, setLive] = useState<{
    // Core numbers
    smoothedAtLastFeedMl: number;
    dailyTargetMl: number;
    surplusMl: number;
    nextBottleMilkMl: number;
    nextBottleWaterMl: number;
    targetBeforeMl: number;
    // Window
    graphStartTs: number;
    lastFeedTs: number;
    standardTs: number;
    tStarTs: number;
    windowEndTs: number;
    capped: boolean;
    p3DeltaMin: number;
    p3MaxCorrectionMin: number;
    // Graph points: evenly sampled across the window
    windowPoints: WindowPoint[];
    // Result
    adjustedTs: number;
    timeFormat: '24h' | '12h';
    useP3: boolean;
    // P2 fallback
    maxCorrectionMin: number;
    clampedMin: number;
    rawCorrectionMin: number;
    creditRows: { ts: number; waterMl: number; milkMl: number; ageHours: number; creditMl: number }[];
    creditTotal: number;
    hourlyRate: number;
  } | null>(null);
  const [now] = useState(Date.now());

  useEffect(() => {
    (async () => {
      const [feeds, settings] = await Promise.all([getFeeds(), getSettings()]);
      if (!feeds.length) return;
      const derived = deriveSettings(settings);
      const lastFeed = feeds.reduce((a, b) => a.timestamp > b.timestamp ? a : b);

      const { totalMl: smoothedTotal } = smoothedEffective(feeds, derived.hourlyRate, settings.standardBottleVolume, lastFeed.timestamp);
      const surplus = smoothedTotal - derived.dailyTargetMl;

      const nextBottleMilkMl = waterToMilk(settings.nextBottleWaterMl ?? 90);
      const targetBefore = derived.dailyTargetMl - nextBottleMilkMl;

      // P3 window boundaries
      const p3StandardIntervalMs = (nextBottleMilkMl / derived.hourlyRate) * 3_600_000;
      const p3StandardTs = lastFeed.timestamp + p3StandardIntervalMs;
      const p3MaxCorrectionMs = p3StandardIntervalMs * (settings.maxCorrectionPct / 100);
      const p3MaxCorrectionMin = Math.round(p3MaxCorrectionMs / 60_000);
      const windowEndTs = p3StandardTs + p3MaxCorrectionMs;

      // P2 fallback numbers
      const lastMilkMl = waterToMilk(lastFeed.volume);
      const p2StandardIntervalMs = (lastMilkMl / derived.hourlyRate) * 3_600_000;
      const p2StandardTs = lastFeed.timestamp + p2StandardIntervalMs;
      const p2MaxCorrectionMs = p2StandardIntervalMs * (settings.maxCorrectionPct / 100);
      const rawCorrectionMs = (surplus / derived.hourlyRate) * 3_600_000;
      const clampedMs = Math.max(-p2MaxCorrectionMs, Math.min(p2MaxCorrectionMs, rawCorrectionMs));

      const result = nextFeedTime(feeds, derived.hourlyRate, smoothedTotal, derived.dailyTargetMl, settings);
      const adjustedTs = result?.timestamp ?? p2StandardTs + clampedMs;
      const capped = result?.capped ?? false;
      const p3DeltaMin = Math.round((adjustedTs - p3StandardTs) / 60_000);

      // Graph spans 3h before lastFeed → windowEnd, sampled every minute.
      // Starting before lastFeed ensures older bottles decaying through 24h are visible.
      const graphStartTs = lastFeed.timestamp - 3 * 3_600_000;
      const graphEndTs = windowEndTs;
      const graphStepMs = 60_000; // 1-minute resolution
      const graphSteps = Math.ceil((graphEndTs - graphStartTs) / graphStepMs);
      const windowPoints: WindowPoint[] = [];
      for (let i = 0; i <= graphSteps; i++) {
        const ts = graphStartTs + i * graphStepMs;
        const smoothedMl = smoothedAtTime(feeds, derived.hourlyRate, ts);
        windowPoints.push({ ts, smoothedMl });
      }
      // Label key timestamps
      const findIdx = (targetTs: number) => Math.round((targetTs - graphStartTs) / graphStepMs);
      const lastFeedGraphIdx = findIdx(lastFeed.timestamp);
      if (lastFeedGraphIdx >= 0 && lastFeedGraphIdx < windowPoints.length) windowPoints[lastFeedGraphIdx].label = 'Last feed';
      const standardIdx2 = findIdx(p3StandardTs);
      if (standardIdx2 >= 0 && standardIdx2 < windowPoints.length) windowPoints[standardIdx2].label = 'Standard';
      const tStarIdx = findIdx(adjustedTs);
      if (tStarIdx >= 0 && tStarIdx < windowPoints.length) {
        windowPoints[tStarIdx].isTstar = true;
        windowPoints[tStarIdx].label = 'T*';
      }
      const windowEndGraphIdx = findIdx(windowEndTs);
      if (windowEndGraphIdx >= 0 && windowEndGraphIdx < windowPoints.length) windowPoints[windowEndGraphIdx].label = 'Window end';

      // Map ALL feeds (age >= 0) with their credit — no pre-filter.
      // A bottle fully decays at age = 24 + milkMl/hourlyRate, which varies per bottle size.
      // We keep: all bottles with credit > 0, plus the 3 oldest that have just hit zero,
      // so the table shows the tail of the decay window clearly.
      const mappedRows = [...feeds]
        .map(f => {
          const ageHours = (lastFeed.timestamp - f.timestamp) / 3_600_000;
          if (ageHours < 0) return null;
          const milkMl = waterToMilk(f.volume);
          const creditMl = bottleCredit(ageHours, milkMl, derived.hourlyRate);
          return { ts: f.timestamp, waterMl: f.volume, milkMl, ageHours, creditMl };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => b.ts - a.ts); // most recent first

      // Split: credited rows + the first 3 zero-credit rows after the window
      const creditedRows = mappedRows.filter(r => r.creditMl > 0);
      const exhaustedRows = mappedRows.filter(r => r.creditMl <= 0).slice(0, 3);
      const creditRows = [...creditedRows, ...exhaustedRows].sort((a, b) => b.ts - a.ts);
      const creditTotal = creditedRows.reduce((s, r) => s + r.creditMl, 0);

      setLive({
        smoothedAtLastFeedMl: smoothedTotal,
        dailyTargetMl: derived.dailyTargetMl,
        surplusMl: surplus,
        nextBottleMilkMl,
        nextBottleWaterMl: settings.nextBottleWaterMl ?? 90,
        targetBeforeMl: targetBefore,
        graphStartTs,
        lastFeedTs: lastFeed.timestamp,
        standardTs: p3StandardTs,
        tStarTs: adjustedTs,
        windowEndTs,
        capped,
        p3DeltaMin,
        p3MaxCorrectionMin,
        windowPoints,
        adjustedTs,
        timeFormat: settings.timeFormat,
        useP3: settings.useTargetAwarePredictor !== false,
        maxCorrectionMin: Math.round(p2MaxCorrectionMs / 60_000),
        clampedMin: Math.round(clampedMs / 60_000),
        rawCorrectionMin: Math.round(rawCorrectionMs / 60_000),
        creditRows,
        creditTotal,
        hourlyRate: derived.hourlyRate,
      });
    })();
  }, []);

  // SVG decay graph helpers
  type LiveData = NonNullable<typeof live>;
  function renderGraph(lv: LiveData) {
    const live = lv;
    const W = 320, H = 120, padL = 48, padR = 12, padT = 12, padB = 28;
    const gW = W - padL - padR, gH = H - padT - padB;

    const allSmoothed = live.windowPoints.map((p: WindowPoint) => p.smoothedMl);
    const minY = Math.min(...allSmoothed, live.targetBeforeMl) * 0.97;
    const maxY = Math.max(...allSmoothed) * 1.03;
    const rangeY = maxY - minY || 1;

    const spanMs = live.windowEndTs - live.graphStartTs;

    const tx = (ts: number) => padL + ((ts - live.graphStartTs) / spanMs) * gW;
    const ty = (ml: number) => padT + (1 - (ml - minY) / rangeY) * gH;

    // Smoothed decay path
    const pathD = live.windowPoints.map((p: WindowPoint, i: number) =>
      `${i === 0 ? 'M' : 'L'}${tx(p.ts).toFixed(1)},${ty(p.smoothedMl).toFixed(1)}`
    ).join(' ');

    // Target line y
    const targetY = ty(live.targetBeforeMl);
    const tStarX = tx(live.tStarTs);
    const standardX = tx(live.standardTs);
    const lastFeedX = tx(live.lastFeedTs);

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

        {/* Target-before-feed line */}
        <line x1={padL} y1={targetY} x2={W - padR} y2={targetY} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 2" />
        <text x={W - padR + 2} y={targetY + 3.5} fontSize="7" fill="#f59e0b">target</text>

        {/* Last feed vertical */}
        <line x1={lastFeedX} y1={padT} x2={lastFeedX} y2={padT + gH} stroke="#22d3ee" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
        <text x={lastFeedX} y={padT + gH + 10} textAnchor="middle" fontSize="7" fill="#22d3ee">last</text>

        {/* Standard next time vertical */}
        <line x1={standardX} y1={padT} x2={standardX} y2={padT + gH} stroke="#475569" strokeWidth="1" strokeDasharray="3 2" />
        <text x={standardX} y={padT + gH + 10} textAnchor="middle" fontSize="7" fill="#64748b">std</text>

        {/* Window end vertical */}
        <line x1={W - padR} y1={padT} x2={W - padR} y2={padT + gH} stroke="#334155" strokeWidth="1" />

        {/* T* vertical */}
        {!live.capped && (
          <line x1={tStarX} y1={padT} x2={tStarX} y2={padT + gH} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 2" />
        )}

        {/* Smoothed decay curve */}
        <path d={pathD} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* T* dot */}
        {!live.capped && (() => {
          const tStarSmoothed = live.windowPoints.reduce((best: WindowPoint, p: WindowPoint) =>
            Math.abs(p.ts - live.tStarTs) < Math.abs(best.ts - live.tStarTs) ? p : best
          );
          return <circle cx={tStarX} cy={ty(tStarSmoothed.smoothedMl)} r="3" fill="#3b82f6" />;
        })()}

        {/* Capped end dot */}
        {live.capped && (() => {
          const lastPt = live.windowPoints[live.windowPoints.length - 1];
          return <circle cx={W - padR} cy={ty(lastPt.smoothedMl)} r="3" fill="#f97316" />;
        })()}

        {/* Axis */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + gH} stroke="#475569" strokeWidth="1" />
        <line x1={padL} y1={padT + gH} x2={W - padR} y2={padT + gH} stroke="#475569" strokeWidth="1" />
        <text x={padL} y={padT + gH + 10} textAnchor="middle" fontSize="7" fill="#64748b">{fmtTime(live.graphStartTs, live.timeFormat)}</text>
        {live.capped && (
          <text x={W - padR} y={padT + gH + 10} textAnchor="end" fontSize="7" fill="#f97316">cap</text>
        )}
        {!live.capped && (
          <text x={tStarX} y={padT + gH + 10} textAnchor="middle" fontSize="7" fill="#3b82f6">T*</text>
        )}
      </svg>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 text-slate-300 text-sm leading-relaxed">
      <Link href="/" className="text-blue-400 hover:text-blue-300 text-xs mb-6 block">← Back to dashboard</Link>

      <h1 className="text-2xl font-bold text-slate-100 mb-1">Adjusted next feed</h1>
      <p className="text-slate-400 text-xs mb-6">How the predicted time is calculated</p>

      {live && (
        <>
          {live.useP3 ? (
            <div className="space-y-4 mb-6">
              <h2 className="text-slate-100 font-semibold">Predictor 3 — Optimised</h2>

              {/* Concept */}
              <p>
                After the last feed, the smoothed intake <strong className="text-slate-200">decays</strong> as
                older bottles lose credit. Predictor 3 finds <strong className="text-slate-200">T*</strong> — the
                exact moment when the smoothed value has decayed far enough that giving the next bottle would bring
                the baby back to exactly the daily target.
              </p>
              <div className="bg-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 space-y-0.5">
                <div>smoothed(T*) = dailyTarget − nextBottle</div>
                <div className="text-slate-500 mt-1">= {Math.round(live.dailyTargetMl)} − {Math.round(live.nextBottleMilkMl)} = {Math.round(live.targetBeforeMl)} ml</div>
              </div>

              {/* Decay graph */}
              <div>
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Smoothed intake across the window</p>
                <div className="bg-slate-800 rounded-xl p-3">
                  {renderGraph(live)}
                  <p className="text-xs text-slate-500 mt-2">
                    <span className="text-cyan-400">━</span> Smoothed decay &nbsp;
                    <span className="text-amber-400">- -</span> Target line ({Math.round(live.targetBeforeMl)} ml) &nbsp;
                    {!live.capped && <><span className="text-blue-400">●</span> T*</>}
                    {live.capped && <><span className="text-orange-400">●</span> Cap (window end)</>}
                  </p>
                </div>
              </div>

              {/* Narrative explanation */}
              <div className="bg-slate-800/50 rounded-xl p-4 space-y-3 text-sm">
                {/* What the graph is showing */}
                <p>
                  The graph shows how the smoothed energy level decays after the last feed as older
                  bottles gradually lose credit. The amber dashed line is the{' '}
                  <strong className="text-slate-200">search threshold</strong>: the daily target
                  minus the intended next bottle ({Math.round(live.dailyTargetMl)} − {Math.round(live.nextBottleMilkMl)}{' '}
                  = <strong className="text-amber-300">{Math.round(live.targetBeforeMl)} ml</strong>).
                  T* is the moment the curve crosses that line — meaning the smoothed has decayed far
                  enough that giving the next bottle fills it back up to exactly the daily target.
                </p>

                {/* Core situation */}
                <p>
                  {live.surplusMl >= 0 ? (
                    <>
                      At the last feed, the baby was{' '}
                      <span className="text-yellow-400">
                        {Math.round(live.surplusMl)} ml ahead of the daily target
                      </span>{' '}
                      (smoothed: {Math.round(live.smoothedAtLastFeedMl)} ml, target: {Math.round(live.dailyTargetMl)} ml).
                      We therefore need to wait for the smoothed energy to decay by almost a full
                      intended bottle ({Math.round(live.nextBottleMilkMl)} ml) before feeding again —
                      so that the next bottle brings the baby back to exactly the daily target, not above it.
                    </>
                  ) : (
                    <>
                      At the last feed, the baby was{' '}
                      <span className="text-blue-400">
                        {Math.abs(Math.round(live.surplusMl))} ml below the daily target
                      </span>{' '}
                      (smoothed: {Math.round(live.smoothedAtLastFeedMl)} ml, target: {Math.round(live.dailyTargetMl)} ml).
                      Because the baby is slightly behind, the smoothed needs to decay by a little less than
                      a full bottle before the threshold is reached — so the next bottle will overshoot slightly
                      and bring the baby right back up to target.
                    </>
                  )}
                </p>

                {/* Result */}
                {live.smoothedAtLastFeedMl <= live.targetBeforeMl ? (
                  <p>
                    The smoothed is <em>already</em> at or below the search threshold
                    ({Math.round(live.targetBeforeMl)} ml) — T* is now. The adjusted feed time
                    is <strong className="text-blue-300">{fmtTime(live.tStarTs, live.timeFormat)}</strong>.
                  </p>
                ) : !live.capped ? (
                  <p>
                    The curve reaches the threshold at{' '}
                    <strong className="text-blue-300">{fmtTime(live.tStarTs, live.timeFormat)}</strong>{' '}
                    —{' '}
                    {live.p3DeltaMin === 0 ? (
                      <>exactly at the standard interval for a {live.nextBottleWaterMl} ml bottle.</>
                    ) : live.p3DeltaMin < 0 ? (
                      <>
                        <strong className="text-blue-300">{Math.abs(live.p3DeltaMin)} min earlier</strong>{' '}
                        than the standard interval, because the baby was slightly behind target and the
                        threshold was reached a little sooner.
                      </>
                    ) : (
                      <>
                        <strong className="text-yellow-300">{live.p3DeltaMin} min later</strong>{' '}
                        than the standard interval, because the baby was ahead of target and needed
                        more time to decay down to the threshold.
                      </>
                    )}
                  </p>
                ) : (
                  <p>
                    The curve <strong className="text-orange-400">does not reach the threshold</strong>{' '}
                    within the allowed window (standard ±{live.p3MaxCorrectionMin} min). The baby is
                    well ahead of target — the smoothed is decaying too slowly. P3 waits as long as
                    the cap allows and sets T* at the window end:{' '}
                    <strong className="text-orange-300">{fmtTime(live.tStarTs, live.timeFormat)}</strong>.
                  </p>
                )}

                {/* Window endpoint summary */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700 text-xs text-center">
                  <div>
                    <div className="text-slate-500 mb-0.5">Last feed</div>
                    <div className="text-slate-300 font-mono">{fmtTime(live.lastFeedTs, live.timeFormat)}</div>
                    <div className="text-slate-500">{Math.round(live.smoothedAtLastFeedMl)} ml</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">{live.capped ? 'Cap (T*)' : 'T*'}</div>
                    <div className={`font-mono font-semibold ${live.capped ? 'text-orange-300' : 'text-blue-300'}`}>{fmtTime(live.tStarTs, live.timeFormat)}</div>
                    <div className="text-slate-500">
                      {live.p3DeltaMin === 0 ? 'on standard' : live.p3DeltaMin > 0 ? `+${live.p3DeltaMin}m` : `${live.p3DeltaMin}m`}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">Window end</div>
                    <div className="text-slate-300 font-mono">{fmtTime(live.windowEndTs, live.timeFormat)}</div>
                    <div className="text-slate-500">std +{live.p3MaxCorrectionMin}m</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              <h2 className="text-slate-100 font-semibold">Predictor 2 — Adjusted</h2>
              <p>
                Compares the smoothed 24h intake to the daily target. The difference
                is translated into a time correction that shifts the standard next feed time earlier or later.
              </p>
              <div className="bg-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 whitespace-pre">{`surplus    = smoothed − dailyTarget
correction = surplus / hourlyRate  (capped ±${live.maxCorrectionMin} min)
adjusted   = standard + correction`}</div>

              <div className={`rounded-xl border p-4 mt-2 ${live.surplusMl >= 0 ? 'border-yellow-700/50 bg-yellow-900/10' : 'border-blue-700/50 bg-blue-900/10'}`}>
                <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Current situation</div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{live.surplusMl >= 0 ? 'Overfed by' : 'Underfed by'}</span>
                    <span className={`font-semibold ${live.surplusMl >= 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {Math.abs(Math.round(live.surplusMl))} ml
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Time correction</span>
                    <span className={`font-semibold tabular-nums ${live.rawCorrectionMin > 0 ? 'text-yellow-400' : live.rawCorrectionMin < 0 ? 'text-blue-400' : 'text-green-400'}`}>
                      {live.rawCorrectionMin === 0 ? 'none' : live.rawCorrectionMin > 0 ? `+${live.rawCorrectionMin} min` : `${live.rawCorrectionMin} min`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cap (±{live.maxCorrectionMin} min)</span>
                    <span className={`font-semibold ${Math.abs(live.rawCorrectionMin) > live.maxCorrectionMin ? 'text-orange-400' : 'text-slate-500'}`}>
                      {Math.abs(live.rawCorrectionMin) > live.maxCorrectionMin ? `applied → ${live.clampedMin > 0 ? '+' : ''}${live.clampedMin} min` : 'not needed'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-700">
                    <span className="text-slate-300 font-medium">Adjusted next feed</span>
                    <span className="text-blue-300 font-bold">
                      {formatDateTime(live.adjustedTs, live.timeFormat)}{' '}
                      <span className="text-slate-500 font-normal text-xs">{fmtRel(live.adjustedTs, now)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!live && <p className="text-slate-400">Loading…</p>}

      {/* Feed credit table */}
      {live && (
        <div className="mt-4">
          <h3 className="text-slate-100 font-semibold mb-1 text-sm">Bottles in the smoothed calculation</h3>
          <p className="text-xs text-slate-500 mb-2">
            Credits frozen at the last feed ({fmtTime(live.lastFeedTs, live.timeFormat)}).
            Hourly rate: {live.hourlyRate.toFixed(1)} ml/h.
          </p>
          {live.creditRows.length === 0 ? (
            <p className="text-sm text-slate-500">No bottles with remaining credit.</p>
          ) : (
            <div className="bg-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700">
                    <th className="text-left font-normal px-3 py-2">Time</th>
                    <th className="text-right font-normal px-3 py-2">Water</th>
                    <th className="text-right font-normal px-3 py-2">Formula</th>
                    <th className="text-right font-normal px-3 py-2">Age</th>
                    <th className="text-right font-normal px-3 py-2">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {live.creditRows.map((r, i) => {
                    const zero = r.creditMl <= 0;
                    const full = !zero && r.ageHours < 24;
                    const partial = !zero && !full;
                    const h = Math.floor(r.ageHours);
                    const m = Math.round((r.ageHours - h) * 60);
                    return (
                      <tr key={i} className={`border-t border-slate-700/50 ${zero ? 'opacity-40' : ''}`}>
                        <td className="px-3 py-1.5 text-slate-300">{fmtTime(r.ts, live.timeFormat)}</td>
                        <td className="px-3 py-1.5 text-right text-slate-400">{r.waterMl} ml</td>
                        <td className="px-3 py-1.5 text-right text-slate-300">{r.milkMl.toFixed(0)} ml</td>
                        <td className={`px-3 py-1.5 text-right ${r.ageHours >= 24 ? 'text-amber-400' : 'text-slate-300'}`}>
                          {h}h {m}m
                        </td>
                        <td className={`px-3 py-1.5 text-right font-semibold ${
                          full ? 'text-green-400' : partial ? 'text-amber-400' : 'text-slate-600'
                        }`}>
                          {zero ? '0 ml — exhausted' : `${r.creditMl.toFixed(0)} ml`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-600">
                    <td colSpan={4} className="px-3 py-2 text-slate-300 font-semibold">Total smoothed</td>
                    <td className="px-3 py-2 text-right text-white font-bold">{live.creditTotal.toFixed(0)} ml</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="text-xs text-slate-600 mt-2">
            <span className="text-green-400">Green</span> = full credit (age ≤ 24h)  
            <span className="text-amber-400">Amber</span> = partial credit (age &gt; 24h, decaying at {live.hourlyRate.toFixed(1)} ml/h)
          </p>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl p-4 mt-4">
        <p className="text-slate-500 text-xs">
          You can switch between Predictor 2 and Predictor 3 in Settings.
          Predictor 3 (default) guarantees zero surplus after the next feed if the cap allows it.
        </p>
      </div>
    </div>
  );
}
