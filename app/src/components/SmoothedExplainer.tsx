"use client";

import Link from "next/link";
import { Feed } from "@/types";
import { waterToMilk, FORMULA_TABLE, bottleCredit } from "@/lib/calculations";

interface Props {
  onClose: () => void;
  hourlyRate: number;
  standardBottleVolume: number;
  dailyTargetMl: number;
  feeds: Feed[];
  now: number;
}

export default function SmoothedExplainer({ onClose, hourlyRate, standardBottleVolume, dailyTargetMl, feeds }: Props) {
  const milkPerBottle = waterToMilk(standardBottleVolume);

  // ── Bottle credit table ───────────────────────────────────────────────────
  // The smoothed value is frozen at the most recent feed (the display principle),
  // so credits are computed at lastFeed.timestamp — not at the live clock.
  const lastFeed = feeds.length > 0
    ? feeds.reduce((a, b) => (a.timestamp > b.timestamp ? a : b))
    : null;
  const creditRows = lastFeed
    ? [...feeds]
        .map((f) => {
          const ageHours = (lastFeed.timestamp - f.timestamp) / 3_600_000;
          const fullMilk = waterToMilk(f.volume);
          const creditMl = bottleCredit(ageHours, fullMilk, hourlyRate);
          return { f, ageHours, fullMilk, creditMl };
        })
        .filter((r) => r.creditMl > 0)
        .sort((a, b) => b.f.timestamp - a.f.timestamp)
    : [];
  const creditTotal = creditRows.reduce((sum, r) => sum + r.creditMl, 0);
  const creditTotalPct = dailyTargetMl > 0 ? (creditTotal / dailyTargetMl) * 100 : 0;
  const fmtAge = (h: number) => {
    const totalMin = Math.max(0, Math.round(h * 60));
    return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
  };
  const fmtClock = (ts: number) =>
    new Date(ts).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto mt-16 sm:mt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <button onClick={onClose} className="text-blue-400 hover:text-blue-300 text-sm">← Back to dashboard</button>
        </div>

        <div className="space-y-5 text-base text-slate-300 leading-relaxed mt-2">

          <section>
            <h3 className="font-semibold text-slate-100 mb-2">Tracking milk given</h3>
            <p>
              To comply with the 150 ml/kg/day guideline, we track the total milk given
              over the last 24 hours at each moment in time.
            </p>
            <p className="mt-2">
              A simple sum of all bottles in the last 24 hours (the <strong>strict</strong> calculation)
              fluctuates heavily — a bottle disappears entirely the moment it crosses the 24-hour mark.
            </p>
            <p className="mt-2">
              The <strong>smoothed</strong> calculation improves on this by giving partial credit
              to bottles just outside the 24-hour window. A bottle that crossed the 24h mark
              continues contributing a decreasing amount until its credit reaches zero:
            </p>
            <div className="bg-slate-700/50 rounded-lg p-3 mt-2 font-mono text-xs text-slate-300">
              <div>credit(age, milk) = milk &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; if age ≤ 24h</div>
              <div>credit(age, milk) = max(0, milk − rate × (age−24)) &nbsp; if age &gt; 24h</div>
              <div className="mt-1">smoothed = Σ credit(age, milk) for all bottles</div>
            </div>
            <p className="mt-2 text-slate-400 text-sm">
              where rate = {hourlyRate.toFixed(2)} ml/h (= {Math.round(dailyTargetMl)} ml/day ÷ 24)
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-100 mb-2">Bottles in this calculation</h3>
            <p className="text-sm text-slate-400 mb-2">
              The smoothed value is frozen at the most recent feed
              {lastFeed ? <span> ({fmtClock(lastFeed.timestamp)})</span> : null}. These are the
              bottles still carrying credit at that moment:
            </p>
            {creditRows.length === 0 ? (
              <p className="text-sm text-slate-500">No bottles in the calculation window.</p>
            ) : (
              <>
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-slate-500 text-left">
                      <th className="font-normal py-1 pr-2">Time</th>
                      <th className="font-normal py-1 pr-2">Water</th>
                      <th className="font-normal py-1 pr-2">Formula</th>
                      <th className="font-normal py-1 pr-2">Age at last feed</th>
                      <th className="font-normal py-1 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditRows.map((r) => {
                      const full = r.creditMl >= r.fullMilk - 0.5; // full credit, age ≤ 24h
                      return (
                        <tr key={r.f.id} className="border-t border-slate-700/50">
                          <td className="py-1 pr-2 text-slate-300">{fmtClock(r.f.timestamp)}</td>
                          <td className="py-1 pr-2 text-slate-300">{r.f.volume} ml</td>
                          <td className="py-1 pr-2 text-slate-300">{r.fullMilk.toFixed(0)} ml</td>
                          <td className={`py-1 pr-2 ${r.ageHours >= 24 ? 'text-amber-400' : 'text-slate-300'}`}>
                            {fmtAge(r.ageHours)}
                          </td>
                          <td className={`py-1 text-right ${full ? 'text-green-400' : 'text-amber-400'}`}>
                            {r.creditMl.toFixed(0)} ml
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-2 font-bold text-white text-sm">
                  Total smoothed: {creditTotal.toFixed(0)} ml ({creditTotalPct.toFixed(0)}%)
                </p>
              </>
            )}
          </section>

          <section>
            <h3 className="font-semibold text-slate-100 mb-2">Surplus and deficit</h3>
            <p>
              Comparing smoothed to the daily target gives the surplus or deficit:
            </p>
            <div className="bg-slate-700/50 rounded-lg p-3 mt-2 font-mono text-xs text-slate-300">
              surplus = smoothed − {Math.round(dailyTargetMl)} ml
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              <li><span className="text-yellow-400 font-semibold">surplus &gt; 0</span> — overfed: next feed can wait</li>
              <li><span className="text-green-400 font-semibold">surplus = 0</span> — on target: feed at standard interval</li>
              <li><span className="text-blue-400 font-semibold">surplus &lt; 0</span> — underfed: feed sooner</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-slate-100 mb-2">Water ml vs milk ml</h3>
            <p>
              You log bottles in <strong>water ml</strong> (what you measure into the bottle).
              But the 150 ml/kg/day target is in <strong>prepared formula ml</strong> — after
              mixing in the powder. The ratio varies by bottle size:
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 text-sm text-slate-400 font-mono">
              <span className="text-slate-500">Water ml</span><span className="text-slate-500">Formula ml</span>
              {FORMULA_TABLE.map(({ water, formula }) => (
                <>
                  <span key={`w${water}`}>{water} ml</span>
                  <span key={`f${water}`}>{formula} ml</span>
                </>
              ))}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              A {standardBottleVolume} ml bottle = <strong className="text-slate-200">{milkPerBottle.toFixed(0)} ml</strong> of prepared formula.
              Values between table entries are interpolated.
            </p>
          </section>

          <section>
            <p className="text-xs text-slate-500">
              The daily target is based on the 150 ml/kg/day guideline from paediatric organisations
              including Kind en Gezin, NHS, AAP/CDC, and WHO/ESPGHAN.{' '}
              <Link href="/info/150ml" className="text-blue-400 underline">
                The 150 ml/kg/day guideline — background and scientific basis
              </Link>
            </p>
          </section>

          <button onClick={onClose} className="mt-2 w-full text-center text-blue-400 hover:text-blue-300 text-sm py-2">← Back to dashboard</button>
        </div>
      </div>
    </div>
  );
}
