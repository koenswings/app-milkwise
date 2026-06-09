"use client";

import { waterToMilk } from "@/lib/calculations";

interface Props {
  onClose: () => void;
}

export default function Strict24hExplainer({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl mt-16 sm:mt-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">Strict 24h — how it works</h2>
          <button onClick={onClose} className="text-blue-400 hover:text-blue-300 text-sm">← Back</button>
        </div>

        <div className="p-5 space-y-5 text-base text-slate-300 leading-relaxed mt-2">

          <section>
            <h3 className="text-slate-100 font-semibold mb-1">What is this?</h3>
            <p>
              The <strong>Strict 24h</strong> value is the sum of all milk given in the last
              24 hours, counted from the most recent feed:
            </p>
            <div className="bg-slate-800 rounded-lg p-3 mt-2 font-mono text-xs text-slate-300">
              strict(T) = Σ milkMl_i &nbsp; for all feeds where age ≤ 24h
            </div>
          </section>

          <section>
            <h3 className="text-slate-100 font-semibold mb-1">Why it fluctuates</h3>
            <p>
              This formula has a hard 24-hour cutoff. A bottle disappears entirely the moment
              it crosses the 24h mark — even if it was given 23h59m ago and contributed its
              full value one second earlier. This causes sudden large drops in the value.
            </p>
            <p className="mt-2 text-slate-400">
              The <strong className="text-slate-300">Smoothed 24h</strong> value improves on
              this by giving partial credit to bottles just outside the 24h window, producing
              a much smoother picture.
            </p>
          </section>

          <section>
            <h3 className="text-slate-100 font-semibold mb-1">Water ml vs milk ml</h3>
            <p>
              The conversion ratio varies by bottle size (e.g. 90 ml water →{' '}
              <strong className="text-slate-200">{waterToMilk(90).toFixed(0)} ml</strong> formula).
              The app interpolates from a manufacturer table and converts all logged volumes automatically.
            </p>
          </section>

          <button onClick={onClose} className="w-full text-center text-blue-400 hover:text-blue-300 text-sm py-2">← Back</button>
        </div>
      </div>
    </div>
  );
}
