"use client";

import { waterToMilk } from "@/lib/calculations";

interface Props {
  onClose: () => void;
}

export default function Strict24hExplainer({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl mt-16 sm:mt-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">Strict 24h — how it works</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5 text-base text-slate-300 leading-relaxed mt-2">

          {/* What it is */}
          <section>
            <h3 className="text-slate-100 font-semibold mb-1">What is this?</h3>
            <p>
              The <span className="text-white font-medium">Strict 24h</span> value is the sum of all milk
              your baby actually drank in the last 24 hours — counted from the moment the most recent
              feed was logged.
            </p>
            <p className="mt-2">
              This is the method paediatricians and health visitors commonly use to check whether a
              baby is getting enough nutrition over a day.
            </p>
          </section>

          {/* The problem */}
          <section>
            <h3 className="text-slate-100 font-semibold mb-1">Why it fluctuates so much</h3>
            <p>
              Because it uses a hard 24-hour cutoff, the number can drop sharply the moment a feed
              "falls off" the window — even if the baby is perfectly well fed. A large bottle logged
              25 hours ago contributes <span className="text-white font-medium">zero</span>, while
              the same bottle at 23 hours ago contributes its full volume.
            </p>
            <p className="mt-2">
              This makes it hard to use in practice for parents trying to actively manage feeds
              throughout the day. A single nap that pushes a feed past the 24-hour mark can make the
              number look alarming.
            </p>
            <p className="mt-2 text-slate-400">
              That's why this app also shows the{" "}
              <span className="text-slate-300 font-medium">Smoothed 24h</span> value, which gives
              each bottle a gradually decaying credit instead of a hard cutoff.
            </p>
          </section>

          {/* Formula */}
          <section>
            <h3 className="text-slate-100 font-semibold mb-1">The formula</h3>
            <div className="bg-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300">
              Strict 24h = Σ volume of all feeds logged in the last 24 hours
            </div>
          </section>

          {/* Water vs milk — placed after the formula for context */}
          <section>
            <h3 className="text-slate-100 font-semibold mb-1">Water ml vs. prepared formula ml</h3>
            <p>
              You log bottles in <strong>water ml</strong>. But the 150 ml/kg/day target is in
              <strong> prepared formula ml</strong> (after mixing powder + water).
              The conversion ratio varies by bottle size. Values in the table are exact; anything in between is interpolated (e.g. a 105 ml bottle → {waterToMilk(105).toFixed(0)} ml formula).
              The app converts all logged volumes automatically.
            </p>
          </section>

          {/* External link */}
          <section>
            <h3 className="text-slate-100 font-semibold mb-1">Further reading</h3>
            <a
              href="https://parentingprospect.com/formula-feeding-calculator/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline break-all"
            >
              Formula feeding calculator — based on WHO/CDC average recommendations
            </a>
          </section>

          <button
            onClick={onClose}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2.5 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
