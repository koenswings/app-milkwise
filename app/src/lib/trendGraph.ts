import { Feed } from "@/types";
import { waterToMilk } from "@/lib/calculations";
import { WeightEntry, dailyTargetAtTime } from "@/lib/weights";

export interface TrendPoint {
  t: number;
  s: number;        // smoothed intake ml
  surplus: number;  // smoothed - dailyTarget(t) — positive = overfed, negative = underfed
  dailyTarget: number;
}

/** Compute smoothed intake at time t using all feeds */
export function smoothedAtTime(feeds: Feed[], t: number, hourlyRate: number): number {
  return feeds.reduce((sum, f) => {
    const age = (t - f.timestamp) / 3_600_000;
    if (age < 0) return sum;
    const milk = waterToMilk(f.volume);
    return sum + (age <= 24 ? milk : Math.max(0, milk - hourlyRate * (age - 24)));
  }, 0);
}

/** Build trend points: one per feed in the window, surplus relative to weight-at-time */
export function buildTrendPoints(
  feeds: Feed[],
  weights: WeightEntry[],
  mlPerKgPerDay: number,
  fallbackWeight: number,
  windowMs: number,
  now: number
): TrendPoint[] {
  const T_START = now - windowMs;
  return feeds
    .filter(f => f.timestamp >= T_START && f.timestamp <= now)
    .map(f => {
      const target = dailyTargetAtTime(f.timestamp, weights, mlPerKgPerDay, fallbackWeight);
      const hr = target / 24;
      const s = smoothedAtTime(feeds, f.timestamp, hr);
      return { t: f.timestamp, s, surplus: s - target, dailyTarget: target };
    });
}

/** Draw the trend graph onto a canvas 2d context.
 * Y axis = surplus ml (smoothed − dailyTarget). Zero line = target. */
