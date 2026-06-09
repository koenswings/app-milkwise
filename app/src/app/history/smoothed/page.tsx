"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { getFeeds, getSettings } from "@/lib/store";
import { deriveSettings, smoothedEffective, waterToMilk } from "@/lib/calculations";
import { Feed, Settings, DerivedSettings } from "@/types";

function bottleCredit(ageHours: number, milkMl: number, hourlyRate: number): number {
  if (ageHours <= 24) return milkMl;
  return Math.max(0, milkMl - hourlyRate * (ageHours - 24));
}

function smoothedAt(feeds: Feed[], t: number, hourlyRate: number): number {
  return feeds.reduce((sum, f) => {
    const age = (t - f.timestamp) / 3_600_000;
    return age < 0 ? sum : sum + bottleCredit(age, waterToMilk(f.volume), hourlyRate);
  }, 0);
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SmoothedHistoryPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [derived, setDerived] = useState<DerivedSettings | null>(null);
  const [now] = useState(Date.now());

  useEffect(() => {
    (async () => {
      const [f, s] = await Promise.all([getFeeds(), getSettings()]);
      setFeeds(f.sort((a, b) => a.timestamp - b.timestamp));
      setSettings(s);
      setDerived(deriveSettings(s));
    })();
  }, []);

  useEffect(() => {
    if (!feeds.length || !derived || !settings || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    const PAD_L = 55, PAD_R = 20, PAD_T = 30, PAD_B = 50;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    const T_END = now;
    const T_START = now - 3 * 24 * 3_600_000; // 3 days back
    const dailyTarget = derived.dailyTargetMl;
    const hr = derived.hourlyRate;

    // Sample every 15 minutes
    const stepMs = 15 * 60 * 1000;
    const nPoints = Math.floor((T_END - T_START) / stepMs) + 1;
    const times = Array.from({ length: nPoints }, (_, i) => T_START + i * stepMs);
    const values = times.map(t => smoothedAt(feeds, t, hr));

    const S_MAX = Math.max(dailyTarget * 1.3, ...values) + 50;
    const S_MIN = 0;

    const tx = (t: number) => PAD_L + ((t - T_START) / (T_END - T_START)) * plotW;
    const ty = (s: number) => PAD_T + (1 - (s - S_MIN) / (S_MAX - S_MIN)) * plotH;

    // Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, W, H);

    // Overfed / underfed regions
    const targetY = ty(dailyTarget);
    ctx.fillStyle = 'rgba(249,115,22,0.08)';
    ctx.fillRect(PAD_L, PAD_T, plotW, targetY - PAD_T);
    ctx.fillStyle = 'rgba(96,165,250,0.08)';
    ctx.fillRect(PAD_L, targetY, plotW, PAD_T + plotH - targetY);

    // Day separators
    const dayMs = 24 * 3_600_000;
    for (let t = Math.ceil(T_START / dayMs) * dayMs; t <= T_END; t += dayMs) {
      const x = tx(t);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + plotH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#475569';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fmtDate(t), x, PAD_T + plotH + 14);
    }

    // Target line
    ctx.strokeStyle = '#4ade8080';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.beginPath(); ctx.moveTo(PAD_L, targetY); ctx.lineTo(PAD_L + plotW, targetY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#4ade80';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(dailyTarget)} ml`, PAD_L + 4, targetY - 4);

    // Y axis labels
    for (let s = 0; s <= S_MAX; s += 200) {
      const y = ty(s);
      if (y < PAD_T || y > PAD_T + plotH) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(PAD_L + plotW, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#475569';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(s), PAD_L - 5, y + 4);
    }

    // Smoothed curve
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    times.forEach((t, i) => {
      const x = tx(t), y = ty(values[i]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Feed dots
    const visibleFeeds = feeds.filter(f => f.timestamp >= T_START && f.timestamp <= T_END);
    visibleFeeds.forEach(f => {
      const x = tx(f.timestamp);
      const s = smoothedAt(feeds, f.timestamp + 1000, hr);
      const y = ty(s);
      ctx.fillStyle = '#34d399';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    });

    // Axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD_L, PAD_T); ctx.lineTo(PAD_L, PAD_T + plotH);
    ctx.moveTo(PAD_L, PAD_T + plotH); ctx.lineTo(PAD_L + plotW, PAD_T + plotH);
    ctx.stroke();

    // Y label
    ctx.save();
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.translate(14, PAD_T + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Smoothed intake (ml)', 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Last 3 days', W / 2, 18);

  }, [feeds, derived, settings, now]);

  const lastFeed = feeds.length ? feeds[feeds.length - 1] : null;
  const smoothedNow = derived && lastFeed
    ? smoothedAt(feeds, lastFeed.timestamp, derived.hourlyRate)
    : null;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <Link href="/" className="text-blue-400 hover:text-blue-300 text-xs mb-4 block">← Back to dashboard</Link>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Smoothed intake — 3 days</h1>
      {settings && derived && (
        <p className="text-xs text-slate-400 mb-4">
          Target: {Math.round(derived.dailyTargetMl)} ml/day &middot; {settings.weightKg} kg &middot; decay {derived.hourlyRate.toFixed(1)} ml/h
          {smoothedNow !== null && (
            <span className={` font-semibold ml-2 ${smoothedNow >= derived.dailyTargetMl ? 'text-yellow-400' : 'text-blue-400'}`}>
              &middot; current {Math.round(smoothedNow)} ml ({Math.round(smoothedNow / derived.dailyTargetMl * 100)}%)
            </span>
          )}
        </p>
      )}
      <canvas
        ref={canvasRef}
        width={600}
        height={320}
        className="w-full rounded-xl border border-slate-700"
        style={{ imageRendering: 'crisp-edges' }}
      />
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <span><span className="inline-block w-3 h-0.5 bg-yellow-400/50 mr-1" />above target = surplus</span>
        <span><span className="inline-block w-3 h-0.5 bg-blue-400/50 mr-1" />below target = deficit</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1" />bottle given</span>
      </div>
    </div>
  );
}
