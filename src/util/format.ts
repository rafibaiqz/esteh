/** Formats integer Rupiah: 12500 -> "Rp 12.500", -3000 -> "-Rp 3.000". */
export function rp(value: number): string {
  const v = Math.round(value);
  const s = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (v < 0 ? '-Rp ' : 'Rp ') + s;
}

/** Compact Rupiah: 1250000 -> "Rp 1,25jt", 45000 -> "Rp 45rb". */
export function rpShort(value: number): string {
  const v = Math.round(value);
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a >= 1_000_000) return `${sign}Rp ${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2).replace('.', ',')}jt`;
  if (a >= 10_000) return `${sign}Rp ${Math.round(a / 1000)}rb`;
  return rp(v);
}

export function num(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function pct(value: number): string {
  return `${Math.round(value)}%`;
}

export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
