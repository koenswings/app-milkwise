"use client";

import SwipeableCard from "@/components/SwipeableCard";
import { formatDateTime } from "@/lib/formatTime";

interface Props {
  standardNext: number | null;   // lastFeed + ideal interval (no adjustment)
  adjustedNext: number | null;   // running balance result
  idealIntervalHours: number;
  now: number;
  timeFormat: '24h' | '12h';
  balanceMl?: number;
  capped?: boolean;
}

function formatRelative(ms: number, now: number): string {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  const str = hrs > 0 ? `${hrs}h ${m}m` : `${mins}m`;
  return diff > 0 ? `in ${str}` : `${str} ago`;
}

function deltaLabel(adjusted: number, standard: number) {
  const deltaMin = Math.round((adjusted - standard) / 60_000);
  if (deltaMin === 0) return null;
  if (deltaMin > 0) return { text: `+${deltaMin}m · overfed`, color: "text-yellow-400" };
  return { text: `${deltaMin}m · catch up`, color: "text-blue-400" };
}

// ── Digital clock renderer ────────────────────────────────────────────────────
function DigitalClock({ ts, label, sub, timeFormat }: { ts: number; label: string; sub?: string; timeFormat: '24h' | '12h' }) {
  const d = new Date(ts);
  let hours = d.getHours();
  const mins = d.getMinutes();
  const ampm = timeFormat === '12h' ? (hours >= 12 ? 'PM' : 'AM') : null;
  if (timeFormat === '12h') { hours = hours % 12 || 12; }
  const hStr = String(hours).padStart(2, '0');
  const mStr = String(mins).padStart(2, '0');

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="font-mono font-bold text-4xl text-blue-300 tracking-widest tabular-nums">
        {hStr}<span className="animate-pulse text-slate-400">:</span>{mStr}
        {ampm && <span className="text-lg text-slate-400 ml-1">{ampm}</span>}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── View 0: Standard interval (text) ─────────────────────────────────────────
function StandardTextView({ standardNext, idealIntervalHours, now, timeFormat }: Props) {
  const h = Math.floor(idealIntervalHours);
  const m = Math.round((idealIntervalHours - h) * 60);
  const intervalLabel = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return (
    <div className="p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Next feed · standard</div>
      {standardNext ? (
        <>
          <div className="text-xl font-semibold text-blue-300">{formatDateTime(standardNext, timeFormat)}</div>
          <div className="text-xs text-slate-400 mt-0.5">{formatRelative(standardNext, now)}</div>
          <div className="text-xs text-slate-500 mt-1">Based on {intervalLabel} standard interval</div>
        </>
      ) : <span className="text-slate-500 text-sm">No feeds yet</span>}
    </div>
  );
}

// ── View 1: Adjusted interval (text) ─────────────────────────────────────────
function AdjustedTextView({ adjustedNext, standardNext, now, timeFormat, balanceMl, capped }: Props) {
  const delta = adjustedNext && standardNext ? deltaLabel(adjustedNext, standardNext) : null;
  return (
    <div className="p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Next feed · adjusted</div>
      {adjustedNext ? (
        <>
          <div className="text-xl font-semibold text-blue-300">{formatDateTime(adjustedNext, timeFormat)}</div>
          <div className="text-xs text-slate-400 mt-0.5">{formatRelative(adjustedNext, now)}</div>
          {delta && <div className={`text-xs mt-1 font-medium ${delta.color}`}>{delta.text}</div>}
          {capped && <div className="text-xs mt-0.5 text-yellow-400 font-medium">⚠️ max gap cap applied</div>}
          {balanceMl !== undefined && <div className="text-xs text-slate-500 mt-1">Energy pool: {balanceMl} ml</div>}
        </>
      ) : <span className="text-slate-500 text-sm">No feeds yet</span>}
    </div>
  );
}

// ── View 2: Digital clock — standard ─────────────────────────────────────────
function StandardClockView({ standardNext, idealIntervalHours, now, timeFormat }: Props) {
  const h = Math.floor(idealIntervalHours);
  const m = Math.round((idealIntervalHours - h) * 60);
  return (
    <div className="p-3">
      {standardNext
        ? <DigitalClock ts={standardNext} label="Standard next feed" sub={`${formatRelative(standardNext, now)} · ${h}h ${m}m interval`} timeFormat={timeFormat} />
        : <span className="text-slate-500 text-sm">No feeds yet</span>}
    </div>
  );
}

// ── View 3: Digital clock — adjusted ─────────────────────────────────────────
function AdjustedClockView({ adjustedNext, standardNext, now, timeFormat, capped, balanceMl }: Props) {
  const delta = adjustedNext && standardNext ? deltaLabel(adjustedNext, standardNext) : null;
  return (
    <div className="p-3">
      {adjustedNext
        ? <>
            <DigitalClock ts={adjustedNext} label="Adjusted next feed" sub={formatRelative(adjustedNext, now)} timeFormat={timeFormat} />
            {delta && <div className={`text-center text-xs font-medium mt-1 ${delta.color}`}>{delta.text}</div>}
            {capped && <div className="text-center text-xs text-yellow-400 mt-0.5">⚠️ max gap cap</div>}
          </>
        : <span className="text-slate-500 text-sm">No feeds yet</span>}
    </div>
  );
}

export default function NextFeedCard(props: Props) {
  return (
    <SwipeableCard
      views={[
        <StandardTextView key="std-text" {...props} />,
        <AdjustedTextView key="adj-text" {...props} />,
        <StandardClockView key="std-clock" {...props} />,
        <AdjustedClockView key="adj-clock" {...props} />,
      ]}
    />
  );
}
