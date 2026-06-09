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

function WeightChart({ weights }: { weights: WeightEntry[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || weights.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    const PAD_L = 52, PAD_R = 16, PAD_T = 30, PAD_B = 44;
    const plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;

    const sorted = [...weights].sort((a, b) => a.timestamp - b.timestamp);
    const T_START = sorted[0].timestamp;
    const T_END = sorted[sorted.length - 1].timestamp + 86_400_000; // +1 day
    const wMin = Math.min(...sorted.map(w => w.weightKg)) - 0.1;
    const wMax = Math.max(...sorted.map(w => w.weightKg)) + 0.1;

    const tx = (t: number) => PAD_L + ((t - T_START) / (T_END - T_START)) * plotW;
    const ty = (w: number) => PAD_T + (1 - (w - wMin) / (wMax - wMin)) * plotH;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, W, H);

    // Grid
    for (let w = Math.ceil(wMin * 10) / 10; w <= wMax; w = Math.round((w + 0.1) * 10) / 10) {
      const y = ty(w);
      ctx.strokeStyle = '#ffffff15'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(PAD_L + plotW, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#475569'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(w.toFixed(2), PAD_L - 4, y + 3);
    }

    // Month labels
    const range = T_END - T_START;
    const tickMs = range > 30 * 86_400_000 ? 7 * 86_400_000 : 86_400_000;
    for (let t = Math.ceil(T_START / tickMs) * tickMs; t <= T_END; t += tickMs) {
      const x = tx(t);
      ctx.strokeStyle = '#ffffff10'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + plotH); ctx.stroke();
      ctx.fillStyle = '#475569'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }), x, PAD_T + plotH + 14);
    }

    // Smooth curve (Catmull-Rom)
    const n = sorted.length;
    if (n >= 2) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(tx(sorted[0].timestamp), ty(sorted[0].weightKg));
      for (let i = 0; i < n - 1; i++) {
        const p0 = sorted[Math.max(0, i-1)], p1 = sorted[i],
              p2 = sorted[i+1], p3 = sorted[Math.min(n-1, i+2)];
        const cp1x = tx(p1.timestamp) + (tx(p2.timestamp) - tx(p0.timestamp)) / 6;
        const cp1y = ty(p1.weightKg) + (ty(p2.weightKg) - ty(p0.weightKg)) / 6;
        const cp2x = tx(p2.timestamp) - (tx(p3.timestamp) - tx(p1.timestamp)) / 6;
        const cp2y = ty(p2.weightKg) - (ty(p3.weightKg) - ty(p1.weightKg)) / 6;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tx(p2.timestamp), ty(p2.weightKg));
      }
      ctx.stroke();
    }

    // Dots + labels
    sorted.forEach(w => {
      const x = tx(w.timestamp), y = ty(w.weightKg);
      ctx.fillStyle = '#34d399';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${w.weightKg} kg`, x, y - 8);
    });

    // Axes
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD_L, PAD_T); ctx.lineTo(PAD_L, PAD_T + plotH);
    ctx.moveTo(PAD_L, PAD_T + plotH); ctx.lineTo(PAD_L + plotW, PAD_T + plotH);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Weight over time', W / 2, 20);
    ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif';
    ctx.fillText('kg', PAD_L - 36, PAD_T + plotH / 2);
  }, [weights]);

  if (weights.length === 0) return (
    <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400 mb-4">No weight entries yet. Use the ⚖️ button on the dashboard.</div>
  );

  return (
    <div className="bg-slate-800 rounded-xl p-4 mb-4">
      <canvas ref={canvasRef} width={560} height={260}
        className="w-full rounded-lg" style={{ imageRendering: 'crisp-edges' }} />
      <p className="text-xs text-slate-500 mt-1">{weights.length} weight entr{weights.length === 1 ? 'y' : 'ies'} recorded. Add more from the dashboard ⚖️ button.</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [derived, setDerived] = useState<DerivedSettings | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [days, setDays] = useState(7);
  const [analyticsTab, setAnalyticsTab] = useState<'intake'|'weight'>('intake');
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-100">📊 Analytics</h1>
        <div className="flex gap-1">
          <button onClick={() => setAnalyticsTab('intake')} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${analyticsTab==='intake' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Intake</button>
          <button onClick={() => setAnalyticsTab('weight')} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${analyticsTab==='weight' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Weight</button>
        </div>
      </div>

      {analyticsTab === 'weight' && (
        <WeightChart weights={weights} />
      )}

      {analyticsTab === 'intake' && <>
      {/* Trend chart */}
      <div className="bg-slate-800 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">Energy surplus / deficit</h2>
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

      </> }

      <BottomNav />
    </div>
  );
}
