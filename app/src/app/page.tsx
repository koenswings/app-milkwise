"use client";

import { useEffect, useState, useCallback } from "react";
import { getFeeds, getSettings, getWeights, addWeight, saveSettings, migrateFromLocalStorage } from "@/lib/store";
import { WeightEntry } from "@/lib/weights";
import {
  deriveSettings,
  strict24hTotal,
  smoothedEffective,
  smoothedAtTime,
  waterToMilk,
  milkToWater,
  computePredictors,
} from "@/lib/calculations";
import { Feed, Settings, DerivedSettings, PredictorResult } from "@/types";
import Strict24hExplainer from "@/components/Strict24hExplainer";
import SmoothedExplainer from "@/components/SmoothedExplainer";
import DailyTargetCard from "@/components/cards/DailyTargetCard";
import StatusCard from "@/components/cards/StatusCard";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { formatTime } from "@/lib/formatTime";

function formatRelative(ms: number, now: number): string {
  const diff = ms - now;
  const absDiff = Math.abs(diff);
  const mins = Math.round(absDiff / 60000);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  const timeStr = hrs > 0 ? `${hrs}h ${remMins}m` : `${mins}m`;
  return diff > 0 ? `in ${timeStr}` : `${timeStr} ago`;
}

function formatIntervalLabel(ms: number): string {
  const totalMins = Math.round(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DigClock({ ts, timeFormat, sub }: { ts: number | null; timeFormat: '24h' | '12h'; sub?: string }) {
  if (!ts) return <span className="text-slate-500 text-xs">No feeds yet</span>;
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = timeFormat === '12h' ? (h >= 12 ? 'PM' : 'AM') : null;
  if (timeFormat === '12h') h = h % 12 || 12;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return (
    <>
      <div className="font-mono font-bold text-2xl text-blue-300 tracking-widest tabular-nums leading-none">
        {hh}<span className="text-slate-500">:</span>{mm}
        {ampm && <span className="text-sm text-slate-400 ml-0.5">{ampm}</span>}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </>
  );
}

export default function Dashboard() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [derived, setDerived] = useState<DerivedSettings | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showStrictExplainer, setShowStrictExplainer] = useState(false);
  const [showSmoothedExplainer, setShowSmoothedExplainer] = useState(false);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeightKg, setNewWeightKg] = useState('');
  const [newWeightTime, setNewWeightTime] = useState('');
  const [showBottlePicker, setShowBottlePicker] = useState(false);
  const [predictors, setPredictors] = useState<PredictorResult | null>(null);

  const load = useCallback(async () => {
    await migrateFromLocalStorage();
    const [f, s, w] = await Promise.all([getFeeds(), getSettings(), getWeights()]);
    setFeeds(f);
    setSettings(s);
    const d = deriveSettings(s);
    setDerived(d);
    setWeights(w);
    setNow(Date.now());
    // Compute predictors
    const preds = computePredictors(f, d.hourlyRate, d.dailyTargetMl, s.preferredBottleWaterMl);
    setPredictors(preds);
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "bmt_feeds" || e.key === "bmt_settings") load();
    };
    window.addEventListener("storage", onStorage);
    const clockInterval = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      clearInterval(clockInterval);
    };
  }, [load]);

  if (!settings || !derived) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400">Loading…</div>
      </div>
    );
  }

  const lastFeed = feeds.length > 0
    ? feeds.reduce((a, b) => (a.timestamp > b.timestamp ? a : b))
    : null;

  const smoothedAt = lastFeed ? lastFeed.timestamp : now;
  const strict24h = strict24hTotal(feeds, smoothedAt);
  const liveSmoothedMl = smoothedAtTime(feeds, derived.hourlyRate, now);
  const liveSmoothedPct = (liveSmoothedMl / derived.dailyTargetMl) * 100;
  const { totalMl: smoothedMl } = smoothedEffective(
    feeds,
    derived.hourlyRate,
    settings.preferredBottleWaterMl,
    smoothedAt
  );
  const strict24hPct = (strict24h / derived.dailyTargetMl) * 100;
  const smoothedPct = (smoothedMl / derived.dailyTargetMl) * 100;

  const tf = settings.timeFormat;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-100">🍼 MilkWise</h1>
        <span className="text-xs text-slate-500">v1.0.86</span>
      </div>
      <p className="text-slate-400 text-sm mb-4">
        {settings.weightKg} kg · Target: {Math.round(derived.dailyTargetMl)} ml/day
      </p>

      {/* Three equal action buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Link
          href="/log"
          className="text-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          ➕ Log Feed
        </Link>
        <button
          onClick={() => {
            const d = new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            const local = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            setNewWeightKg(settings.weightKg.toString());
            setNewWeightTime(local);
            setShowWeightModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          ⚖️ Weight
        </button>
        <button
          onClick={() => setShowBottlePicker(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          🍼 Bottle Size
        </button>
      </div>

      {/* Weight modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowWeightModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-100 mb-4">⚖️ Update Weight</h2>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Weight (kg)</label>
                <input type="number" step="0.01" min="1" max="30"
                  value={newWeightKg} onChange={e => setNewWeightKg(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 text-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Date &amp; time</label>
                <input type="datetime-local"
                  value={newWeightTime} onChange={e => setNewWeightTime(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowWeightModal(false)} className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl">Cancel</button>
              <button
                onClick={async () => {
                  const kg = parseFloat(newWeightKg);
                  if (isNaN(kg) || kg <= 0) { alert('Please enter a valid weight'); return; }
                  const ts = newWeightTime ? new Date(newWeightTime).getTime() : Date.now();
                  if (isNaN(ts)) { alert('Invalid date/time'); return; }
                  try {
                    await addWeight({ timestamp: ts, weightKg: kg });
                    setShowWeightModal(false);
                    await load();
                  } catch(e) {
                    alert('Save failed: ' + String(e));
                  }
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferred bottle picker modal */}
      {showBottlePicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 pb-24" onClick={() => setShowBottlePicker(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-100 mb-1">🍼 Preferred Bottle Size</h2>
            <p className="text-sm text-slate-400 mb-5">Sets the standard interval and predictor targets.</p>
            <div className="grid grid-cols-2 gap-3">
              {[60, 90, 120, 150].map((v) => {
                const milkMl = Math.round(waterToMilk(v));
                const isSelected = settings.preferredBottleWaterMl === v;
                return (
                  <button
                    key={v}
                    onClick={async () => {
                      const updated = { ...settings, preferredBottleWaterMl: v };
                      await saveSettings(updated);
                      setShowBottlePicker(false);
                      await load();
                    }}
                    className={`py-4 rounded-xl font-semibold transition-colors flex flex-col items-center gap-1 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <span className="text-lg">{v} ml</span>
                    <span className={`text-xs ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>= {milkMl} ml milk</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Status card */}
      <StatusCard
        strict24h={strict24h}
        strictPct={strict24hPct}
        smoothedMl={smoothedMl}
        smoothedPct={smoothedPct}
        liveSmoothedMl={liveSmoothedMl}
        liveSmoothedPct={liveSmoothedPct}
        dailyTargetMl={derived.dailyTargetMl}
        standardBottleVolume={settings.preferredBottleWaterMl}
        yellowThresholdPct={settings.yellowThresholdPct}
        redThresholdPct={settings.redThresholdPct}
        onStrictExplain={() => setShowStrictExplainer(true)}
        onSmoothedExplain={() => setShowSmoothedExplainer(true)}
        feeds={feeds}
        weights={weights}
        now={now}
      />

      {/* Daily target card */}
      <DailyTargetCard
        settings={settings}
        derived={derived}
      />

      {showStrictExplainer && (
        <Strict24hExplainer onClose={() => setShowStrictExplainer(false)} />
      )}
      {showSmoothedExplainer && derived && (
        <SmoothedExplainer
          onClose={() => setShowSmoothedExplainer(false)}
          hourlyRate={derived.hourlyRate}
          preferredBottleWaterMl={settings.preferredBottleWaterMl}
          dailyTargetMl={derived.dailyTargetMl}
          feeds={feeds}
          now={smoothedAt}
        />
      )}

      {/* Row 1: Last Feed + Next Feed */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* Last Feed card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 border border-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-sky-400 rounded-t-xl" />
          <div className="text-xs text-blue-400 uppercase tracking-wide mb-2 font-medium">🍼 Last Feed</div>
          {lastFeed ? (
            <>
              <div className="text-2xl font-bold text-white mb-0.5">{lastFeed.volume} ml</div>
              <DigClock ts={lastFeed.timestamp} timeFormat={tf} />
              <div className="text-xs text-slate-500 mt-1">{formatRelative(lastFeed.timestamp, now)}</div>
            </>
          ) : (
            <span className="text-slate-500 text-xs">None yet</span>
          )}
        </div>

        {/* Next Feed card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 border border-emerald-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-t-xl" />
          <div className="text-xs text-emerald-400 uppercase tracking-wide mb-2 font-medium">⏱️ Next Feed</div>
          {predictors ? (
            <>
              <div className="text-2xl font-bold text-white mb-0.5">{settings.preferredBottleWaterMl} ml</div>
              <DigClock ts={predictors.predictorATimestamp} timeFormat={tf} />
              <div className="text-xs text-slate-500 mt-1">{formatRelative(predictors.predictorATimestamp, now)}</div>
            </>
          ) : (
            <span className="text-slate-500 text-xs">No feeds yet</span>
          )}
        </div>
      </div>

      {/* Row 2: Predictor A + Predictor B */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Predictor A — adjust the amount */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 border border-violet-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-400 rounded-t-xl" />
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-violet-400">⚗️ Adjust amount</div>
            <Link
              href="/info/predictor-a"
              className="w-4 h-4 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs font-bold flex items-center justify-center leading-none flex-shrink-0"
            >?</Link>
          </div>
          {predictors ? (
            predictors.predictorASurplus ? (
              <>
                <div className="text-2xl font-bold text-slate-500 mb-0.5">—</div>
                <DigClock ts={predictors.predictorATimestamp} timeFormat={tf} />
                <div className="text-xs text-slate-500 mt-1">Well fed</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-violet-300 mb-0.5">
                  {predictors.predictorAVolumeWater} ml
                  {predictors.predictorACapped && <span className="text-sm text-yellow-400 ml-1">⚠️</span>}
                </div>
                <DigClock ts={predictors.predictorATimestamp} timeFormat={tf} />
                <div className="text-xs text-slate-500 mt-1">{formatRelative(predictors.predictorATimestamp, now)}</div>
              </>
            )
          ) : (
            <span className="text-slate-500 text-xs">No feeds yet</span>
          )}
        </div>

        {/* Predictor B — adjust the timing */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 border border-amber-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-400 rounded-t-xl" />
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-amber-400">🕐 Adjust timing</div>
            <Link
              href="/info/predictor-b"
              className="w-4 h-4 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs font-bold flex items-center justify-center leading-none flex-shrink-0"
            >?</Link>
          </div>
          {predictors ? (
            <>
              <div className="text-2xl font-bold text-amber-300 mb-0.5">{settings.preferredBottleWaterMl} ml</div>
              <DigClock ts={predictors.predictorBTimestamp} timeFormat={tf} />
              <div className="text-xs text-slate-500 mt-1">
                {predictors.predictorBCapped
                  ? 'No rush'
                  : predictors.predictorBStomachLimited
                  ? 'After digestion'
                  : formatRelative(predictors.predictorBTimestamp, now)}
              </div>
            </>
          ) : (
            <span className="text-slate-500 text-xs">No feeds yet</span>
          )}
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-slate-100">{feeds.length}</div>
          <div className="text-xs text-slate-400">Total feeds</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-slate-100">
            {feeds.filter((f) => f.timestamp >= now - 24 * 60 * 60 * 1000).length}
          </div>
          <div className="text-xs text-slate-400">Last 24h</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-slate-100">
            {Math.round(derived.hourlyRate * 10) / 10}
          </div>
          <div className="text-xs text-slate-400">ml/hour</div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
