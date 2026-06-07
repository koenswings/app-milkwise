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
 * Model E — Running Balance next feed predictor.
 *
 * The baby has one energy pool. Each bottle tops it up; it drains continuously
 * at hourlyRate between feeds. The next feed is when the pool hits zero.
 * Recovery is built-in: an overfed day has a larger pool → later next feed →
 * giving one standard bottle at that time returns the baby to normal rhythm.
 *
 * maxGap is expressed as a % of the ideal interval so it scales with bottle size.
 */
export function nextFeedTime(
  feeds: Feed[],
  hourlyRate: number,
  settings: Pick<Settings, 'standardBottleVolume' | 'maxFeedGapPct'>,
  selectedBottleVolume?: number  // override for next-bottle-size selector
): NextFeedResult | null {
  if (feeds.length === 0) return null;

  const lastFeedTs = feeds.reduce((a, b) => a.timestamp > b.timestamp ? a : b).timestamp;
  const windowMs = 24 * 3_600_000;
  // Only consider feeds within the last 24h — history older than that is fully
  // burned and must not inflate the balance across days.
  const recent = feeds.filter(f => f.timestamp >= lastFeedTs - windowMs);
  const sorted = [...recent].sort((a, b) => a.timestamp - b.timestamp);
  const standardMilk = waterToMilk(settings.standardBottleVolume); // the configured standard bottle
  const selectedMilk = waterToMilk(selectedBottleVolume ?? settings.standardBottleVolume); // what we plan to give next
  const milkPerBottle = standardMilk; // used for ideal interval and max gap
  const idealIntervalMs = (milkPerBottle / hourlyRate) * 3_600_000;
  const maxGapMs = idealIntervalMs * (settings.maxFeedGapPct / 100);

  // Walk feeds oldest → newest within the 24h window
  let balance = 0;
  let prevTs = sorted[0].timestamp;

  for (const feed of sorted) {
    const gapHours = (feed.timestamp - prevTs) / 3_600_000;
    balance = Math.max(0, balance - hourlyRate * gapHours) + waterToMilk(feed.volume);
    prevTs = feed.timestamp;
  }

  const lastFeed = sorted[sorted.length - 1];
  // "adjusted" = when to give the selected bottle so that after giving it,
  // the pool returns to exactly one standard bottle worth of energy.
  // gap = (balance - standardMilk + selectedMilk) / hourlyRate
  // A smaller selected bottle → smaller gap → earlier feed. A larger one → later.
  // If result < 0 (pool too low), give immediately (gap = 0).
  const rawGapMs = Math.max(0,
    ((balance - standardMilk + selectedMilk) / hourlyRate) * 3_600_000
  );
  const rawNext = lastFeed.timestamp + rawGapMs;
  const maxGapNext = lastFeed.timestamp + maxGapMs;
  const timestamp = Math.min(rawNext, maxGapNext);
  const capped = timestamp < rawNext;

  return { timestamp, balanceMl: Math.round(balance), capped };
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
