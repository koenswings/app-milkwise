import { NextResponse } from 'next/server';
import { readWeights, writeWeights } from '@/lib/server-weights';
import { readSettings, writeSettings } from '@/lib/server-store';
import { WeightEntry } from '@/lib/weights';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function GET() {
  try {
    return NextResponse.json(readWeights());
  } catch(e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
  const body = await req.json();
  const entry: WeightEntry = {
    id: genId(),
    timestamp: body.timestamp ?? Date.now(),
    weightKg: Number(body.weightKg),
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
  } catch(e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
