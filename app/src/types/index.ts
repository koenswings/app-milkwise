export interface Feed {
  id: string;
  timestamp: number; // Unix ms
  volume: number; // ml
  targetMlPerDay?: number; // target active at log time
}

export interface Settings {
  weightKg: number;
  mlPerKgPerDay: number;
  standardBottleVolume: number;
  yellowThresholdPct: number; // default 5 — within this % of target = on track
  redThresholdPct: number;    // default 10 — beyond this % of target = seriously off
  timeFormat: '24h' | '12h'; // default '24h'
}

export interface DerivedSettings {
  dailyTargetMl: number;
  hourlyRate: number;
  idealIntervalHours: number;
}

export interface FeedWithCredit extends Feed {
  ageHours: number;
  creditMl: number;
}