export function drawTrendGraph(
  ctx: CanvasRenderingContext2D,
  pts: TrendPoint[],
  now: number,
  windowMs: number,
  dailyTargetMl: number,   // used for zone sizing (pct of current target)
  yellowPct: number,
  redPct: number,
  opts: { showLegend?: boolean; dayLabelFormat?: 'short' | 'date' } = {}
) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const LEGEND_H = opts.showLegend ? 22 : 0;
  const PAD_L = 44, PAD_R = 12, PAD_T = 18, PAD_B = 28 + LEGEND_H;
  const plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;

  if (pts.length < 2) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Not enough data', W / 2, H / 2);
    return;
  }

  const T_END = now, T_START = now - windowMs;

  // Y axis = surplus (0 = target). Zones are ±ml based on current dailyTargetMl.
  const yGreen = dailyTargetMl * (yellowPct / 100);
  const yRed   = dailyTargetMl * (redPct   / 100);
  const surpluses = pts.map(p => p.surplus);
  const surplusMax = Math.max(...surpluses, yRed + 20);
  const surplusMin = Math.min(...surpluses, -(yRed + 20));
  const spread = Math.max(Math.abs(surplusMax), Math.abs(surplusMin)) + 20;
  const S_MIN = -spread;
  const S_MAX = spread;

  const tx = (t: number) => PAD_L + ((t - T_START) / (T_END - T_START)) * plotW;
  // ty maps surplus value (0 = midpoint)
  const ty = (surplus: number) => PAD_T + (1 - (surplus - S_MIN) / (S_MAX - S_MIN)) * plotH;

  const tyTarget = ty(0);          // zero line = green
  const tyGreenTop = ty(yGreen);   // +yellowPct%
  const tyGreenBot = ty(-yGreen);  // -yellowPct%
  const tyRedTop   = ty(yRed);     // +redPct%

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, W, H);

  // Red zone top (overfed >redPct%)
  ctx.fillStyle = 'rgba(248,113,113,0.18)';
  ctx.fillRect(PAD_L, PAD_T, plotW, tyRedTop - PAD_T);

  // Yellow/orange zone (yellowPct < x < redPct, overfed)
  ctx.fillStyle = 'rgba(251,191,36,0.12)';
  ctx.fillRect(PAD_L, tyRedTop, plotW, tyGreenTop - tyRedTop);

  // Green zone (±yellowPct)
  ctx.fillStyle = 'rgba(74,222,128,0.18)';
  ctx.fillRect(PAD_L, tyGreenTop, plotW, tyGreenBot - tyGreenTop);

  // Yellow/blue zone (yellowPct < x < redPct, underfed) — symmetric height
  const yellowZoneH = tyGreenTop - tyRedTop; // same height as top yellow
  ctx.fillStyle = 'rgba(96,165,250,0.12)';
  ctx.fillRect(PAD_L, tyGreenBot, plotW, yellowZoneH);

  // Blue zone (underfed >redPct%) — same height as top red zone
  const redZoneH = tyRedTop - PAD_T;
  ctx.fillStyle = 'rgba(96,165,250,0.22)';
  ctx.fillRect(PAD_L, tyGreenBot + yellowZoneH, plotW, redZoneH);

  // Zone boundary lines
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1;
  for (const [yy, col] of [
    [tyGreenTop, '#4ade8040'], [tyGreenBot, '#4ade8040'],
    [tyRedTop, '#f8717140'], [ty(dailyTargetMl - yRed), '#60a5fa40'],
  ] as [number, string][]) {
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.moveTo(PAD_L, yy); ctx.lineTo(PAD_L + plotW, yy); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Zero line (target — always solid green)
  ctx.strokeStyle = '#4ade8099';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(PAD_L, tyTarget); ctx.lineTo(PAD_L + plotW, tyTarget); ctx.stroke();
  ctx.fillStyle = '#4ade80'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('0', PAD_L - 3, tyTarget + 3);

  // Day separators
  const dayMs = 24 * 3_600_000;
  const nDays = Math.ceil(windowMs / dayMs);
  const tickEvery = nDays > 14 ? 7 : nDays > 7 ? 2 : 1;
  let count = 0;
  for (let t = Math.ceil(T_START / dayMs) * dayMs; t <= T_END; t += dayMs) {
    count++;
    if (count % tickEvery !== 0) continue;
    const x = tx(t);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + plotH); ctx.stroke();
    ctx.setLineDash([]);
    const d = new Date(t);
    const label = opts.dayLabelFormat === 'date'
      ? d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      : d.toLocaleDateString([], { weekday: 'short' });
    ctx.fillStyle = '#475569'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(label, x, PAD_T + plotH + 12);
  }

  // Y axis labels (surplus scale)
  ctx.fillStyle = '#475569'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
  for (const v of [-Math.round(spread * 0.7), Math.round(spread * 0.7)]) {
    const yy = ty(v);
    if (yy >= PAD_T && yy <= PAD_T + plotH)
      ctx.fillText(`${v > 0 ? '+' : ''}${v}`, PAD_L - 3, yy + 3);
  }

  // Centripetal Catmull-Rom spline (alpha=0.5) — eliminates overshoots with unequal spacing.
  // Standard Catmull-Rom (alpha=0) overshoots badly when consecutive points are close in time
  // but far apart in surplus value. Centripetal parameterisation scales the tangent by the
  // chord length, which prevents the curve from going outside the convex hull of the data.
  const n = pts.length;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(tx(pts[0].t), ty(pts[0].surplus));
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    // Chord lengths in screen space (centripetal: alpha=0.5 → sqrt of distance)
    const d01 = Math.sqrt(Math.hypot(tx(p1.t) - tx(p0.t), ty(p1.surplus) - ty(p0.surplus))) || 1;
    const d12 = Math.sqrt(Math.hypot(tx(p2.t) - tx(p1.t), ty(p2.surplus) - ty(p1.surplus))) || 1;
    const d23 = Math.sqrt(Math.hypot(tx(p3.t) - tx(p2.t), ty(p3.surplus) - ty(p2.surplus))) || 1;
    // Centripetal tangents scaled by chord lengths
    const m1x = (tx(p2.t) - tx(p0.t)) * d12 / (d01 + d12) / 3;
    const m1y = (ty(p2.surplus) - ty(p0.surplus)) * d12 / (d01 + d12) / 3;
    const m2x = (tx(p3.t) - tx(p1.t)) * d12 / (d12 + d23) / 3;
    const m2y = (ty(p3.surplus) - ty(p1.surplus)) * d12 / (d12 + d23) / 3;
    const cp1x = tx(p1.t) + m1x;
    const cp1y = ty(p1.surplus) + m1y;
    const cp2x = tx(p2.t) - m2x;
    const cp2y = ty(p2.surplus) - m2y;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tx(p2.t), ty(p2.surplus));
  }
  ctx.stroke();

  // Dots — colour by surplus relative to zones
  pts.forEach(p => {
    const absSurplus = Math.abs(p.surplus);
    const zoneGreen = p.dailyTarget * (yellowPct / 100);
    const zoneRed   = p.dailyTarget * (redPct   / 100);
    const col = absSurplus <= zoneGreen ? '#4ade80'
              : absSurplus <= zoneRed   ? '#facc15'
              : p.surplus > 0           ? '#f87171' : '#60a5fa';
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(tx(p.t), ty(p.surplus), 3.5, 0, Math.PI * 2); ctx.fill();
  });

  // Y axis line
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(PAD_L, PAD_T); ctx.lineTo(PAD_L, PAD_T + plotH); ctx.stroke();

  // Legend
  if (opts.showLegend) {
    const ly = H - LEGEND_H + 4;
    const items: [string, string][] = [
      ['#f87171', 'overfed'], ['#facc15', `±${redPct}%`],
      ['#4ade80', `on target ±${yellowPct}%`],
      ['#60a5fa', 'underfed'],
    ];
    let lx = PAD_L;
    ctx.font = '9px sans-serif';
    items.forEach(([col, label]) => {
      ctx.fillStyle = col;
      ctx.fillRect(lx, ly, 8, 8);
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText(label, lx + 10, ly + 7);
      lx += ctx.measureText(label).width + 22;
    });
  }
}
