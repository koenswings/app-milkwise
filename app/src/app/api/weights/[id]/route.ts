import { NextResponse } from 'next/server';
import { readWeights, writeWeights } from '@/lib/server-weights';
import { readSettings, writeSettings } from '@/lib/server-store';

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await (context.params instanceof Promise ? context.params : Promise.resolve(context.params));
    const body = await req.json();
    const weights = readWeights().map(w =>
      w.id === params.id ? { ...w, ...body } : w
    );
    writeWeights(weights);
    const sorted = [...weights].sort((a, b) => b.timestamp - a.timestamp);
    if (sorted.length) { const s = readSettings(); s.weightKg = sorted[0].weightKg; writeSettings(s); }
    return NextResponse.json({ ok: true });
  } catch(e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await (context.params instanceof Promise ? context.params : Promise.resolve(context.params));
    const weights = readWeights().filter(w => w.id !== params.id);
    writeWeights(weights);
    const sorted = [...weights].sort((a, b) => b.timestamp - a.timestamp);
    if (sorted.length) { const s = readSettings(); s.weightKg = sorted[0].weightKg; writeSettings(s); }
    return NextResponse.json({ ok: true });
  } catch(e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
