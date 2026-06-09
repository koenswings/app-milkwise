"use client";

import { useEffect, useState, useCallback } from "react";
import { getFeeds, getSettings, exportCsv } from "@/lib/store";
import {
  dailyTotals,
  avgIntervalHours,
  consistencyScore,
  periodTotal,
  deriveSettings,
} from "@/lib/calculations";
import { Feed, Settings, DerivedSettings } from "@/types";
import { useRef } from "react";
import { buildTrendPoints, drawTrendGraph } from "@/lib/trendGraph";
import { WeightEntry } from "@/lib/weights";
import { getWeights } from "@/lib/store";
import BottomNav from "@/components/BottomNav";

function TrendCanvas({ feeds, weights, days, dailyTargetMl, mlPerKgPerDay, fallbackWeight, yellowPct, redPct }: {
  feeds: Feed[]; weights: WeightEntry[]; days: number; dailyTargetMl: number;
  mlPerKgPerDay: number; fallbackWeight: number;
  yellowPct: number; redPct: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const now = Date.now();
  const windowMs = days * 24 * 3_600_000;
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pts = buildTrendPoints(feeds, weights, mlPerKgPerDay, fallbackWeight, windowMs, now);
    drawTrendGraph(ctx, pts, now, windowMs, dailyTargetMl, yellowPct, redPct,
      { showLegend: true, dayLabelFormat: days > 7 ? 'date' : 'short' });
  }, [feeds, weights, days, dailyTargetMl, mlPerKgPerDay, fallbackWeight, yellowPct, redPct]);
  return <canvas ref={canvasRef} width={560} height={220} className="w-full rounded-lg" style={{ imageRendering: 'crisp-edges' }} />;
}

