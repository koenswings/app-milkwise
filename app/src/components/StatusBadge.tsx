interface Props {
  percentage: number;
  label: string;
  value: string;
  yellowThresholdPct?: number;
  redThresholdPct?: number;
}

function colorClasses(pct: number, y = 5, r = 10): string {
  const diff = Math.abs(pct - 100);
  if (diff <= y) return 'text-green-400 bg-green-900/30 border-green-700';
  if (diff <= r) return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
  return 'text-red-400 bg-red-900/30 border-red-700';
}

function statusLabel(pct: number, y = 5, r = 10): string {
  const diff = Math.abs(pct - 100);
  if (diff <= y) return 'on track';
  if (pct > 100) return diff <= r ? 'slightly overfed' : '⚠️ overfed';
  return diff <= r ? 'slightly behind' : '⚠️ behind';
}

export default function StatusBadge({ percentage, label, value, yellowThresholdPct = 5, redThresholdPct = 10 }: Props) {
  return (
    <div className={`rounded-xl border p-4 ${colorClasses(percentage, yellowThresholdPct, redThresholdPct)}`}>
      <div className="text-sm font-medium opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-sm mt-1">{Math.round(percentage)}% · {statusLabel(percentage, yellowThresholdPct, redThresholdPct)}</div>
    </div>
  );
}
