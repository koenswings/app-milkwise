"use client";

import { useEffect, useState } from "react";
import { getFeeds, deleteFeed, updateFeed, getSettings, getWeights, addWeight, updateWeight, deleteWeight } from "@/lib/store";
import { formatDateTime } from "@/lib/formatTime";
import { feedsWithCredit } from "@/lib/calculations";
import { FeedWithCredit, Settings } from "@/types";
import { WeightEntry } from "@/lib/weights";
import BottomNav from "@/components/BottomNav";

function toDatetimeLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HistoryPage() {
  const [feeds, setFeeds] = useState<FeedWithCredit[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [view, setView] = useState<'feeds'|'weights'>('feeds');
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editVolume, setEditVolume] = useState("");
  const [editDatetime, setEditDatetime] = useState("");
  const [editWeightId, setEditWeightId] = useState<string|null>(null);
  const [editWeightKg, setEditWeightKg] = useState("");
  const [editWeightTs, setEditWeightTs] = useState("");

  async function load() {
    const [f, s, w] = await Promise.all([getFeeds(), getSettings(), getWeights()]);
    const hourlyRate = (s.weightKg * s.mlPerKgPerDay) / 24;
    setFeeds(feedsWithCredit(f, hourlyRate));
    setSettings(s);
    setWeights(w.sort((a, b) => b.timestamp - a.timestamp));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this feed?")) return;
    await deleteFeed(id);
    await load();
  }

  function startEdit(f: FeedWithCredit) {
    setEditId(f.id);
    setEditVolume(String(f.volume));
    setEditDatetime(toDatetimeLocal(f.timestamp));
  }

  async function handleEditSave(id: string) {
    const vol = parseFloat(editVolume);
    if (isNaN(vol) || vol <= 0) return;
    const ts = new Date(editDatetime).getTime();
    if (isNaN(ts)) return;
    await updateFeed(id, { volume: vol, timestamp: ts });
    setEditId(null);
    await load();
  }

  const filtered = feeds.filter((f) => {
    if (!search) return true;
    const d = new Date(f.timestamp);
    return d.toLocaleDateString().includes(search) ||
      d.toISOString().slice(0, 10).includes(search);
  });

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-100">📋 History</h1>
        <div className="flex gap-1">
          <button onClick={() => setView('feeds')} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${view==='feeds' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Feeds</button>
          <button onClick={() => setView('weights')} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${view==='weights' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>Weight</button>
        </div>
      </div>

      {view === 'feeds' && <input
        type="text"
        placeholder="Search by date (e.g. 2025-01)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 text-sm mb-4 focus:outline-none focus:border-blue-500"
      />}

      {view === 'weights' && (
        <div className="space-y-2">
          {weights.length === 0 && <div className="text-slate-400 text-center py-12">No weight entries yet</div>}
          {weights.map(w => {
            const isEditing = editWeightId === w.id;
            return (
              <div key={w.id} className="bg-slate-800 rounded-xl p-4">
                {isEditing ? (
                  <div className="space-y-2">
                    <input type="number" step="0.01" value={editWeightKg} onChange={e => setEditWeightKg(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm" />
                    <input type="datetime-local" value={editWeightTs} onChange={e => setEditWeightTs(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => setEditWeightId(null)} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">Cancel</button>
                      <button onClick={async () => {
                        const kg = parseFloat(editWeightKg);
                        if (!kg) return;
                        const ts = editWeightTs ? new Date(editWeightTs).getTime() : w.timestamp;
                        await updateWeight(w.id, { weightKg: kg, timestamp: ts });
                        setEditWeightId(null); load();
                      }} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-100">{w.weightKg} kg</div>
                      <div className="text-xs text-slate-400">{new Date(w.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditWeightId(w.id); setEditWeightKg(w.weightKg.toString()); setEditWeightTs(toDatetimeLocal(w.timestamp)); }}
                        className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                      <button onClick={async () => { if (!confirm('Delete?')) return; await deleteWeight(w.id); load(); }}
                        className="text-xs text-red-400 hover:text-red-300">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === 'feeds' && (filtered.length === 0 ? (
        <div className="text-slate-400 text-center py-12">No feeds logged yet</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f, i) => {
            const d = new Date(f.timestamp);
            const isEditing = editId === f.id;

            return (
              <div key={f.id} className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">#{filtered.length - i}</span>
                      <span className="text-sm font-medium text-slate-200">
                        {formatDateTime(f.timestamp, settings?.timeFormat)}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400 w-12">Volume</label>
                          <input
                            type="number"
                            value={editVolume}
                            onChange={(e) => setEditVolume(e.target.value)}
                            className="w-24 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-sm"
                            step="any"
                            autoFocus
                          />
                          <span className="text-slate-400 text-sm">ml</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400 w-12">Time</label>
                          <input
                            type="datetime-local"
                            value={editDatetime}
                            onChange={(e) => setEditDatetime(e.target.value)}
                            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-sm"
                          />
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => handleEditSave(f.id)}
                            className="text-green-400 text-sm font-medium px-3 py-1 border border-green-700 rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="text-slate-400 text-sm px-3 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4 mt-1 text-sm text-slate-400">
                        <span className="text-blue-300 font-semibold">{f.volume} ml</span>
                        <span>Age: {f.ageHours.toFixed(1)}h</span>
                        <span>Credit: {Math.round(f.creditMl)} ml</span>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(f)}
                        className="text-slate-400 hover:text-slate-200 text-sm px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1"
                      >
                        Del
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <BottomNav />
    </div>
  );
}
