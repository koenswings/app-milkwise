"use client";

import { useState, useEffect, Suspense } from "react";
import { addFeed, getFeeds, generateId, getSettings } from "@/lib/store";
import { formatDateTime } from "@/lib/formatTime";
import { waterToMilk, milkToWater } from "@/lib/calculations";
import { Feed, Settings } from "@/types";
import BottomNav from "@/components/BottomNav";
import { useRouter, useSearchParams } from "next/navigation";

const QUICK_VOLUMES = [30, 60, 90, 120, 150];

function nowDatetimeString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function LogPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // §3.6 Pre-fill bottle size from a ?recommend= query param
  const recParam = Number(searchParams.get("recommend"));
  const recStatus = searchParams.get("recStatus") ?? "optimal"; // "optimal" | "overfed" | "capped"
  const hasRec = Number.isFinite(recParam) && recParam > 0;
  const initialBottle = hasRec ? recParam : 90;

  const [datetime, setDatetime] = useState(nowDatetimeString);
  const [datetimeEdited, setDatetimeEdited] = useState(false);
  const [bottleSize, setBottleSize] = useState<number>(initialBottle); // selected bottle size in water ml
  const [inputUnit, setInputUnit] = useState<'water' | 'milk'>('milk');
  const [volume, setVolume] = useState<string>(String(Math.round(waterToMilk(initialBottle)))); // displayed in inputUnit
  const [saving, setSaving] = useState(false);
  const [recentFeeds, setRecentFeeds] = useState<Feed[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [recommendedSize, setRecommendedSize] = useState<number | null>(hasRec ? recParam : null);

  // Keep datetime current - refresh every 30s and on focus, but only if not manually edited.
  // This handles midnight crossover even if the tab stays open all night.
  useEffect(() => {
    const refresh = () => {
      if (!datetimeEdited) setDatetime(nowDatetimeString());
    };
    const interval = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [datetimeEdited]);

  useEffect(() => {
    Promise.all([getFeeds(), getSettings()]).then(([feeds, s]) => {
      const sorted = [...feeds].sort((a, b) => b.timestamp - a.timestamp);
      setRecentFeeds(sorted.slice(0, 3));
      setSettings(s);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entered = parseFloat(volume);
    // Storage is always in water ml; convert if user entered milk ml
    const vol = inputUnit === 'milk' ? Math.round(milkToWater(entered)) : Math.round(entered);
    if (isNaN(vol) || vol <= 0) return;

    setSaving(true);
    const timestamp = new Date(datetime).getTime();
    const targetMlPerDay = settings ? Math.round(settings.weightKg * settings.mlPerKgPerDay) : undefined;
    await addFeed({
      id: generateId(),
      timestamp,
      volume: vol,
      ...(targetMlPerDay !== undefined ? { targetMlPerDay } : {}),
    });
    setSaving(false);
    router.push("/");
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-slate-100 mb-2">➕ Log Feed</h1>
      <div className="bg-slate-800 rounded-xl p-3 mb-4 text-xs text-slate-400 leading-relaxed">
        <p className="mb-1">Log <strong className="text-slate-300">when you started</strong> giving the bottle and the <strong className="text-slate-300">total milk given</strong> in that sitting.</p>
        <p>If the baby didn&apos;t finish in one go, give the total across all steps at the end - but use the <strong className="text-slate-300">start time</strong> of the first step.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bottle size selector */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Bottle size (water ml)</label>
          <div className="flex gap-2">
            {QUICK_VOLUMES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setBottleSize(v);
                  setVolume(inputUnit === 'milk' ? String(Math.round(waterToMilk(v))) : String(v));
                  // Parent picked a different size → recommendation overridden
                  if (v !== recommendedSize) setRecommendedSize(null);
                }}
                className={`relative flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  bottleSize === v
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {v} ml
                {recommendedSize === v && <span className="ml-1 text-green-400">✓</span>}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {bottleSize} ml water = {Math.round(waterToMilk(bottleSize))} ml milk
          </p>
          {recommendedSize !== null && (
            <p className={`text-xs mt-1 ${recStatus === 'overfed' ? 'text-amber-400' : 'text-green-400'}`}>
              {recStatus === 'overfed'
                ? `Baby is above daily target. Smallest bottle: ${recommendedSize} ml water = ${Math.round(waterToMilk(recommendedSize))} ml milk.`
                : recStatus === 'capped'
                ? `Large deficit - even a full ${recommendedSize} ml water (${Math.round(waterToMilk(recommendedSize))} ml milk) won't fully cover it.`
                : `${recommendedSize} ml water = ${Math.round(waterToMilk(recommendedSize))} ml milk - brings baby closest to daily target.`}
            </p>
          )}
        </div>

        {/* Volume — pre-filled from bottle pick, editable, with water/milk toggle */}
        <div>
          <label className="block text-sm text-slate-400 mb-1">
            {inputUnit === 'milk' ? 'Total milk given (ml)' : 'Total water used (ml)'} — edit if baby didn&apos;t finish
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              min="1"
              max="500"
              step="any"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 text-lg focus:outline-none focus:border-blue-500"
            />
            {/* Water / Milk toggle */}
            <div className="flex rounded overflow-hidden border border-slate-600 text-sm shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (inputUnit === 'milk') {
                    const milkVal = parseFloat(volume);
                    if (!isNaN(milkVal)) setVolume(String(Math.round(milkToWater(milkVal))));
                    setInputUnit('water');
                  }
                }}
                className={`px-3 py-2 ${inputUnit === 'water' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
              >water</button>
              <button
                type="button"
                onClick={() => {
                  if (inputUnit === 'water') {
                    const waterVal = parseFloat(volume);
                    if (!isNaN(waterVal)) setVolume(String(Math.round(waterToMilk(waterVal))));
                    setInputUnit('milk');
                  }
                }}
                className={`px-3 py-2 ${inputUnit === 'milk' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
              >milk</button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {inputUnit === 'milk'
              ? `= ${Math.round(milkToWater(parseFloat(volume) || 0))} ml water`
              : `= ${Math.round(waterToMilk(parseFloat(volume) || 0))} ml milk`}
          </p>
        </div>

        {/* Date & time */}
        <div>
          <label className="block text-sm text-slate-400 mb-1">Date & time</label>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => { setDatetime(e.target.value); setDatetimeEdited(true); }}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-lg transition-colors"
        >
          {saving ? "Saving..." : "Save Feed"}
        </button>
      </form>

      {recentFeeds.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-400 mb-3">Recent feeds</h2>
          <div className="space-y-2">
            {recentFeeds.map((f) => {
              const d = new Date(f.timestamp);
              return (
                <div key={f.id} className="bg-slate-800 rounded-lg px-4 py-3 flex justify-between items-center">
                  <span className="text-slate-300">
                    {formatDateTime(f.timestamp, settings?.timeFormat)}
                  </span>
                  <span className="font-semibold text-blue-300">{f.volume} ml</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-slate-400">Loading...</div></div>}>
      <LogPageInner />
    </Suspense>
  );
}