export default function AnalyticsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [derived, setDerived] = useState<DerivedSettings | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [days, setDays] = useState(7);
  const [showConsistencyInfo, setShowConsistencyInfo] = useState(false);

  const load = useCallback(async () => {
    const [f, s, w] = await Promise.all([getFeeds(), getSettings(), getWeights()]);
    setFeeds(f);
    setSettings(s);
    setDerived(deriveSettings(s));
    setWeights(w);
  }, []);

  useEffect(() => {
    load();
    // Reload when navigating back from Settings (focus event)
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  if (!settings || !derived) {
    return <div className="flex items-center justify-center h-screen"><div className="text-slate-400">Loading…</div></div>;
  }

  const avgInterval = avgIntervalHours(feeds);
  const consistency = consistencyScore(feeds);
  const total3 = periodTotal(feeds, 3);
  const total7 = periodTotal(feeds, 7);
  const total14 = periodTotal(feeds, 14);

  // Average surplus over selected period using weight-at-time
  const windowMs = days * 24 * 3_600_000;
  const now = Date.now();
  const trendPts = buildTrendPoints(feeds, weights, settings.mlPerKgPerDay, settings.weightKg, windowMs, now);
  const avgSurplusMl = trendPts.length > 0
    ? trendPts.reduce((sum, p) => sum + p.surplus, 0) / trendPts.length
    : 0;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">📊 Analytics</h1>

      {/* Trend chart */}
      <div className="bg-slate-800 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">Smoothed intake trend</h2>
          <div className="flex gap-1">
            {[7,30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1 rounded text-sm ${days === d ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <TrendCanvas feeds={feeds} weights={weights} days={days}
          dailyTargetMl={derived.dailyTargetMl}
          mlPerKgPerDay={settings.mlPerKgPerDay} fallbackWeight={settings.weightKg}
          yellowPct={settings.yellowThresholdPct} redPct={settings.redThresholdPct} />
        <p className="text-xs text-slate-500 mt-1">
          Each dot = smoothed intake at time of bottle. Curve interpolated through dots.
          Green zone = ±{settings.yellowThresholdPct}% of target.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Avg interval</div>
          <div className="text-xl font-bold text-slate-100">
            {avgInterval !== null ? `${avgInterval.toFixed(1)}h` : "—"}
          </div>
          <div className="text-xs text-slate-500">ideal: {derived.idealIntervalHours.toFixed(1)}h</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 relative">
          <div className="text-xs text-slate-400 mb-1">Consistency (σ)</div>
          <div className={`text-xl font-bold ${
            consistency === null ? "text-slate-100" :
            consistency < 0.5 ? "text-green-400" :
            consistency < 1.5 ? "text-yellow-400" : "text-red-400"
          }`}>
            {consistency !== null ? `${consistency.toFixed(2)}h` : "—"}
          </div>
          <button
            onClick={() => setShowConsistencyInfo(true)}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs font-bold flex items-center justify-center"
          >
            ?
          </button>
          <div className="text-xs text-slate-500">lower = more consistent</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Avg {days}d surplus</div>
          <div className={`text-xl font-bold ${avgSurplusMl > 5 ? 'text-yellow-400' : avgSurplusMl < -5 ? 'text-blue-400' : 'text-green-400'}`}>
            {avgSurplusMl >= 0 ? '+' : ''}{Math.round(avgSurplusMl)} ml
          </div>
          <div className="text-xs text-slate-500">{avgSurplusMl > 5 ? 'overfed on avg' : avgSurplusMl < -5 ? 'underfed on avg' : 'on target'}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Total feeds</div>
          <div className="text-xl font-bold text-slate-100">{feeds.length}</div>
          <div className="text-xs text-slate-500">all time</div>
        </div>
      </div>

      {/* Period totals */}
      <div className="bg-slate-800 rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Period Totals</h2>
        <div className="space-y-2">
          {[{ label: "Last 3 days", ml: total3 }, { label: "Last 7 days", ml: total7 }, { label: "Last 14 days", ml: total14 }].map(({ label, ml }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-sm text-slate-400">{label}</span>
              <span className="text-sm font-semibold text-slate-100">{Math.round(ml)} ml</span>
            </div>
          ))}
        </div>
      </div>

      {/* Consistency explainer modal */}
      {showConsistencyInfo && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowConsistencyInfo(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-100">What is Consistency (σ)?</h2>
              <button onClick={() => setShowConsistencyInfo(false)} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">×</button>
            </div>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <section>
                <h3 className="font-semibold text-slate-100 mb-1">What it measures</h3>
                <p>
                  Consistency tells you how <strong>regular</strong> the gaps between feeds are.
                  A low number means feeds happen at roughly the same intervals — predictable and steady.
                  A high number means the gaps vary a lot — sometimes very short, sometimes very long.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-slate-100 mb-1">How it&apos;s calculated</h3>
                <p>
                  We look at the time gap between each pair of feeds. Then we measure how much those
                  gaps <em>vary</em> from the average gap. The more they spread out, the higher the number.
                </p>
                <div className="bg-slate-700/60 rounded-lg p-3 mt-2 text-xs text-slate-400">
                  <strong className="text-slate-300">Example:</strong><br />
                  Gaps: 2.0h, 2.1h, 1.9h, 2.0h → very consistent → low σ (e.g. 0.07h)<br />
                  Gaps: 1.0h, 3.5h, 1.2h, 4.0h → irregular → high σ (e.g. 1.3h)
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-slate-100 mb-1">What&apos;s a good score?</h3>
                <p>
                  There&apos;s no strict rule — every baby is different. As a rough guide:
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex gap-2"><span className="text-green-400 font-semibold w-16">&lt; 0.5h</span><span>Very regular feeding rhythm 🟢</span></div>
                  <div className="flex gap-2"><span className="text-yellow-400 font-semibold w-16">0.5–1.5h</span><span>Normal variation, nothing to worry about 🟡</span></div>
                  <div className="flex gap-2"><span className="text-red-400 font-semibold w-16">&gt; 1.5h</span><span>Wide variation — some feeds very close, some very far apart 🔴</span></div>
                </div>
              </section>

              {avgInterval !== null && consistency !== null && (
                <section>
                  <h3 className="font-semibold text-slate-100 mb-1">Your numbers</h3>
                  <div className="bg-slate-700/40 rounded-lg p-3 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-300">
                      <span>Average gap between feeds</span>
                      <span className="font-semibold">{avgInterval.toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Consistency score (σ)</span>
                      <span className={`font-bold ${
                        consistency < 0.5 ? "text-green-400" :
                        consistency < 1.5 ? "text-yellow-400" : "text-red-400"
                      }`}>{consistency.toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Ideal interval</span>
                      <span className="font-semibold">{derived.idealIntervalHours.toFixed(2)}h</span>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <button
              onClick={() => setShowConsistencyInfo(false)}
              className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-3 rounded-xl transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Export */}
      <button
        onClick={() => exportCsv(feeds)}
        className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-3 rounded-xl transition-colors"
      >
        📥 Export CSV
      </button>

      <BottomNav />
    </div>
  );
}
