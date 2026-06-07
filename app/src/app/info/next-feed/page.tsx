import Link from "next/link";

export default function NextFeedInfoPage() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 text-slate-300 text-sm leading-relaxed">
      <Link href="/" className="text-blue-400 hover:text-blue-300 text-xs mb-6 block">← Back to dashboard</Link>

      <h1 className="text-2xl font-bold text-slate-100 mb-1">Next feed — standard vs adjusted</h1>
      <p className="text-slate-400 text-xs mb-6">How the two predicted feed times are calculated</p>

      <h2 className="text-slate-100 font-semibold mt-4 mb-2">Standard</h2>
      <p className="mb-3">
        The <strong>standard</strong> time assumes the baby drinks exactly one bottle of the configured
        size and nothing more. It simply adds the ideal interval to the last feed time:
      </p>
      <div className="bg-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 mb-4">
        standard = lastFeed + milkPerBottle / hourlyRate
      </div>
      <p className="mb-4 text-slate-400">
        This is the rhythm you would follow on a perfect feeding day — one bottle every X hours,
        no more, no less.
      </p>

      <h2 className="text-slate-100 font-semibold mt-4 mb-2">Adjusted</h2>
      <p className="mb-3">
        The <strong>adjusted</strong> time accounts for everything the baby has consumed today.
        Each previous bottle tops up an energy pool; the pool drains continuously at the baby&apos;s
        hourly energy rate. The next feed is suggested when that pool reaches zero.
      </p>
      <div className="bg-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 mb-4">
        {`balance = 0\nfor each feed (oldest → newest):\n  gap = hours since previous feed\n  balance = max(0, balance − hourlyRate × gap)\n           + formulaMl(feed.volume)\n\nadjusted = lastFeed + balance / hourlyRate`}
      </div>
      <p className="mb-3">
        If the baby has been overfed today, the pool is larger than usual — the adjusted time is
        later than the standard. If the baby is behind, the pool is smaller — the adjusted time
        is earlier.
      </p>
      <p className="mb-4 text-slate-400">
        After one adjusted feed, the pool resets to a normal one-bottle level and the rhythm
        returns to the standard interval automatically.
      </p>

      <h2 className="text-slate-100 font-semibold mt-4 mb-2">Max gap cap</h2>
      <p className="mb-4 text-slate-400">
        Even when the baby is significantly overfed, the adjusted time will never exceed
        <strong className="text-slate-300"> maxFeedGapPct</strong> × the standard interval
        (default 150% = about 5 hours for a 120 ml bottle). This prevents the adjusted time
        from suggesting an unsafe gap.
      </p>

      <div className="bg-slate-800 rounded-xl p-4 mt-6">
        <p className="text-slate-200 font-medium mb-1">Which one to follow?</p>
        <p className="text-slate-400 text-xs">
          Use the <strong className="text-slate-300">adjusted</strong> time as your guide.
          The standard is shown as a reference so you can see how much the day&apos;s intake
          has shifted the next feed. A small delay is normal after a big day; a large delay
          suggests you should consider a smaller bottle at the next feed.
        </p>
      </div>
    </div>
  );
}
