import { NextResponse } from 'next/server';
import { readWeights, writeWeights } from '@/lib/server-weights';
import { readSettings, writeSettings } from '@/lib/server-store';
import { WeightEntry } from '@/lib/weights';
import { randomUUID } from 'crypto';

export async function GET() {
  return NextResponse.json(readWeights());
}

export async function POST(req: Request) {
  const body = await req.json();
  const entry: WeightEntry = {
    id: randomUUID(),
    timestamp: body.timestamp ?? Date.now(),
    weightKg: body.weightKg,
  };
  const weights = readWeights();
  weights.push(entry);
  writeWeights(weights);
  // Keep settings.weightKg in sync with the most recent weight
  const sorted = [...weights].sort((a, b) => b.timestamp - a.timestamp);
  const settings = readSettings();
  settings.weightKg = sorted[0].weightKg;
  writeSettings(settings);
  return NextResponse.json(entry);
}
