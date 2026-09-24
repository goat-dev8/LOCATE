/**
 * Session clock & formatting utilities.
 *
 * All domain timestamps are SECOND OFFSETS from session start. The anchor is
 * captured on first client mount (never during render), so server-rendered
 * output and the first client render stay identical — no hydration drift.
 */

let SESSION_START = 0

/** Lazily captures the session anchor. Safe to call repeatedly. */
export function sessionStart(): number {
  if (!SESSION_START) SESSION_START = Date.now()
  return SESSION_START
}

/** Seconds elapsed since session start (client-only; 0 before mount). */
export function sessionElapsed(): number {
  return SESSION_START ? (Date.now() - SESSION_START) / 1000 : 0
}

const pad2 = (n: number) => Math.floor(n).toString().padStart(2, '0')

/** Compact countdown, e.g. "6d 04h" / "11h 32m" / "04m 51s". */
export function fmtCountdown(seconds: number): string {
  if (seconds <= 0) return 'PAST DUE'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (d > 0) return `${d}d ${pad2(h)}h`
  if (h > 0) return `${h}h ${pad2(m)}m`
  if (m > 0) return `${m}m ${pad2(s)}s`
  return `${s}s`
}

/** Compact elapsed time, e.g. "5d ago" / "2h ago" / "just now". */
export function fmtAgo(secondsPast: number): string {
  if (secondsPast < 60) return 'just now'
  const d = Math.floor(secondsPast / 86400)
  const h = Math.floor((secondsPast % 86400) / 3600)
  const m = Math.floor((secondsPast % 3600) / 60)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  return `${m}m ago`
}

/** Absolute clock time for a point in the session, e.g. "14:06". */
export function fmtClock(offsetSeconds: number, now: number): string {
  if (!now) return '—'
  const t = new Date(sessionStart() + (offsetSeconds + now) * 1000)
  return `${pad2(t.getHours())}:${pad2(t.getMinutes())}`
}

/** Short date for a point in the session, e.g. "JUN 14". */
export function fmtDate(offsetSeconds: number, now: number): string {
  if (!now) return '—'
  const t = new Date(sessionStart() + (offsetSeconds + now) * 1000)
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return `${months[t.getMonth()]} ${t.getDate()}`
}

/** US dollars, always two decimals. */
export function fmtUsd(v: number): string {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Token amount, six decimals — the PreStock convention. */
export function fmtToken(v: number): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })
}

/** Signed percent, one decimal. */
export function fmtPct(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
}

/** ETH-style short address label, e.g. "4fDe…9a2B". */
export function shortAddr(addr: string): string {
  return addr.length > 10 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr
}
