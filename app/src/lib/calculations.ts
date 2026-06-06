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
 * Option D recovery-aware next feed predictor.
 *
 * - Uses actual last bottle volume (not setting) for the ideal interval.
 * - Outside the green zone: applies a gradual correction spread over
 *   recoveryWindowHours, capped at ±1h.
 * - Always caps at maxFeedGapHours.
 * - Returns timestamp + correction info for display.
 */
export function nextFeedTime(
  feeds: Feed[],
  hourlyRate: number,
  smoothedTotal: number,
  dailyTargetMl: number,
  settings: Pick<Settings, 'yellowThresholdPct' | 'recoveryWindowHours' | 'maxFeedGapHours' | 'standardBottleVolume'>
): NextFeedResult | null {
  if (feeds.length === 0) return null;

  const lastFeed = feeds.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
  // Always use standardBottleVolume for the base interval.
  // A small top-up bottle (e.g. 30ml) must NOT shorten the predicted window —
  // it just means the baby got a little extra, not that the next full feed is soon.
  // Option D correction handles the over/underfed timing adjustment on top of this.
  const standardMilkMl = waterToMilk(settings.standardBottleVolume);
  const idealIntervalMs = (standardMilkMl / hourlyRate) * 3_600_000;
  const idealNext = lastFeed.timestamp + idealIntervalMs;
  const maxGapNext = lastFeed.timestamp + settings.maxFeedGapHours * 3_600_000;

  const pct = (smoothedTotal / dailyTargetMl) * 100;
  const inGreenZone = Math.abs(pct - 100) <= settings.yellowThresholdPct;

  if (inGreenZone) {
    return { timestamp: Math.min(idealNext, maxGapNext), correctionMinutes: 0, inGreenZone: true };
  }

  // Recovery correction
  const surplusMl = smoothedTotal - dailyTargetMl; // positive = overfed
  const idealIntervalHours = idealIntervalMs / 3_600_000;
  const feedsInWindow = settings.recoveryWindowHours / idealIntervalHours;
  const correctionPerFeed = surplusMl / feedsInWindow;
  const rawCorrectionMs = (correctionPerFeed / hourlyRate) * 3_600_000;
  const correctionMs = Math.max(-3_600_000, Math.min(3_600_000, rawCorrectionMs)); // ±1h cap

  const correctedNext = Math.min(idealNext + correctionMs, maxGapNext);
  const correctionMinutes = Math.round((correctedNext - idealNext) / 60_000);

  return { timestamp: correctedNext, correctionMinutes, inGreenZone: false };
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
