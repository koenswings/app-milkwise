"use client";

import { useState, useEffect } from "react";
import { addFeed, getFeeds, generateId, getSettings } from "@/lib/store";
import { formatDateTime } from "@/lib/formatTime";
import { Feed, Settings } from "@/types";
import BottomNav from "@/components/BottomNav";
import { useRouter } from "next/navigation";

const QUICK_VOLUMES = [60, 90, 120];

function nowDateString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function nowTimeString(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

export default function LogPage() {
  const router = useRouter();
  const [date, setDate] = useState(nowDateString());
  const [time, setTime] = useState(nowTimeString());
  const [volume, setVolume] = useState<string>("90");
  const [saving, setSaving] = useState(false);
  const [recentFeeds, setRecentFeeds] = useState<Feed[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    Promise.all([getFeeds(), getSettings()]).then(([feeds, s]) => {
      const sorted = [...feeds].sort((a, b) => b.timestamp - a.timestamp);
      setRecentFeeds(sorted.slice(0, 3));
      setSettings(s);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const vol = parseFloat(volume);
    if (isNaN(vol) || vol <= 0) return;

    setSaving(true);
    const timestamp = new Date(`${date}T${time}`).getTime();
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
      <h1 className="text-2xl font-bold text-slate-100 mb-6">➕ Log Feed</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick volume buttons */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Quick volume</label>
          <div className="flex gap-2">
            {QUICK_VOLUMES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVolume(String(v))}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  volume === String(v)
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {v} ml
              </button>
            ))}
          </div>
        </div>

        {/* Volume input */}
        <div>
          <label className="block text-sm text-slate-400 mb-1">Volume (ml)</label>
          <input
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            min="1"
            max="500"
            step="any"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 text-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm text-slate-400 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm text-slate-400 mb-1">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-lg transition-colors"
        >
          {saving ? "Saving…" : "Save Feed"}
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
