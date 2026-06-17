import { Feed, Settings, DerivedSettings, FeedWithCredit, NextFeedResult } from "@/types";

/**
 * Water → prepared formula conversion.
 *
 * The 150 ml/kg/day target refers to PREPARED FORMULA ml.
 * Logged feed volumes are in WATER ml (what you measure into the bottle).
 * The ratio is NOT constant — it varies by bottle size per manufacturer table:
 *
 *   Water ml | Formula ml
 *   ---------|-----------
 *       30   |    35
 *       60   |    70
 *       90   |   100
 *      120   |   135
 *      150   |   170
 *      180   |   200
 *      210   |   240
 *
 * For volumes between table entries, linear interpolation is used.
 * For volumes outside the table range, the nearest segment slope is extrapolated.
 */
export const FORMULA_TABLE: { water: number; formula: number }[] = [
  { water:  30, formula:  35 },
  { water:  60, formula:  70 },
  { water:  90, formula: 100 },
  { water: 120, formula: 135 },
  { water: 150, formula: 170 },
  { water: 180, formula: 200 },
  { water: 210, formula: 240 },
];

/** Convert prepared-formula ml back to water ml (inverse of waterToMilk). */
export function milkToWater(milkMl: number): number {
  const t = FORMULA_TABLE;
  // Build inverse table
  const inv = t.map(p => ({ milk: p.formula, water: p.water }));
  if (milkMl <= inv[0].milk) {
    const s = (inv[1].water - inv[0].water) / (inv[1].milk - inv[0].milk);
    return inv[0].water + s * (milkMl - inv[0].milk);
  }
  const last = inv.length - 1;
  if (milkMl >= inv[last].milk) {
    const s = (inv[last].water - inv[last-1].water) / (inv[last].milk - inv[last-1].milk);
    return inv[last].water + s * (milkMl - inv[last].milk);
  }
  for (let i = 0; i < last; i++) {
    if (milkMl >= inv[i].milk && milkMl <= inv[i+1].milk) {
      const f = (milkMl - inv[i].milk) / (inv[i+1].milk - inv[i].milk);
      return inv[i].water + f * (inv[i+1].water - inv[i].water);
    }
  }
  return milkMl * (90 / 100);
}

/** Convert a logged water-volume to prepared-formula volume using interpolation. */
export function waterToMilk(waterMl: number): number {
  const t = FORMULA_TABLE;
  // Below lowest entry — extrapolate from first segment
  if (waterMl <= t[0].water) {
    const slope = (t[1].formula - t[0].formula) / (t[1].water - t[0].water);
    return t[0].formula + slope * (waterMl - t[0].water);
  }
  // Above highest entry — extrapolate from last segment
  const last = t.length - 1;
  if (waterMl >= t[last].water) {
    const slope = (t[last].formula - t[last - 1].formula) / (t[last].water - t[last - 1].water);
    return t[last].formula + slope * (waterMl - t[last].water);
  }
  // Interpolate between bracketing entries
  for (let i = 0; i < last; i++) {
    if (waterMl >= t[i].water && waterMl <= t[i + 1].water) {
      const frac = (waterMl - t[i].water) / (t[i + 1].water - t[i].water);
      return t[i].formula + frac * (t[i + 1].formula - t[i].formula);
    }
  }
  // Fallback (should never reach here)
  return waterMl * (100 / 90);
}

/** @deprecated use FORMULA_TABLE — no single ratio exists */
export const WATER_TO_MILK_RATIO = 100 / 90; // 90ml water → 100ml formula (most common bottle)

export function deriveSettings(settings: Settings): DerivedSettings {
  const dailyTargetMl = settings.weightKg * settings.mlPerKgPerDay; // milk ml
  const hourlyRate = dailyTargetMl / 24;                             // milk ml/hour
  const milkPerBottle = waterToMilk(settings.standardBottleVolume);  // milk ml per bottle
  const idealIntervalHours = milkPerBottle / hourlyRate;
  return { dailyTargetMl, hourlyRate, idealIntervalHours, milkPerBottle };
}

/**
 * Bottle credit — operates in MILK ml.
 * Pass the milk-converted volume (waterToMilk(f.volume)) and milk hourlyRate.
 */
export function bottleCredit(
  ageHours: number,
  milkMl: number,
  hourlyRate: number
): number {
  if (ageHours <= 24) {
    return milkMl;
  } else {
    const decay = hourlyRate * (ageHours - 24);
    return Math.max(0, milkMl - decay);
  }
}

/** Returns total in MILK ml so it can be compared against dailyTargetMl. */
export function strict24hTotal(feeds: Feed[], now: number = Date.now()): number {
  const cutoff = now - 24 * 60 * 60 * 1000;
  return feeds
    .filter((f) => f.timestamp >= cutoff)
    .reduce((sum, f) => sum + waterToMilk(f.volume), 0);
}

