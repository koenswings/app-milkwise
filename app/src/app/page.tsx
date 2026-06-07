"use client";

import { useEffect, useState, useCallback } from "react";
import { getFeeds, getSettings, migrateFromLocalStorage } from "@/lib/store";
import {
  deriveSettings,
  strict24hTotal,
  smoothedEffective,
  nextFeedTime,
} from "@/lib/calculations";
import { Feed, Settings, DerivedSettings } from "@/types";
import Strict24hExplainer from "@/components/Strict24hExplainer";
import DailyTargetCard from "@/components/cards/DailyTargetCard";
import StrictCard from "@/components/cards/StrictCard";
import SmoothedCard from "@/components/cards/SmoothedCard";
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

  const load = useCallback(async () => {
    // One-time migration of any existing localStorage data to the server
    await migrateFromLocalStorage();
    const [f, s] = await Promise.all([getFeeds(), getSettings()]);
    setFeeds(f);
    setSettings(s);
    setDerived(deriveSettings(s));
    setNow(Date.now());
  }, []);

  useEffect(() => {
    load();

    // Refresh every minute
    const interval = setInterval(() => { load(); }, 60000);

    // Also reload when localStorage changes (e.g. after CSV import)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "bmt_feeds" || e.key === "bmt_settings") load();
    };
    window.addEventListener("storage", onStorage);

    // Reload on page focus (handles same-tab navigation back from Settings)
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
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
  const { totalMl: smoothedMl, bottles: smoothedBottles } = smoothedEffective(
    feeds,
    derived.hourlyRate,
    settings.standardBottleVolume,
    smoothedAt
  );

  const strict24hPct = (strict24h / derived.dailyTargetMl) * 100;
  const smoothedPct = (smoothedMl / derived.dailyTargetMl) * 100;

  const nextFeedResult = nextFeedTime(feeds, derived.hourlyRate, settings);
  const nextFeed = nextFeedResult?.timestamp ?? null;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-slate-100 mb-1">🍼 Baby Milk Tracker</h1>
      <p className="text-slate-400 text-sm mb-6">
        {settings.weightKg} kg · Target: {Math.round(derived.dailyTargetMl)} ml/day
      </p>

      {/* Quick log button */}
      <Link
        href="/log"
        className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl mb-6 transition-colors"
      >
        ➕ Log Feed
      </Link>

      {/* Daily target — swipeable */}
      <DailyTargetCard settings={settings} derived={derived} />

      {/* Status cards — swipeable */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StrictCard
          strict24h={strict24h}
          pct={strict24hPct}
          dailyTargetMl={derived.dailyTargetMl}
          standardBottleVolume={settings.standardBottleVolume}
          yellowThresholdPct={settings.yellowThresholdPct}
          redThresholdPct={settings.redThresholdPct}
          onExplain={() => setShowStrictExplainer(true)}
        />
        <SmoothedCard
          smoothedMl={smoothedMl}
          smoothedBottles={smoothedBottles}
          pct={smoothedPct}
          dailyTargetMl={derived.dailyTargetMl}
          standardBottleVolume={settings.standardBottleVolume}
          hourlyRate={derived.hourlyRate}
          yellowThresholdPct={settings.yellowThresholdPct}
          redThresholdPct={settings.redThresholdPct}
          feeds={feeds}
          now={smoothedAt}
        />
      </div>

      {showStrictExplainer && (
        <Strict24hExplainer onClose={() => setShowStrictExplainer(false)} />
      )}

      {/* Last feed + Next feed side by side */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Last feed */}
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="text-sm text-slate-400 mb-1">Last feed</div>
          {lastFeed ? (
            <>
              <div className="text-lg font-semibold text-slate-200 leading-tight">{formatDateTime(lastFeed.timestamp, settings.timeFormat)}</div>
              <div className="text-slate-400 text-sm mt-0.5">{lastFeed.volume} ml</div>
              <div className="text-xs text-slate-500 mt-1">{formatRelative(lastFeed.timestamp, now)}</div>
            </>
          ) : (
            <span className="text-slate-500 text-sm">None yet</span>
          )}
        </div>

        {/* Next feed */}
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="text-sm text-slate-400 mb-1">Next feed</div>
          {nextFeed ? (
            <>
              <div className="text-lg font-semibold text-blue-300 leading-tight">{formatDateTime(nextFeed, settings.timeFormat)}</div>
              <div className="text-xs text-slate-400 mt-0.5">{formatRelative(nextFeed, now)}</div>
              {nextFeedResult && lastFeed && (() => {
                const idealMs = (derived.milkPerBottle / derived.hourlyRate) * 3_600_000;
                const idealNext = lastFeed.timestamp + idealMs;
                const deltaMin = Math.round((nextFeed - idealNext) / 60_000);
                if (nextFeedResult.capped) return (
                  <div className="text-xs mt-1 font-medium text-yellow-400">⚠️ max gap · +{Math.round((nextFeed - idealNext) / 60_000)}m vs standard</div>
                );
                if (deltaMin === 0) return (
                  <div className="text-xs mt-1 text-slate-500">on standard interval</div>
                );
                return (
                  <div className={`text-xs mt-1 font-medium ${deltaMin > 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {deltaMin > 0 ? `+${deltaMin}m vs standard · overfed` : `${deltaMin}m vs standard · catch up`}
                  </div>
                );
              })()}

            </>
          ) : (
            <span className="text-slate-500 text-sm">No feeds yet</span>
          )}
        </div>
      </div>

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
