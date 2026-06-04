export function formatTime(ts: number, timeFormat: '24h' | '12h' = '24h'): string {
  const d = new Date(ts);
  if (timeFormat === '12h') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function formatDateTime(ts: number, timeFormat: '24h' | '12h' = '24h'): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return date + ' ' + formatTime(ts, timeFormat);
}