/** Returns totalMl in MILK ml; bottles = milkMl / milkPerBottle. */
export function smoothedEffective(
  feeds: Feed[],
  hourlyRate: number,
  standardBottleVolume: number,
  now: number = Date.now()
): { totalMl: number; bottles: number } {
  const milkPerBottle = waterToMilk(standardBottleVolume);
  const totalMl = feeds.reduce((sum, f) => {
    const ageHours = (now - f.timestamp) / (1000 * 60 * 60);
    return sum + bottleCredit(ageHours, waterToMilk(f.volume), hourlyRate);
  }, 0);
  const bottles = totalMl / milkPerBottle;
  return { totalMl, bottles };
}

export function feedsWithCredit(
  feeds: Feed[],
  hourlyRate: number,
  now: number = Date.now()
): FeedWithCredit[] {
  return [...feeds]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((f) => {
      const ageHours = (now - f.timestamp) / (1000 * 60 * 60);
      const creditMl = bottleCredit(ageHours, waterToMilk(f.volume), hourlyRate);
      return { ...f, ageHours, creditMl };
    });
}

/**
 * Compute smoothed total at a given reference time T, for Predictor 3.
 * Uses the same bottle_credit formula as smoothedEffective.
 */
export function smoothedAtTime(feeds: Feed[], hourlyRate: number, atMs: number): number {
  return feeds.reduce((sum, f) => {
    const ageHours = (atMs - f.timestamp) / 3_600_000;
    return sum + bottleCredit(ageHours, waterToMilk(f.volume), hourlyRate);
  }, 0);
}

/**
 * Predictor 3 — Target-aware adjusted next bottle (T*)
 *
 * Find T* such that smoothed(T*) = dailyTargetMl − milkPerBottle.
 * Giving a standard bottle at T* produces smoothed = dailyTargetMl exactly (if not capped).
 *
 * Uses binary search over [lastFeed, lastFeed + maxCorrectionMs].
 * Falls back to T_min when underfed (smoothed already below target − bottle).
 */
function findTargetAwareNext(
  feeds: Feed[],
  hourlyRate: number,
  dailyTargetMl: number,
  lastFeed: Feed,
  standardNext: number,
  maxCorrectionMs: number,
  nextBottleMilkMl: number
): { timestamp: number; capped: boolean } {
  const targetBefore = dailyTargetMl - nextBottleMilkMl;
  const T_min = lastFeed.timestamp;
  const T_max = standardNext + maxCorrectionMs;

  const s_min = smoothedAtTime(feeds, hourlyRate, T_min);

  // Underfed: smoothed already ≤ target-before-feed → give now
  if (s_min <= targetBefore) {
    return { timestamp: T_min, capped: false };
  }

  const s_max = smoothedAtTime(feeds, hourlyRate, T_max);

  // Still overfed at max gap → cap applies
  if (s_max > targetBefore) {
    return { timestamp: T_max, capped: true };
  }

  // Binary search for T* where smoothed(T*) = targetBefore
  let lo = T_min, hi = T_max;
  for (let i = 0; i < 30; i++) {
    const mid = Math.floor((lo + hi) / 2);
    if (smoothedAtTime(feeds, hourlyRate, mid) > targetBefore) {
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < 60_000) break; // 1-minute precision
  }
  return { timestamp: Math.floor((lo + hi) / 2), capped: false };
}

/**
 * Next bottle predictor (design doc: next-session-predictor-design.md)
 *
 * Standard: standardNext = lastFeed.timestamp + waterToMilk(lastFeed.volume) / hourlyRate
 *
 * Predictor 2 (Formula S): adjustedNext = standard + clamp(surplus/hourlyRate, ±max)
 * Predictor 3 (T*, default): binary search for T* where smoothed(T*) = target − bottle
 *
 * settings.useTargetAwarePredictor controls which is used.
 */
export function nextFeedTime(
  feeds: Feed[],
  hourlyRate: number,
  smoothedTotal: number,
  dailyTargetMl: number,
  settings: Pick<Settings, 'maxCorrectionPct' | 'useTargetAwarePredictor' | 'nextBottleWaterMl'>
): NextFeedResult | null {
  if (feeds.length === 0) return null;

  const lastFeed = feeds.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
  // Use the NEXT bottle size for the standard interval and T_max window.
  // P3 is planning when to give the next bottle — its interval is how long that
  // bottle lasts, not how long the last bottle lasted.
  const nextBottleMilkMl = waterToMilk(settings.nextBottleWaterMl);
  const standardIntervalMs = (nextBottleMilkMl / hourlyRate) * 3_600_000;
  const standardNext = lastFeed.timestamp + standardIntervalMs;
  const maxCorrectionMs = standardIntervalMs * (settings.maxCorrectionPct / 100);

  if (settings.useTargetAwarePredictor) {
    // Predictor 3: T* binary search
    const { timestamp, capped } = findTargetAwareNext(
      feeds, hourlyRate, dailyTargetMl, lastFeed, standardNext, maxCorrectionMs, nextBottleMilkMl
    );
    const surplus = smoothedTotal - dailyTargetMl;
    return { timestamp, balanceMl: Math.round(surplus), capped };
  } else {
    // Predictor 2: Formula S
    const surplus = smoothedTotal - dailyTargetMl;
    const rawCorrectionMs = (surplus / hourlyRate) * 3_600_000;
    const clampedCorrection = Math.max(-maxCorrectionMs, Math.min(maxCorrectionMs, rawCorrectionMs));
    const timestamp = standardNext + clampedCorrection;
    const capped = Math.abs(clampedCorrection - rawCorrectionMs) > 1;
    return { timestamp, balanceMl: Math.round(surplus), capped };
  }
}

