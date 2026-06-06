import fs from "fs";
import path from "path";
import { Feed, Settings } from "@/types";

// Data stored on the Pi filesystem, persists across restarts
// Default to a directory outside the Next.js project root to prevent
// Turbopack from watching data files and triggering hot reloads on every write.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "../../data");
const FEEDS_FILE = path.join(DATA_DIR, "feeds.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

const DEFAULT_SETTINGS: Settings = {
  weightKg: 6.27,
  mlPerKgPerDay: 150,
  standardBottleVolume: 90,
  yellowThresholdPct: 5,
  redThresholdPct: 10,
  timeFormat: '24h' as const,
  maxFeedGapPct: 150,
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readFeeds(): Feed[] {
  ensureDir();
  if (!fs.existsSync(FEEDS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FEEDS_FILE, "utf8")) as Feed[];
  } catch {
    return [];
  }
}

export function writeFeeds(feeds: Feed[]): void {
  ensureDir();
  fs.writeFileSync(FEEDS_FILE, JSON.stringify(feeds), "utf8");
}

export function readSettings(): Settings {
  ensureDir();
  if (!fs.existsSync(SETTINGS_FILE)) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8")) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: Settings): void {
  ensureDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings), "utf8");
}

export function migrateTargetStamps(currentTargetMl: number): void {
  const feeds = readFeeds();
  const needsMigration = feeds.some((f) => f.targetMlPerDay === undefined);
  if (!needsMigration) return;
  const migrated = feeds.map((f) =>
    f.targetMlPerDay !== undefined ? f : { ...f, targetMlPerDay: currentTargetMl }
  );
  writeFeeds(migrated);
}
