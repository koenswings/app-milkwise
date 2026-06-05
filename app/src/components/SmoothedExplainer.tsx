"use client";

import { Feed } from "@/types";
import { bottleCredit, waterToMilk, FORMULA_TABLE } from "@/lib/calculations";

interface Props {
  onClose: () => void;
  hourlyRate: number;
  standardBottleVolume: number;
  dailyTargetMl: number;
  feeds: Feed[];
  now: number;
}

export default function SmoothedExplainer({ onClose, hourlyRate, standardBottleVolume, dailyTargetMl, feeds, now }: Props) {
  const milkPerBottle = waterToMilk(standardBottleVolume);
  const targetBottles = (dailyTargetMl / milkPerBottle).toFixed(1);

  // Build per-bottle breakdown — convert water ml → milk ml before crediting
  const sorted = [...feeds].sort((a, b) => b.timestamp - a.timestamp);
  const withCredit = sorted.map((f) => {
    const ageHours = (now - f.timestamp) / (1000 * 60 * 60);
    const credit = bottleCredit(ageHours, waterToMilk(f.volume), hourlyRate);
    return { ...f, ageHours, credit };
  });

  const totalSmoothedMl = withCredit.reduce((sum, f) => sum + f.credit, 0);
  const smoothedBottles = totalSmoothedMl / milkPerBottle;
  const smoothedPct = (totalSmoothedMl / dailyTargetMl) * 100;

  // Show last 10 relevant feeds (some credit > 0), then summarise the rest
  const withSomeCredit = withCredit.filter((f) => f.credit > 0.1);
  const noCredit = withCredit.filter((f) => f.credit <= 0.1);

  function fmtTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto mt-8 sm:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">How is Smoothed % calculated?</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-5 text-base text-slate-300 leading-relaxed mt-2">

          <section>
            <h3 className="font-semibold text-slate-100 mb-1">The core idea</h3>
            <p>
              A bottle your baby drank <strong>1 hour ago</strong> fully counts toward today's intake.
              A bottle from <strong>30 hours ago</strong> barely counts — most of that nutrition is already
              in the past. The Smoothed calculation gives each bottle a <em>credit score</em> based on how
              long ago it was given.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-100 mb-1">Step 1 — score each bottle</h3>
            <p>
              Every bottle starts with full credit equal to its volume (e.g. {standardBottleVolume} ml).
            </p>
            <p className="mt-2">
              If a bottle was given <strong>less than 24 hours ago</strong>, it keeps its full credit — nothing is subtracted.
            </p>
            <p className="mt-2">
              If a bottle was given <strong>more than 24 hours ago</strong>, we start reducing its credit.
              Your baby burns through about <strong>{hourlyRate.toFixed(1)} ml per hour</strong> (that's
              your daily target spread evenly across 24 hours). For every hour beyond 24, we subtract that
              amount from the bottle's credit. Once the credit hits zero, the bottle no longer counts at all.
            </p>
            <div className="bg-slate-700/60 rounded-lg p-3 mt-2 text-slate-400 text-xs">
              <strong className="text-slate-300">Example:</strong> A {standardBottleVolume} ml bottle given 26 hours ago.<br />
              Hours beyond 24: 2 hours.<br />
              Credit lost: 2 × {hourlyRate.toFixed(1)} ml = {(2 * hourlyRate).toFixed(0)} ml.<br />
              Remaining credit: {Math.max(0, standardBottleVolume - 2 * hourlyRate).toFixed(0)} ml.
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-slate-100 mb-1">Step 2 — add it all up</h3>
            <p>
              We add together the credits from every bottle ever logged. The result is a number in ml —
              the "smoothed total". We then divide by your standard bottle size ({standardBottleVolume} ml)
              to turn it into a bottle count.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-100 mb-1">Step 3 — the percentage</h3>
            <p>
              Your baby&apos;s daily target is <strong>{dailyTargetMl.toFixed(0)} ml</strong> ({targetBottles} bottles).
              We divide the smoothed total by that target and multiply by 100 to get a percentage.
            </p>
            <p className="mt-2">
              The goal is to stay <strong>close to 100%</strong> — not just above it. Both underfeeding and
              overfeeding carry risks, so the tracker warns in both directions:
            </p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex gap-2"><span className="text-red-400 font-semibold w-20">&gt; 110%</span><span>⚠️ Significantly overfed — reduce at next feed 🔴</span></div>
              <div className="flex gap-2"><span className="text-yellow-400 font-semibold w-20">&gt; 105%</span><span>Slightly overfed — no action needed, just watch 🟡</span></div>
              <div className="flex gap-2"><span className="text-green-400 font-semibold w-20">80–105%</span><span>Good zone — on track 🟢</span></div>
              <div className="flex gap-2"><span className="text-yellow-400 font-semibold w-20">70–79%</span><span>Slightly behind — offer a feed soon 🟡</span></div>
              <div className="flex gap-2"><span className="text-red-400 font-semibold w-20">&lt; 70%</span><span>⚠️ Significantly behind — feed now 🔴</span></div>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-slate-100 mb-1">Why does credit decay after 24 hours?</h3>
            <p>
              The credit decay is based on <strong>energy balance</strong>. Your baby burns through energy
              continuously at roughly <strong>{hourlyRate.toFixed(1)} ml-equivalent per hour</strong> —
              your daily target spread evenly across 24 hours.
            </p>
            <p className="mt-2">
              A bottle given 30 hours ago contributed its energy then, but in the 6 hours beyond
              the 24h window your baby has since burned through {(hourlyRate * 6).toFixed(0)} ml-worth
              of energy. Subtracting that gives a better model of how much of that bottle&apos;s energy
              is still &quot;in effect&quot; — available to sustain the baby right now.
            </p>
            <p className="mt-2">
              This is why the Smoothed number is more useful than a strict 24h cutoff: it tracks the
              <em> running energy balance</em>, not just a fixed window.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-100 mb-1">Why not just use the last 24 hours?</h3>
            <p>
              The "Strict 24h" number is simpler but can jump around a lot. If your baby had a big feeding
              session at 11 PM last night, it disappears from the count exactly 24 hours later — even though
              the baby is still digesting the pattern from those feeds.
            </p>
            <p className="mt-2">
              The Smoothed version fades out old feeds gradually, so the number moves more smoothly and gives
              a better sense of whether the overall intake trend is on track.
            </p>
          </section>

          {/* Water vs formula — placed here so user understands the table below */}
          <section>
            <h3 className="font-semibold text-slate-100 mb-1">Water ml vs. prepared formula ml</h3>
            <p>
              You log bottles in <strong>water ml</strong> (what you measure into the bottle).
              But the 150 ml/kg/day target refers to <strong>prepared formula ml</strong> —
              after mixing in the powder. The conversion ratio is <em>not constant</em>;
              it varies slightly by bottle size:
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
            <p className="mt-2">
              The app interpolates between these values for any bottle size.
              A <strong>90 ml bottle</strong> = <strong>100 ml</strong> of prepared formula.
            </p>
          </section>

          {/* Live calculation breakdown */}
          {feeds.length > 0 && (
            <section>
              <h3 className="font-semibold text-slate-100 mb-3">Your actual feeds right now</h3>

              {withSomeCredit.length === 0 ? (
                <p className="text-slate-400">No feeds with remaining credit.</p>
              ) : (
                <div className="rounded-lg overflow-hidden border border-slate-700 text-xs">
                  <div className="grid grid-cols-4 bg-slate-700/60 text-slate-400 px-3 py-2 font-medium">
                    <span>Feed time</span>
                    <span className="text-right">Water ml</span>
                    <span className="text-right">Age</span>
                    <span className="text-right">Credit (milk)</span>
                  </div>
                  {withSomeCredit.map((f) => {
                    const fullCredit = waterToMilk(f.volume);
                    return (
                      <div key={f.id} className="grid grid-cols-4 px-3 py-2 border-t border-slate-700/50 text-slate-300">
                        <span className="text-slate-400">{fmtTime(f.timestamp)}</span>
                        <span className="text-right">{f.volume} ml</span>
                        <span className="text-right">
                          {f.ageHours < 24
                            ? <span className="text-green-400">{f.ageHours.toFixed(1)}h</span>
                            : <span className="text-yellow-400">{f.ageHours.toFixed(1)}h</span>
                          }
                        </span>
                        <span className="text-right font-medium">
                          {f.credit >= fullCredit - 0.1
                            ? <span className="text-green-400">{f.credit.toFixed(0)} ml ✓</span>
                            : <span className="text-yellow-400">{f.credit.toFixed(0)} ml</span>
                          }
                        </span>
                      </div>
                    );
                  })}
                  {noCredit.length > 0 && (
                    <div className="px-3 py-2 border-t border-slate-700/50 text-slate-500 italic">
                      + {noCredit.length} older feed{noCredit.length > 1 ? "s" : ""} with no remaining credit (fully faded out)
                    </div>
                  )}
                </div>
              )}

              {/* Totals */}
              <div className="mt-3 bg-slate-700/40 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Total credit</span>
                  <span className="font-semibold">{totalSmoothedMl.toFixed(0)} ml</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>÷ bottle size ({standardBottleVolume} ml)</span>
                  <span className="font-semibold">= {smoothedBottles.toFixed(2)} bottles</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>÷ daily target ({dailyTargetMl.toFixed(0)} ml) × 100</span>
                  <span className={`font-bold ${smoothedPct >= 100 ? "text-green-400" : smoothedPct >= 90 ? "text-yellow-400" : "text-red-400"}`}>
                    = {smoothedPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </section>
          )}

        </div>

        {/* 150ml rule link */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-2">The daily target (ml/kg/day) is based on standard paediatric guidelines:</p>
          <a
            href="/info/150ml"
            className="text-blue-400 hover:text-blue-300 underline text-xs"
          >
            The 150 ml/kg/day guideline — background and scientific basis
          </a>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-3 rounded-xl transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
