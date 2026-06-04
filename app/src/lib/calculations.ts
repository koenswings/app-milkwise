import { Feed, Settings, DerivedSettings, FeedWithCredit } from "@/types";

export function deriveSettings(settings: Settings): DerivedSettings {
  const dailyTargetMl = settings.weightKg * settings.mlPerKgPerDay;
  const hourlyRate = dailyTargetMl / 24;
  const idealIntervalHours = settings.standardBottleVolume / hourlyRate;
  return { dailyTargetMl, hourlyRate, idealIntervalHours };
}

export function bottleCredit(
  ageHours: number,
  volume: number,
  hourlyRate: number
): number {
  if (ageHours <= 24) {
    return volume;
  } else {
    const decay = hourlyRate * (ageHours - 24);
    return Math.max(0, volume - decay);
  }
}

export function strict24hTotal(feeds: Feed[], now: number = Date.now()): number {
  const cutoff = now - 24 * 60 * 60 * 1000;
  return feeds
    .filter((f) => f.timestamp >= cutoff)
    .reduce((sum, f) => sum + f.volume, 0);
}

export function smoothedEffective(
  feeds: Feed[],
  hourlyRate: number,
  standardBottleVolume: number,
  now: number = Date.now()
): { totalMl: number; bottles: number } {
  const totalMl = feeds.reduce((sum, f) => {
    const ageHours = (now - f.timestamp) / (1000 * 60 * 60);
    return sum + bottleCredit(ageHours, f.volume, hourlyRate);
  }, 0);
  const bottles = totalMl / standardBottleVolume;
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
      const creditMl = bottleCredit(ageHours, f.volume, hourlyRate);
      return { ...f, ageHours, creditMl };
    });
}

export function nextFeedTime(
  feeds: Feed[],
  idealIntervalHours: number
): number | null {
  if (feeds.length === 0) return null;
  const lastFeed = feeds.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
  return lastFeed.timestamp + idealIntervalHours * 60 * 60 * 1000;
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

export function dailyTotals(
  feeds: Feed[],
  days: number,
  currentTargetMl: number
): Array<{ date: string; totalMl: number; count: number; targetMl: number }> {
  const now = new Date();
  const result: Array<{ date: string; totalMl: number; count: number; targetMl: number }> = [];

  // Sort all feeds by timestamp ascending for efficient target lookup
  const sortedFeeds = [...feeds].sort((a, b) => a.timestamp - b.timestamp);

  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(day.getDate() - d);
    const dateStr = day.toISOString().slice(0, 10);
    const start = new Date(dateStr).getTime();
    const end = start + 24 * 60 * 60 * 1000;

    const dayFeeds = feeds.filter((f) => f.timestamp >= start && f.timestamp < end);

    // Find the most recent feed on or before end of this day that has a stamped target
    const feedsUpToEndOfDay = sortedFeeds.filter(
      (f) => f.timestamp < end && f.targetMlPerDay !== undefined
    );
    const lastStampedFeed = feedsUpToEndOfDay[feedsUpToEndOfDay.length - 1];
    const targetMl = lastStampedFeed ? lastStampedFeed.targetMlPerDay! : currentTargetMl;

    result.push({
      date: dateStr,
      totalMl: dayFeeds.reduce((sum, f) => sum + f.volume, 0),
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
