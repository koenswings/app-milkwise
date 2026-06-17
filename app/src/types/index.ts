export interface Feed {
  id: string;
  timestamp: number; // Unix ms
  volume: number; // ml
  targetMlPerDay?: number; // target active at log time
}

export interface Settings {
  weightKg: number;
  mlPerKgPerDay: number;
  standardBottleVolume: number;       // configured standard bottle (water ml) for Settings page
  displayBottleVolumeWater: number;   // bottle size (water ml) used to express bottles in Target/Status cards
  yellowThresholdPct: number;         // default 5
  redThresholdPct: number;            // default 10
  timeFormat: '24h' | '12h';
  maxCorrectionPct: number;           // default 25
  useTargetAwarePredictor: boolean;   // default true — Predictor 3 (T*). false = Predictor 2 (Formula S)
  nextBottleWaterMl: number;          // bottle size (water ml) assumed for next T* calculation
}

export interface NextFeedResult {
  timestamp: number;              // suggested next feed time (ms)
  balanceMl: number;              // energy balance ml (+ overfed, - underfed)
  capped: boolean;                // true if ±maxCorrectionPct cap was applied
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
