import { NextRequest, NextResponse } from "next/server";
import { readFeeds, writeFeeds, readSettings, migrateTargetStamps } from "@/lib/server-store";
import { Feed } from "@/types";

export async function GET() {
  const s = readSettings();
  migrateTargetStamps(s.weightKg * s.mlPerKgPerDay);
  return NextResponse.json(readFeeds());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const feeds = body as Feed[];
  writeFeeds(feeds);
  return NextResponse.json({ ok: true });
}
