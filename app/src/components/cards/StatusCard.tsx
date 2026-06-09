"use client";

import SwipeableCard from "@/components/SwipeableCard";
import { waterToMilk } from "@/lib/calculations";
import { Feed } from "@/types";
import Link from "next/link";

interface Props {
  strict24h: number;
  strictPct: number;
  smoothedMl: number;
  smoothedPct: number;
  dailyTargetMl: number;
  standardBottleVolume: number;
  yellowThresholdPct: number;
  redThresholdPct: number;
  onStrictExplain: () => void;
  onSmoothedExplain: () => void;
  feeds: Feed[];
  now: number;
}

function colorClass(pct: number, y: number, r: number) {
  const d = Math.abs(pct - 100);
  if (d <= y) return "text-green-400";
  if (d <= r) return "text-yellow-400";
  return "text-red-400";
}
function bgBorder(pct: number, y: number, r: number) {
  const d = Math.abs(pct - 100);
  if (d <= y) return "bg-green-900/20 border-green-700/40";
  if (d <= r) return "bg-yellow-900/20 border-yellow-700/40";
  return "bg-red-900/20 border-red-700/40";
}
function statusText(pct: number, y: number, r: number) {
  const d = Math.abs(pct - 100);
  if (d <= y) return "on track";
  if (pct > 100) return d <= r ? "slightly over" : "overfed ⚠️";
  return d <= r ? "slightly behind" : "behind ⚠️";
}

