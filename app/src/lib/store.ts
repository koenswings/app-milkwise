"use client";

import { Feed, Settings } from "@/types";

const MIGRATED_KEY = "bmt_migrated_v2";

// RFC4122 v4 UUID — works on plain HTTP (no secure context needed)
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch {}
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Server API ────────────────────────────────────────────────────────────

export async function getFeeds(): Promise<Feed[]> {
  const res = await fetch("/api/feeds", { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function saveFeeds(feeds: Feed[]): Promise<void> {
  await fetch("/api/feeds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(feeds),
  });
}

export async function addFeed(feed: Feed): Promise<Feed[]> {
  const feeds = await getFeeds();
  const updated = [...feeds, feed];
  await saveFeeds(updated);
  return updated;
}

export async function updateFeed(id: string, partial: Partial<Feed>): Promise<Feed[]> {
  const feeds = await getFeeds();
  const updated = feeds.map((f) => (f.id === id ? { ...f, ...partial } : f));
  await saveFeeds(updated);
  return updated;
}

export async function deleteFeed(id: string): Promise<Feed[]> {
  const feeds = await getFeeds();
  const updated = feeds.filter((f) => f.id !== id);
  await saveFeeds(updated);
  return updated;
}

const DEFAULT_SETTINGS = { weightKg: 6.27, mlPerKgPerDay: 150, standardBottleVolume: 90, displayBottleVolumeWater: 90, yellowThresholdPct: 5, redThresholdPct: 10, timeFormat: '24h' as const, maxCorrectionPct: 25, useTargetAwarePredictor: true };

export async function getSettings(): Promise<Settings> {
  const res = await fetch("/api/settings", { cache: "no-store" });
  if (!res.ok) return DEFAULT_SETTINGS;
  const saved = await res.json();
  // Merge defaults so existing saved settings get new fields
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}

// ─── One-time localStorage → server migration ──────────────────────────────

export async function migrateFromLocalStorage(): Promise<{ feeds: number } | null> {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem(MIGRATED_KEY)) return null;

  const rawFeeds = localStorage.getItem("bmt_feeds");
  const rawSettings = localStorage.getItem("bmt_settings");

  if (!rawFeeds && !rawSettings) {
    // Nothing to migrate, just mark as done
    localStorage.setItem(MIGRATED_KEY, "1");
    return null;
  }

  let migratedFeeds = 0;

  try {
    if (rawFeeds) {
      const feeds = JSON.parse(rawFeeds) as Feed[];
      if (feeds.length > 0) {
        // Merge with any existing server feeds (avoid duplicates by id)
        const serverFeeds = await getFeeds();
        const serverIds = new Set(serverFeeds.map((f) => f.id));
        const newFeeds = feeds.filter((f) => !serverIds.has(f.id));
        await saveFeeds([...serverFeeds, ...newFeeds]);
        migratedFeeds = newFeeds.length;
      }
    }

    if (rawSettings) {
      const settings = JSON.parse(rawSettings) as Settings;
      await saveSettings(settings);
    }

    // Clear localStorage after successful migration
    localStorage.removeItem("bmt_feeds");
    localStorage.removeItem("bmt_settings");
    localStorage.setItem(MIGRATED_KEY, "1");

    return { feeds: migratedFeeds };
  } catch (e) {
    console.error("Migration failed:", e);
    return null;
  }
}

// ─── CSV export (client-side) ──────────────────────────────────────────────

export function exportCsv(feeds: Feed[]): void {
  const sorted = [...feeds].sort((a, b) => a.timestamp - b.timestamp);
  const rows = [
    ["#", "Date", "Time", "Volume (ml)"],
    ...sorted.map((f, i) => {
      const d = new Date(f.timestamp);
      return [
        String(i + 1),
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        String(f.volume),
      ];
    }),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `milk-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
