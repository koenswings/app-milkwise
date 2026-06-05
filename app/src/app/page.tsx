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
import StatusBadge from "@/components/StatusBadge";
import SmoothedExplainer from "@/components/SmoothedExplainer";
import Strict24hExplainer from "@/components/Strict24hExplainer";
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
  const [showExplainer, setShowExplainer] = useState(false);
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

  const nextFeed = nextFeedTime(feeds, derived.hourlyRate);

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

      {/* Daily target */}
      <div className="bg-slate-800 rounded-xl p-4 mb-4">
        <div className="text-sm text-slate-400 mb-1">Daily target</div>
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-semibold text-slate-100">{Math.round(derived.dailyTargetMl)} ml</span>
          <span className="text-slate-400 text-sm">&middot;</span>
          <span className="text-lg font-semibold text-slate-300">{(derived.dailyTargetMl / derived.milkPerBottle).toFixed(1)} &times; {settings.standardBottleVolume} ml bottles</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {settings.weightKg} kg &times; {settings.mlPerKgPerDay} ml/kg/day &middot; prepared formula ml
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="relative">
          <StatusBadge
            label="Strict 24h"
            value={`${Math.round(strict24h)} ml`}
            percentage={strict24hPct}
            yellowThresholdPct={settings.yellowThresholdPct}
            redThresholdPct={settings.redThresholdPct}
          />
          <button
            onClick={() => setShowStrictExplainer(true)}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs font-bold flex items-center justify-center leading-none"
            aria-label="How is Strict 24h calculated?"
          >
            ?
          </button>
        </div>
        <div className="relative">
          <StatusBadge
            label="Smoothed 24h"
            value={`${smoothedBottles.toFixed(1)} bottles`}
            percentage={smoothedPct}
            yellowThresholdPct={settings.yellowThresholdPct}
            redThresholdPct={settings.redThresholdPct}
          />
          <button
            onClick={() => setShowExplainer(true)}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs font-bold flex items-center justify-center leading-none"
            aria-label="How is Smoothed 24h calculated?"
          >
            ?
          </button>
        </div>
      </div>

      {showStrictExplainer && (
        <Strict24hExplainer onClose={() => setShowStrictExplainer(false)} />
      )}

      {showExplainer && derived && (
        <SmoothedExplainer
          onClose={() => setShowExplainer(false)}
          hourlyRate={derived.hourlyRate}
          standardBottleVolume={settings.standardBottleVolume}
          dailyTargetMl={derived.dailyTargetMl}
          feeds={feeds}
          now={smoothedAt}
        />
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
              <div className="text-xs text-slate-500 mt-1">
                {lastFeed ? `based on ${lastFeed.volume} ml bottle` : `ideal: ${derived.idealIntervalHours.toFixed(1)}h`}
              </div>
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