function Panel({ label, ml, pct, milkPerBottle, standardBottleVolume, y, r, onExplain, feeds24h }:
  { label: string; ml: number; pct: number; milkPerBottle: number; standardBottleVolume: number; y: number; r: number; onExplain: () => void; feeds24h: Feed[] }) {

  const bottles = ml / milkPerBottle;

  // Actual feed pictograms from last 24h, sorted large → small
  const feedEmojis = [...feeds24h]
    .sort((a, b) => b.volume - a.volume)
    .map(f => ({
      vol: f.volume,
      size: waterToMilk(f.volume) / milkPerBottle,
    }));

  return (
    <div className={`rounded-xl border p-3 ${bgBorder(pct, y, r)}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
        <button onClick={onExplain} className="w-4 h-4 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs font-bold flex items-center justify-center leading-none">?</button>
      </div>

      {/* Numbers: ml left, bottles right, same font */}
      <div className="flex items-baseline justify-between mb-1">
        <span className={`text-3xl font-bold leading-none tabular-nums ${colorClass(pct, y, r)}`}>{Math.round(ml)}<span className="text-base font-normal ml-0.5">ml</span></span>
        <span className={`text-3xl font-bold leading-none tabular-nums ${colorClass(pct, y, r)}`}>{bottles.toFixed(1)}<span className="text-base font-normal ml-0.5">× {standardBottleVolume}ml bottles</span></span>
      </div>
      <div className={`text-sm mb-2 ${colorClass(pct, y, r)}`}>{Math.round(pct)}% · {statusText(pct, y, r)}</div>

      {/* Actual feed pictograms: real bottles from last 24h, labels bottom-aligned */}
      <div className="flex flex-wrap items-end gap-1 mt-1">
        {feedEmojis.map((f, i) => (
          <div key={i} className="flex flex-col items-center justify-end">
            <span
              className="leading-none block"
              style={{ fontSize: `${Math.max(0.8, Math.min(1.5, f.size + 0.3))}rem`, opacity: 0.7 + f.size * 0.3 }}
            >🍼</span>
            <span className="text-xs text-slate-500 tabular-nums leading-none mt-0.5">{f.vol}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Panel with gauge replacing bottle count ───────────────────────────────────────────
function PanelWithGauge({ label, ml, pct, milkPerBottle, dailyTargetMl, y, r, onExplain, feeds24h }:
  { label: string; ml: number; pct: number; milkPerBottle: number; dailyTargetMl: number; y: number; r: number; onExplain: () => void; feeds24h: Feed[] }) {

  const diff = pct - 100;
  const fillHeight = Math.min(Math.max((pct - 60) / 80 * 100, 0), 100);
  const fillColor = Math.abs(diff) <= y ? '#4ade80' : diff > 0 ? '#f97316' : '#60a5fa';

  const feedEmojis = [...feeds24h]
    .sort((a, b) => b.volume - a.volume)
    .map(f => ({ vol: f.volume, size: waterToMilk(f.volume) / milkPerBottle }));

  return (
    <div className={`rounded-xl border p-3 ${bgBorder(pct, y, r)}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
        <button onClick={onExplain} className="w-5 h-5 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs font-bold flex items-center justify-center leading-none">?</button>
      </div>

      <div className="flex items-start">
        {/* Left: ml + pictograms — 62% width */}
        <div style={{ width: '62%' }}>
          <div className={`text-3xl font-bold leading-none tabular-nums mb-1 ${colorClass(pct, y, r)}`}>{Math.round(ml)}<span className="text-base font-normal ml-0.5">ml</span></div>
          <div className={`text-sm mb-2 ${colorClass(pct, y, r)}`}>{Math.round(pct)}% · {statusText(pct, y, r)}</div>
          <div className="flex flex-wrap items-end gap-1">
            {feedEmojis.map((f, i) => (
              <div key={i} className="flex flex-col items-center justify-end">
                <span className="leading-none block" style={{ fontSize: `${Math.max(0.8, Math.min(1.5, f.size + 0.3))}rem`, opacity: 0.7 + f.size * 0.3 }}>🍼</span>
                <span className="text-xs text-slate-500 tabular-nums leading-none mt-0.5">{f.vol}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: vertical gauge — fills remaining 38%, centred */}
        <div className="flex flex-col items-center" style={{ width: '38%' }}>
          <span className="text-xs text-orange-400 mb-0.5">↑</span>
          <div className="relative w-7 rounded-t-lg border-2 border-slate-500 overflow-hidden" style={{ height: 72 }}>
            <div className="absolute bottom-0 left-0 right-0 transition-all" style={{ height: `${fillHeight}%`, backgroundColor: fillColor }} />
            <div className="absolute left-0 right-0 h-0.5 bg-white/60" style={{ bottom: '50%' }} />
          </div>
          <span className="text-xs text-blue-400 mt-0.5">↓</span>
          <div className="text-xs font-bold tabular-nums mt-0.5 text-center" style={{ color: fillColor }}>
            {Math.abs(diff) < 1 ? '–'
              : `${diff > 0 ? '+' : '−'}${Math.abs(Math.round(ml - dailyTargetMl))}ml`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Extra view A: Progress bar (“what’s been consumed”) ──────────────────────────
function ProgressView(props: Props) {
  const { strict24h, strictPct, smoothedMl, smoothedPct, dailyTargetMl, yellowThresholdPct: y, redThresholdPct: r } = props;
  function Bar({ label, ml, pct, onExplain }: { label: string; ml: number; pct: number; onExplain: () => void }) {
    const fill = Math.min(pct, 150);
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">{label}</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-bold ${colorClass(pct, y, r)}`}>{Math.round(ml)} ml</span>
            <button onClick={onExplain} className="w-4 h-4 rounded-full bg-slate-600 text-slate-300 text-xs font-bold flex items-center justify-center leading-none">?</button>
          </div>
        </div>
        <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${(fill / 150) * 100}%`, backgroundColor: fill <= 100 + y ? '#4ade80' : fill <= 100 + r ? '#facc15' : '#f87171' }} />
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">{Math.round(pct)}%</div>
          {/* Target line */}
          <div className="absolute inset-y-0 w-0.5 bg-white/40" style={{ left: `${(100 / 150) * 100}%` }} />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-700 p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Intake in the last 24 hrs</div>
      <Bar label="Smoothed 24h" ml={smoothedMl} pct={smoothedPct} onExplain={props.onSmoothedExplain} />
      <Bar label="Strict 24h" ml={strict24h} pct={strictPct} onExplain={props.onStrictExplain} />
      <div className="text-xs text-slate-600 mt-0.5">Target: {Math.round(dailyTargetMl)} ml · white line = 100%</div>
    </div>
  );
}

// ── Extra view B: Number spotlight ──────────────────────────────────────────
function SpotlightView({ smoothedMl, smoothedPct, strict24h, strictPct, yellowThresholdPct: y, redThresholdPct: r, onSmoothedExplain, onStrictExplain }: Props) {
  return (
    <div className="rounded-xl border border-slate-700 p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">At a glance</div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className={`text-4xl font-black tabular-nums ${colorClass(smoothedPct, y, r)}`}>{Math.round(smoothedPct)}%</div>
          <div className="text-xs text-slate-400 mt-0.5">Smoothed</div>
          <div className="text-xs text-slate-500">{Math.round(smoothedMl)} ml</div>
          <button onClick={onSmoothedExplain} className="mt-1 w-4 h-4 rounded-full bg-slate-600 text-slate-300 text-xs font-bold mx-auto flex items-center justify-center leading-none">?</button>
        </div>
        <div>
          <div className={`text-4xl font-black tabular-nums ${colorClass(strictPct, y, r)}`}>{Math.round(strictPct)}%</div>
          <div className="text-xs text-slate-400 mt-0.5">Strict</div>
          <div className="text-xs text-slate-500">{Math.round(strict24h)} ml</div>
          <button onClick={onStrictExplain} className="mt-1 w-4 h-4 rounded-full bg-slate-600 text-slate-300 text-xs font-bold mx-auto flex items-center justify-center leading-none">?</button>
        </div>
      </div>
    </div>
  );
}

// ── Option C: Centre-anchored bidirectional bar ─────────────────────────────────────
function BiDirectionalView({ smoothedMl, smoothedPct, dailyTargetMl, yellowThresholdPct: y, redThresholdPct: r, onSmoothedExplain }: Props) {
  const diff = smoothedPct - 100;
  const absDiff = Math.abs(diff);
  const isOver = diff > 0;
  // bar fills from centre outward, max at ±40%
  const barPct = Math.min(absDiff / 40 * 50, 50); // 0-50% each side
  const barColor = absDiff <= y ? '#4ade80' : isOver ? '#f97316' : '#60a5fa';
  const surplusMl = Math.round(Math.abs(smoothedMl - dailyTargetMl));

  return (
    <div className="rounded-xl border border-slate-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 uppercase tracking-wide">Balance</span>
        <button onClick={onSmoothedExplain} className="w-4 h-4 rounded-full bg-slate-600 text-slate-300 text-xs font-bold flex items-center justify-center">?</button>
      </div>
      {/* Status label */}
      <div className="text-center mb-3">
        {absDiff <= y
          ? <span className="text-2xl font-bold text-green-400">✓ On target</span>
          : isOver
            ? <span className="text-2xl font-bold text-orange-400">↑ Overfed {surplusMl} ml</span>
            : <span className="text-2xl font-bold text-blue-400">↓ Underfed {surplusMl} ml</span>}
        <div className="text-xs text-slate-500 mt-0.5">{Math.round(smoothedPct)}% of target</div>
      </div>
      {/* Bidirectional bar */}
      <div className="relative h-5 bg-slate-700 rounded-full overflow-hidden">
        {/* Green centre band */}
        <div className="absolute inset-y-0 bg-green-900/40" style={{ left: '45%', right: '45%' }} />
        {/* Fill from centre */}
        {isOver
          ? <div className="absolute inset-y-0 rounded-r-full" style={{ left: '50%', width: `${barPct}%`, backgroundColor: barColor }} />
          : <div className="absolute inset-y-0 rounded-l-full" style={{ right: '50%', width: `${barPct}%`, backgroundColor: barColor }} />}
        {/* Centre line */}
        <div className="absolute inset-y-0 w-0.5 bg-white/50" style={{ left: '50%' }} />
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
          {diff > 0 ? '+' : ''}{Math.round(diff)}%
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-600 mt-0.5">
        <span>← underfed</span><span>overfed →</span>
      </div>
    </div>
  );
}

// ── Option D: Thermometer / gauge ───────────────────────────────────────────────────
function ThermometerView({ smoothedMl, smoothedPct, dailyTargetMl, yellowThresholdPct: y, redThresholdPct: r, onSmoothedExplain }: Props) {
  const diff = smoothedPct - 100;
  const absDiff = Math.abs(diff);
  const isOver = diff > 0;
  const surplusMl = Math.round(Math.abs(smoothedMl - dailyTargetMl));
  // Gauge: 60%=bottom, 140%=top. Target at centre.
  const fillHeight = Math.min(Math.max((smoothedPct - 60) / 80 * 100, 0), 100);
  const fillColor = absDiff <= y ? '#4ade80' : isOver ? '#f97316' : '#60a5fa';

  return (
    <div className="rounded-xl border border-slate-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 uppercase tracking-wide">Intake gauge</span>
        <button onClick={onSmoothedExplain} className="w-4 h-4 rounded-full bg-slate-600 text-slate-300 text-xs font-bold flex items-center justify-center">?</button>
      </div>
      <div className="flex items-end gap-4">
        {/* Vertical gauge */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-orange-400 mb-0.5">↑ over</span>
          <div className="relative w-8 rounded-t-lg border-2 border-slate-500 overflow-hidden" style={{ height: 80 }}>
            <div className="absolute bottom-0 left-0 right-0 transition-all" style={{ height: `${fillHeight}%`, backgroundColor: fillColor }} />
            {/* Target line at 50% height */}
            <div className="absolute left-0 right-0 h-0.5 bg-white/60" style={{ bottom: '50%' }} />
          </div>
          <span className="text-xs text-blue-400 mt-0.5">↓ under</span>
        </div>
        {/* Reading */}
        <div>
          <div className={`text-3xl font-black tabular-nums`} style={{ color: fillColor }}>
            {diff > 0 ? '+' : ''}{Math.round(diff)}%
          </div>
          <div className="text-xs text-slate-400">{Math.round(smoothedPct)}% of target</div>
          <div className={`text-sm font-semibold mt-1 ${isOver ? 'text-orange-400' : absDiff <= y ? 'text-green-400' : 'text-blue-400'}`}>
            {absDiff <= y ? '✓ On target' : isOver ? `↑ +${surplusMl} ml over` : `↓ ${surplusMl} ml under`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Option E: Emoji face + deficit/surplus statement ────────────────────────────────
function EmojiBalanceView({ smoothedMl, smoothedPct, dailyTargetMl, yellowThresholdPct: y, redThresholdPct: r, onSmoothedExplain }: Props) {
  const diff = smoothedPct - 100;
  const absDiff = Math.abs(diff);
  const isOver = diff > 0;
  const surplusMl = Math.round(Math.abs(smoothedMl - dailyTargetMl));

  let emoji = '😄', headline = '', sub = '', color = 'text-green-400';
  if (absDiff <= y) {
    emoji = '😄'; headline = 'Perfect balance'; sub = 'Right on target.'; color = 'text-green-400';
  } else if (isOver && absDiff > r) {
    emoji = '🤬'; headline = `Too full: +${surplusMl} ml`; sub = 'Next feed can wait a bit.'; color = 'text-orange-400';
  } else if (isOver) {
    emoji = '😌'; headline = `A little full: +${surplusMl} ml`; sub = 'All good — just watch.'; color = 'text-amber-400';
  } else if (absDiff > r) {
    emoji = '😢'; headline = `Short: −${surplusMl} ml`; sub = 'Offer a feed soon.'; color = 'text-blue-400';
  } else {
    emoji = '😕'; headline = `A little short: −${surplusMl} ml`; sub = 'Keep an eye on it.'; color = 'text-sky-400';
  }

  return (
    <div className="rounded-xl border border-slate-700 p-3 text-center">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400 uppercase tracking-wide">Status</span>
        <button onClick={onSmoothedExplain} className="w-4 h-4 rounded-full bg-slate-600 text-slate-300 text-xs font-bold flex items-center justify-center">?</button>
      </div>
      <div className="text-5xl mb-2">{emoji}</div>
      <div className={`text-xl font-bold ${color}`}>{headline}</div>
      <div className="text-slate-400 text-sm mt-0.5">{sub}</div>
      <div className="text-xs text-slate-500 mt-1">{Math.round(smoothedMl)} ml · {Math.round(smoothedPct)}%</div>
    </div>
  );
}

// ── History link view ──────────────────────────────────────────────────────────
function HistoryLinkView({ pct, ml, y, r }: { pct: number; ml: number; y: number; r: number }) {
  const diff = Math.abs(pct - 100);
  const color = diff <= y ? '#4ade80' : diff <= r ? '#facc15' : '#f87171';
  return (
    <div className="rounded-xl border border-slate-700 p-4 text-center">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Smoothed intake — 3 days</div>
      <div className="text-3xl font-bold tabular-nums mb-1" style={{ color }}>{Math.round(ml)} ml</div>
      <div className="text-sm mb-4" style={{ color }}>{Math.round(pct)}%</div>
      <Link
        href="/history/smoothed"
        className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
      >
        <span>View 3-day graph</span>
        <span className="text-slate-400">→</span>
      </Link>
      <div className="text-xs text-slate-600 mt-3">Tap to see smoothed intake over the last 3 days</div>
    </div>
  );
}

export default function StatusCard(props: Props) {
  const { strict24h, strictPct, smoothedMl, smoothedPct, standardBottleVolume, yellowThresholdPct: y, redThresholdPct: r } = props;
  const milkPerBottle = waterToMilk(standardBottleVolume);
  const cutoff24h = props.now - 24 * 3_600_000;
  const feeds24h = props.feeds.filter(f => f.timestamp >= cutoff24h)
    .sort((a, b) => a.timestamp - b.timestamp);

  return (
    <SwipeableCard
      className="mb-2"
      views={[
        <PanelWithGauge key="smoothed-gauge" label="STATUS LAST 24H" ml={smoothedMl} pct={smoothedPct}
          milkPerBottle={milkPerBottle} dailyTargetMl={props.dailyTargetMl} y={y} r={r}
          onExplain={props.onSmoothedExplain} feeds24h={feeds24h} />,
        <Panel key="smoothed" label="STATUS LAST 24H" ml={smoothedMl} pct={smoothedPct}
          milkPerBottle={milkPerBottle} standardBottleVolume={standardBottleVolume} y={y} r={r}
          onExplain={props.onSmoothedExplain} feeds24h={feeds24h} />,
        <Panel key="strict" label="Strict 24h" ml={strict24h} pct={strictPct}
          milkPerBottle={milkPerBottle} standardBottleVolume={standardBottleVolume} y={y} r={r}
          onExplain={props.onStrictExplain} feeds24h={feeds24h} />,
        <ProgressView key="progress" {...props} />,
        <SpotlightView key="spotlight" {...props} />,
        <BiDirectionalView key="bidir" {...props} />,
        <ThermometerView key="thermo" {...props} />,
        <EmojiBalanceView key="emoji" {...props} />,
        <HistoryLinkView key="history" pct={smoothedPct} ml={smoothedMl} y={y} r={r} />,
      ]}
    />
  );
}
