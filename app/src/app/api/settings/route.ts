import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/server-store";
import { Settings } from "@/types";

export async function GET() {
  return NextResponse.json(readSettings());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const settings = body as Settings;
  writeSettings(settings);
  return NextResponse.json({ ok: true });
}
