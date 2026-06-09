"use client";

import Link from "next/link";
import { Feed } from "@/types";
import { waterToMilk, FORMULA_TABLE } from "@/lib/calculations";

interface Props {
  onClose: () => void;
  hourlyRate: number;
  standardBottleVolume: number;
  dailyTargetMl: number;
  feeds: Feed[];
  now: number;
}

export default function SmoothedExplainer({ onClose, hourlyRate, standardBottleVolume, dailyTargetMl }: Props) {
  const milkPerBottle = waterToMilk(standardBottleVolume);

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
