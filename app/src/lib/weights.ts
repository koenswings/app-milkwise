// Weight history utilities

export interface WeightEntry {
  id: string;
  timestamp: number;  // ms — when this weight was recorded
  weightKg: number;
}

/**
 * Returns the weight at time T.
 * Uses the most recent entry at or before T.
 * If T is before all entries, returns the earliest entry.
 * If weights is empty, returns the fallback.
 */
export function weightAtTime(t: number, weights: WeightEntry[], fallback: number): number {
  if (weights.length === 0) return fallback;
  // Sort ascending by timestamp
  const sorted = [...weights].sort((a, b) => a.timestamp - b.timestamp);
  // Find last entry at or before t
  let result = sorted[0]; // fallback to earliest
  for (const w of sorted) {
    if (w.timestamp <= t) result = w;
    else break;
  }
  return result.weightKg;
}

/** Daily target ml at time T */
export function dailyTargetAtTime(t: number, weights: WeightEntry[], mlPerKgPerDay: number, fallback: number): number {
  return weightAtTime(t, weights, fallback) * mlPerKgPerDay;
}

/** Hourly rate at time T */
export function hourlyRateAtTime(t: number, weights: WeightEntry[], mlPerKgPerDay: number, fallback: number): number {
  return dailyTargetAtTime(t, weights, mlPerKgPerDay, fallback) / 24;
}