/**
 * Inverse predictor: given feeding right now, what bottle size is optimal?
 * Returns the recommended water ml (snapped to nearest standard FORMULA_TABLE entry).
 */
export function bestBottleSizeNow(
  feeds: Feed[],
  hourlyRate: number,
  dailyTargetMl: number,
  now: number
): { waterMl: number; milkMl: number; status: "optimal" | "overfed" | "capped"; deficitMl: number } {
  const currentSmoothed = smoothedAtTime(feeds, hourlyRate, now);
  const deficitMl = dailyTargetMl - currentSmoothed;

  // At or above target, or deficit too small to justify even the smallest bottle (< 15 ml).
  // Recommending 30 ml water (35 ml milk) for a 3 ml deficit makes no sense.
  const MIN_DEFICIT_ML = 15;
  if (deficitMl <= 0 || deficitMl < MIN_DEFICIT_ML) {
    return { waterMl: 0, milkMl: 0, status: "overfed", deficitMl };
  }

  // Largest practical bottle is 150 ml water / 170 ml formula
  const MAX_WATER = 150, MAX_FORMULA = 170;

  // Deficit exceeds the largest practical bottle — cap
  if (deficitMl > MAX_FORMULA) {
    return { waterMl: MAX_WATER, milkMl: MAX_FORMULA, status: "capped", deficitMl };
  }

  // Snap to the FORMULA_TABLE entry whose formula value is closest to the deficit
  const candidates = FORMULA_TABLE.filter((e) => e.water <= MAX_WATER);
  const closest = candidates.reduce((best, entry) =>
    Math.abs(entry.formula - deficitMl) < Math.abs(best.formula - deficitMl) ? entry : best
  );
  return { waterMl: closest.water, milkMl: closest.formula, status: "optimal", deficitMl };
}

export function avgIntervalHours(feeds: Feed[]): number | null {
  const sorted = [...feeds].sort((a, b) => a.timestamp - b.timestamp);
  if (sorted.length < 2) return null;
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push((sorted[i].timestamp - sorted[i - 1].timestamp) / (1000 * 60 * 60));
  }
  return intervals.reduce((a, b) => a + b, 0) / intervals.length;
}

export function consistencyScore(feeds: Feed[]): number | null {
  const sorted = [...feeds].sort((a, b) => a.timestamp - b.timestamp);
  if (sorted.length < 3) return null;
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push((sorted[i].timestamp - sorted[i - 1].timestamp) / (1000 * 60 * 60));
  }
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / intervals.length;
  return Math.sqrt(variance);
}

function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dailyTotals(
  feeds: Feed[],
  days: number,
  currentTargetMl: number
): Array<{ date: string; totalMl: number; count: number; targetMl: number }> {
  const now = new Date();
  const result: Array<{ date: string; totalMl: number; count: number; targetMl: number }> = [];

  const sortedFeeds = [...feeds].sort((a, b) => a.timestamp - b.timestamp);

  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(day.getDate() - d);
    const dateStr = localDateStr(day);
    const start = new Date(`${dateStr}T00:00:00`).getTime();
    const end = start + 24 * 60 * 60 * 1000;

    const dayFeeds = feeds.filter((f) => f.timestamp >= start && f.timestamp < end);

    const feedsUpToEndOfDay = sortedFeeds.filter(
      (f) => f.timestamp < end && f.targetMlPerDay !== undefined
    );
    const lastStampedFeed = feedsUpToEndOfDay[feedsUpToEndOfDay.length - 1];
    const targetMl = lastStampedFeed ? lastStampedFeed.targetMlPerDay! : currentTargetMl;

    result.push({
      date: dateStr,
      // Convert water ml → milk ml so daily totals are on the same scale as the target
      totalMl: dayFeeds.reduce((sum, f) => sum + waterToMilk(f.volume), 0),
      count: dayFeeds.length,
      targetMl,
    });
  }
  return result;
}

export function periodTotal(feeds: Feed[], days: number, now: number = Date.now()): number {
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return feeds
    .filter((f) => f.timestamp >= cutoff)
    .reduce((sum, f) => sum + f.volume, 0);
}

export function statusColor(
  pct: number,
  yellowThresholdPct = 5,
  redThresholdPct = 10
): string {
  const diff = Math.abs(pct - 100);
  if (diff <= yellowThresholdPct) return 'green';
  if (diff <= redThresholdPct) return 'yellow';
  return 'red';
}

export function statusHexColor(
  pct: number,
  yellowThresholdPct = 5,
  redThresholdPct = 10
): string {
  const diff = Math.abs(pct - 100);
  if (diff <= yellowThresholdPct) return '#4ade80'; // green
  if (diff <= redThresholdPct) return '#facc15';    // yellow
  return '#f87171';                                  // red
}
