"use client";

import { useEffect, useState, useCallback } from "react";
import { getFeeds, getSettings, getWeights, addWeight, saveSettings, migrateFromLocalStorage } from "@/lib/store";
import { WeightEntry } from "@/lib/weights";
import {
  deriveSettings,
  strict24hTotal,
  smoothedEffective,
  smoothedAtTime,
  nextFeedTime,
  bestBottleSizeNow,
  waterToMilk,
} from "@/lib/calculations";
import { Feed, Settings, DerivedSettings } from "@/types";
import { useRouter } from "next/navigation";
import Strict24hExplainer from "@/components/Strict24hExplainer";
import SmoothedExplainer from "@/components/SmoothedExplainer";
import DailyTargetCard from "@/components/cards/DailyTargetCard";
import StatusCard from "@/components/cards/StatusCard";
import NextFeedCard from "@/components/cards/NextFeedCard";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { formatDateTime } from "@/lib/formatTime";

function isToday(ms: number): boolean {
  const d = new Date(ms);
  const t = new Date();
  return d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear();
}

function isTomorrow(ms: number): boolean {
  const d = new Date(ms);
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear();
}

function formatRelative(ms: number, now: number): string {
  const diff = ms - now;
  const absDiff = Math.abs(diff);
  const mins = Math.round(absDiff / 60000);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  const timeStr = hrs > 0 ? `${hrs}h ${remMins}m` : `${mins}m`;
  return diff > 0 ? `in ${timeStr}` : `${timeStr} ago`;
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
  const [nextBottleWaterMl, setNextBottleWaterMl] = useState<number>(90);
  const [showNextBottlePicker, setShowNextBottlePicker] = useState(false);
  const [standardBottleWaterMl, setStandardBottleWaterMl] = useState<number>(90);
  const [showStandardBottlePicker, setShowStandardBottlePicker] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    // One-time migration of any existing localStorage data to the server
    await migrateFromLocalStorage();
    const [f, s, w] = await Promise.all([getFeeds(), getSettings(), getWeights()]);
    setFeeds(f);
    setSettings(s);
    setDerived(deriveSettings(s));
    setWeights(w);
    setNextBottleWaterMl(s.nextBottleWaterMl);
    // Standard bottle defaults to last feed volume if available, else nextBottleWaterMl
    setStandardBottleWaterMl(s.nextBottleWaterMl);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    load();

    // Reload on page focus (handles navigation back from Settings or Log)
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    // Reload when localStorage changes (CSV import etc.)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "bmt_feeds" || e.key === "bmt_settings") load();
    };
    window.addEventListener("storage", onStorage);

    // Only the relative time labels ("in Xh Ym") need to tick — update 'now' every minute
    // without reloading feeds/settings (status calculations are frozen at lastFeed.timestamp)
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

  // Both Strict and Smoothed frozen at last-feed time — only change when a new feed is logged
  const smoothedAt = lastFeed ? lastFeed.timestamp : now;
  const strict24h = strict24hTotal(feeds, smoothedAt);
  // Live gauge: smoothed at actual now, decays every minute with the clock tick
  const liveSmoothedMl = smoothedAtTime(feeds, derived.hourlyRate, now);
  const liveSmoothedPct = (liveSmoothedMl / derived.dailyTargetMl) * 100;
  const { totalMl: smoothedMl, bottles: smoothedBottles } = smoothedEffective(
    feeds,
    derived.hourlyRate,
    settings.standardBottleVolume,
    smoothedAt
  );

  const strict24hPct = (strict24h / derived.dailyTargetMl) * 100;
  const smoothedPct = (smoothedMl / derived.dailyTargetMl) * 100;

  const nextFeedResult = nextFeedTime(feeds, derived.hourlyRate, smoothedMl, derived.dailyTargetMl, { ...settings, nextBottleWaterMl });
  const nextFeed = nextFeedResult?.timestamp ?? null;
  // Standard next for the Standard pill — uses standardBottleWaterMl
  const standardBottleMilkMl = waterToMilk(standardBottleWaterMl);
  const standardNext = lastFeed ? lastFeed.timestamp + (standardBottleMilkMl / derived.hourlyRate) * 3_600_000 : null;
  // P3's own internal standard — uses nextBottleWaterMl (same baseline P3 optimises against)
  // Used for the "Xm earlier/later" delta label so it matches the explainer's correction value.
  const p3StandardBottleMilkMl = waterToMilk(nextBottleWaterMl);
  const p3StandardNext = lastFeed ? lastFeed.timestamp + (p3StandardBottleMilkMl / derived.hourlyRate) * 3_600_000 : null;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-100">🍼 MilkWise</h1>
        <span className="text-xs text-slate-500">v1.0.76</span>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        {settings.weightKg} kg · Target: {Math.round(derived.dailyTargetMl)} ml/day
      </p>

      {/* Quick log button */}
      <div className="flex gap-2 mb-3">
        <Link href="/log" className="flex-1 text-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors">
          ➕ Log Feed
        </Link>
        <button
          onClick={() => {
            const d = new Date();
            const pad = (n: number) => String(n).padStart(2,'0');
            const local = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            setNewWeightKg(settings.weightKg.toString());
            setNewWeightTime(local);
            setShowWeightModal(true);
          }}
          className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold rounded-xl transition-colors"
        >
          ⚖️ Weight
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

      {/* §3.5 Next bottle picker modal */}
      {/* Standard bottle picker modal */}
      {showStandardBottlePicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 pb-24" onClick={() => setShowStandardBottlePicker(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-100 mb-1">Next bottle — Standard predictor</h2>
            <p className="text-sm text-slate-400 mb-5">Sets the interval for the standard next feed time.</p>
            <div className="flex gap-2">
              {[60, 90, 120, 150].map((v) => (
                <button key={v} onClick={() => { setStandardBottleWaterMl(v); setShowStandardBottlePicker(false); }}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                    standardBottleWaterMl === v ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}>{v} ml</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Adjusted (P3) bottle picker modal */}
      {showNextBottlePicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 pb-24" onClick={() => setShowNextBottlePicker(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-100 mb-1">Next bottle for Predictor 3</h2>
            <p className="text-sm text-slate-400 mb-5">Predictor 3 assumes you&apos;ll give this bottle at the next feed.</p>
            <div className="flex gap-2">
              {[60, 90, 120, 150].map((v) => (
                <button
                  key={v}
                  onClick={async () => {
                    setNextBottleWaterMl(v);
                    await saveSettings({ ...settings, nextBottleWaterMl: v });
                    setShowNextBottlePicker(false);
                  }}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                    nextBottleWaterMl === v
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {v} ml
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily target — uses displayBottleVolumeWater from settings */}
      <DailyTargetCard
        settings={{ ...settings, standardBottleVolume: settings.displayBottleVolumeWater }}
        derived={deriveSettings({ ...settings, standardBottleVolume: settings.displayBottleVolumeWater })}
      />

      {/* 24h status — uses displayBottleVolumeWater */}
      <StatusCard
        strict24h={strict24h}
        strictPct={strict24hPct}
        smoothedMl={smoothedMl}
        smoothedPct={smoothedPct}
        liveSmoothedMl={liveSmoothedMl}
        liveSmoothedPct={liveSmoothedPct}
        dailyTargetMl={derived.dailyTargetMl}
        standardBottleVolume={settings.displayBottleVolumeWater}
        yellowThresholdPct={settings.yellowThresholdPct}
        redThresholdPct={settings.redThresholdPct}
        onStrictExplain={() => setShowStrictExplainer(true)}
        onSmoothedExplain={() => setShowSmoothedExplainer(true)}
        feeds={feeds}
        weights={weights}
        now={now}
      />

      {showStrictExplainer && (
        <Strict24hExplainer onClose={() => setShowStrictExplainer(false)} />
      )}
      {showSmoothedExplainer && derived && (
        <SmoothedExplainer
          onClose={() => setShowSmoothedExplainer(false)}
          hourlyRate={derived.hourlyRate}
          standardBottleVolume={settings.standardBottleVolume}
          dailyTargetMl={derived.dailyTargetMl}
          feeds={feeds}
          now={smoothedAt}
        />
      )}



      {/* Bottom row: last feed + two next feed clocks */}
      {(() => {
        // standardNext is computed above using effectiveBottleSize

        const tf = settings.timeFormat;
        function DigClock({ ts, sub }: { ts: number | null; sub?: string }) {
          if (!ts) return <span className="text-slate-500 text-xs">No feeds yet</span>;
          const d = new Date(ts);
          let h = d.getHours(), m = d.getMinutes();
          const ampm = tf === '12h' ? (h >= 12 ? 'PM' : 'AM') : null;
          if (tf === '12h') h = h % 12 || 12;
          const hh = String(h).padStart(2, '0'), mm = String(m).padStart(2, '0');
          return (
            <>
              <div className="font-mono font-bold text-3xl text-blue-300 tracking-widest tabular-nums leading-none">
                {hh}<span className="text-slate-500">:</span>{mm}{ampm && <span className="text-base text-slate-400 ml-0.5">{ampm}</span>}
              </div>
              {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
            </>
          );
        }

        return (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {/* Last feed */}
            <div className="bg-slate-800 rounded-xl p-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Last feed</div>
              {lastFeed ? (
                <>
                  <DigClock ts={lastFeed.timestamp} />
                  <div className="text-xs text-slate-400 mt-1">{lastFeed.volume} ml</div>
                </>
              ) : <span className="text-slate-500 text-xs">None yet</span>}
            </div>
            {/* Next feed standard */}
            <div className="bg-slate-800 rounded-xl p-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Next</div>
              <DigClock ts={standardNext} sub={standardNext ? formatRelative(standardNext, now) : undefined} />
              <button
                onClick={() => setShowStandardBottlePicker(true)}
                className="mt-1.5 w-full text-center bg-slate-700 hover:bg-slate-600 rounded-full px-2 py-0.5 text-xs text-slate-300 cursor-pointer transition-colors"
              >⬡ {standardBottleWaterMl} ml</button>
            </div>
            {/* Next feed adjusted */}
            <div className="bg-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Adjusted</span>
                <Link href="/info/next-feed" className="w-4 h-4 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs font-bold flex items-center justify-center leading-none">
                  ?
                </Link>
              </div>
              <DigClock ts={nextFeed} sub={nextFeed ? formatRelative(nextFeed, now) : undefined} />
              {nextFeed && p3StandardNext && (() => {
                // Compare P3 result against P3's own internal standard (same nextBottleWaterMl baseline)
                // so this delta matches what the explainer shows as "time correction".
                const d = Math.round((nextFeed - p3StandardNext) / 60_000);
                if (d === 0) return <div className="text-xs text-slate-500 mt-0.5">same as standard</div>;
                return <div className={`text-xs mt-0.5 font-medium ${d > 0 ? 'text-yellow-400' : 'text-blue-400'}`}>{d > 0 ? `${d}m later` : `${Math.abs(d)}m earlier`} than standard</div>;
              })()}
              {/* §3.5 Next bottle pill */}
              <button
                onClick={() => setShowNextBottlePicker(true)}
                className="mt-1.5 w-full text-center bg-slate-700 hover:bg-slate-600 rounded-full px-2 py-0.5 text-xs text-slate-300 cursor-pointer transition-colors"
              >⬡ {nextBottleWaterMl} ml</button>
              {/* §3.6 Best size now hint — only show when it's actionable (not overfed at frozen snapshot) */}
              {feeds.length > 0 && (() => {
                const best = bestBottleSizeNow(feeds, derived.hourlyRate, derived.dailyTargetMl, now);
                const go = () => router.push(`/log?recommend=${best.waterMl}&recStatus=${best.status}`);
                // "Overfed" in live view right after a feed is expected and matches the P3 clock.
                // Don't show a conflicting hint — the Adjusted clock already tells the parent when to feed.
                if (best.status === "overfed") return null;
                if (best.status === "capped") {
                  return <div onClick={go} className="text-xs text-slate-400 cursor-pointer underline mt-1">Feed now → {best.waterMl} ml water ({Math.round(best.milkMl)} ml milk, large deficit)</div>;
                }
                return <div onClick={go} className="text-xs text-slate-400 cursor-pointer underline mt-1">Feed now → {best.waterMl} ml water ({Math.round(best.milkMl)} ml milk)</div>;
              })()}
            </div>
          </div>
        );
      })()}

      {/* Summary row */}
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
