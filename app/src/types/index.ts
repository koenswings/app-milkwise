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
  yellowThresholdPct: number;     // default 5 — within this % of target = on track
  redThresholdPct: number;        // default 10 — beyond this % of target = seriously off
  timeFormat: '24h' | '12h';     // default '24h'
  maxFeedGapPct: number;          // default 150 — max gap = this % of ideal interval (150% of 3h20 = 5h)
}

export interface NextFeedResult {
  timestamp: number;              // suggested next feed time (ms)
  balanceMl: number;              // current energy pool in ml formula
  capped: boolean;                // true if maxGap kicked in
}

export interface DerivedSettings {
  dailyTargetMl: number;      // prepared formula ml/day (milk ml)
  hourlyRate: number;         // prepared formula ml/hour (milk ml)
  idealIntervalHours: number; // hours between feeds
  milkPerBottle: number;      // prepared formula ml per standardBottleVolume of water
}

export interface FeedWithCredit extends Feed {
  ageHours: number;
  creditMl: number;
}
