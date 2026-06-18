"use client";

import { useEffect, useState, useRef } from "react";
import { getSettings, saveSettings, getFeeds, saveFeeds, generateId } from "@/lib/store";
import { deriveSettings } from "@/lib/calculations";
import { Settings, Feed } from "@/types";
import BottomNav from "@/components/BottomNav";
import { useRouter } from "next/navigation";

const APP_VERSION = "1.0.75";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    weightKg: 6.27,
    mlPerKgPerDay: 150,
    standardBottleVolume: 90,
    yellowThresholdPct: 5,
    redThresholdPct: 10,
    timeFormat: '24h',
    displayBottleVolumeWater: 90,
    maxCorrectionPct: 25,
    useTargetAwarePredictor: true,
    nextBottleWaterMl: 90,
  });
  const [saved, setSaved] = useState(false);
  // Local string values so inputs don't snap back while typing (e.g. clearing "90" to type "120")
  const [localValues, setLocalValues] = useState<Partial<Record<keyof Settings, string>>>({});
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const derived = deriveSettings(settings);

  async function handleSave() {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Update local display string while typing; don't commit until valid
  function handleChange(field: keyof Settings, value: string) {
    setLocalValues((prev) => ({ ...prev, [field]: value }));
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      setSettings((prev) => ({ ...prev, [field]: num }));
    }
  }

  // On blur: if empty/invalid, revert local display to committed setting value
  function handleBlur(field: keyof Settings) {
    setLocalValues((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  }

  function fieldValue(field: keyof Settings): string | number {
    return field in localValues ? (localValues[field] as string) : (settings[field] as number);
  }

  async function handleImport() {
    const lines = importText.trim().split("\n").filter(Boolean);
    const feeds: Feed[] = [];
    let skipped = 0;

    for (const line of lines) {
      // Support: "Date,Time,Volume" or "Date,Time,Volume ml" or just 3 CSV cols
      const parts = line.split(",").map((s) => s.trim());
      if (parts.length < 3) { skipped++; continue; }
      const [dateStr, timeStr, volRaw] = parts;
      // Skip header row
      if (dateStr.toLowerCase() === "date") continue;
      const volume = parseFloat(volRaw.replace(/[^0-9.]/g, ""));
      if (isNaN(volume) || volume <= 0) { skipped++; continue; }
      const ts = new Date(`${dateStr}T${timeStr}:00`).getTime();
      if (isNaN(ts)) { skipped++; continue; }
      feeds.push({ id: generateId(), timestamp: ts, volume });
    }

    if (feeds.length === 0) {
      setImportMsg("No valid rows found.");
      return;
    }

    const existing = await getFeeds();
    await saveFeeds([...existing, ...feeds]);
    setImportText("");
    setImportMsg(`✓ Imported ${feeds.length} feeds${skipped ? `, skipped ${skipped}` : ""}. Redirecting…`);
    setTimeout(() => router.push("/"), 1500);
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setImportText(text);
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">⚙️ Settings</h1>

      <div className="space-y-4 mb-6">
        <div className="bg-slate-800 rounded-xl p-4">
          <label className="block text-sm text-slate-400 mb-1">Baby weight (kg)</label>
          <input
            type="number"
            value={fieldValue("weightKg")}
            onChange={(e) => handleChange("weightKg", e.target.value)}
            onBlur={() => handleBlur("weightKg")}
            step="0.01"
            min="0.5"
            max="30"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 text-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <label className="block text-sm text-slate-400 mb-1">ml per kg per day</label>
          <input
            type="number"
            value={fieldValue("mlPerKgPerDay")}
            onChange={(e) => handleChange("mlPerKgPerDay", e.target.value)}
            onBlur={() => handleBlur("mlPerKgPerDay")}
            step="5"
            min="50"
            max="300"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 text-lg focus:outline-none focus:border-blue-500"
          />
        </div>



        <div className="bg-slate-800 rounded-xl p-4">
          <label className="block text-sm text-slate-400 mb-1">On-track zone (±%)</label>
          <input
            type="number"
            value={fieldValue("yellowThresholdPct")}
            onChange={(e) => handleChange("yellowThresholdPct", e.target.value)}
            onBlur={() => handleBlur("yellowThresholdPct")}
            step="1"
            min="1"
            max="49"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 text-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <label className="block text-sm text-slate-400 mb-1">Seriously off threshold (±%)</label>
          <input
            type="number"
            value={fieldValue("redThresholdPct")}
            onChange={(e) => handleChange("redThresholdPct", e.target.value)}
            onBlur={() => handleBlur("redThresholdPct")}
            step="1"
            min="1"
            max="49"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 text-lg focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-slate-500 mt-2">
            Within ±{settings.yellowThresholdPct}% of target = on track. Beyond ±{settings.redThresholdPct}% = seriously off.
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <label className="block text-sm text-slate-400 mb-2">Display bottle size</label>
          <div className="flex gap-2">
            {[60, 90, 120].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, displayBottleVolumeWater: size }))}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  settings.displayBottleVolumeWater === size
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {size} ml
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Bottle size used to express the number of bottles in the dashboard cards.
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <label className="block text-sm text-slate-400 mb-1">Max correction (%)</label>
          <input
            type="number"
            value={fieldValue("maxCorrectionPct")}
            onChange={(e) => handleChange("maxCorrectionPct", e.target.value)}
            onBlur={() => handleBlur("maxCorrectionPct")}
            step="5"
            min="5"
            max="50"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 text-lg focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-slate-500 mt-2">
            Max shift of adjusted next feed = ±this % of ideal interval. 25% of 148min = ±37min. Default: 25.
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <label className="block text-sm text-slate-400 mb-2">Next feed predictor</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, useTargetAwarePredictor: true }))}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                settings.useTargetAwarePredictor ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Predictor 3 — Optimised
            </button>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, useTargetAwarePredictor: false }))}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                !settings.useTargetAwarePredictor ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Predictor 2 — Adjusted
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            T*: guarantees zero surplus after next feed (if not capped). Formula S: fast approximation.
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <label className="block text-sm text-slate-400 mb-2">Time format</label>
          <div className="flex gap-2">
            {(['24h', '12h'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, timeFormat: fmt }))}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  settings.timeFormat === fmt
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Derived values */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-400 mb-3">Auto-calculated</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Daily target</span>
            <span className="text-slate-100 font-medium">{derived.dailyTargetMl.toFixed(1)} ml</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Hourly rate</span>
            <span className="text-slate-100 font-medium">{derived.hourlyRate.toFixed(2)} ml/h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Ideal interval</span>
            <span className="text-slate-100 font-medium">{derived.idealIntervalHours.toFixed(2)} hours</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full font-semibold py-4 rounded-xl text-lg transition-colors mb-8 ${
          saved
            ? "bg-green-600 text-white"
            : "bg-blue-600 hover:bg-blue-500 text-white"
        }`}
      >
        {saved ? "✓ Saved!" : "Save Settings"}
      </button>

      {/* Danger zone */}
      <div className="bg-slate-800 border border-red-900/50 rounded-xl p-4 mb-4">
        <h2 className="text-base font-semibold text-red-400 mb-1">⚠️ Clear All Feeds</h2>
        <p className="text-xs text-slate-400 mb-3">Permanently deletes all logged feeds. Settings are kept.</p>
        <button
          onClick={async () => {
            if (!confirm("Delete all feeds? This cannot be undone.")) return;
            await saveFeeds([]);
            router.push("/");
          }}
          className="w-full bg-red-900/40 hover:bg-red-800/60 border border-red-700 text-red-300 font-medium py-3 rounded-lg transition-colors"
        >
          Delete All Feeds
        </button>
      </div>

      {/* CSV Import */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h2 className="text-base font-semibold text-slate-200 mb-1">📥 Import Historic Data</h2>
        <p className="text-xs text-slate-400 mb-3">
          Paste CSV rows (Date, Time, Volume) — e.g. <code className="bg-slate-700 px-1 rounded">2026-05-30,05:12,90</code>
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileImport}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="text-sm text-blue-400 hover:text-blue-300 mb-3 block"
        >
          Or pick a CSV file…
        </button>

        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={6}
          placeholder={"Date,Time,Volume\n2026-05-30,05:12,90\n2026-05-30,07:40,90 ml"}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono focus:outline-none focus:border-blue-500 mb-3 resize-none"
        />

        {importMsg && (
          <p className={`text-sm mb-2 ${importMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
            {importMsg}
          </p>
        )}

        <button
          onClick={handleImport}
          disabled={!importText.trim()}
          className="w-full bg-slate-600 hover:bg-slate-500 disabled:opacity-40 text-slate-100 font-medium py-3 rounded-lg transition-colors"
        >
          Import Feeds
        </button>
      </div>

      <div className="mt-8 text-center text-xs text-slate-600">
        MilkWise {APP_VERSION}
      </div>

      <BottomNav />
    </div>
  );
}
